-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- 3D.9F - TURNI AUTOMATICI DA EXCEL
-- =========================================================

alter table public.turni
  add column if not exists fonte text not null default 'manuale',
  add column if not exists importazione_id uuid references public.importazioni(id) on delete set null,
  add column if not exists termina_giorno_successivo boolean not null default false;

create index if not exists idx_turni_importazione_id
  on public.turni(importazione_id);

-- Restituisce / crea solo le aree operative note del modulo disponibilita.
create or replace function public.assicurati_area_servizio_import(p_servizio text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v text := public.normalizza_testo_import(p_servizio);
  v_id uuid;
  v_code text;
  v_name text;
begin
  if v = '' then return null; end if;

  if v like '%cucina%' then
    v_code := 'CUCINA'; v_name := 'Cucina';
  elsif v like '%logistica%' then
    v_code := 'LOGISTICA'; v_name := 'Logistica';
  elsif v like '%safety%' or v like '%security%' then
    v_code := 'SAFETY_SECURITY'; v_name := 'Safety / Security';
  else
    select a.id into v_id
    from public.aree_servizio a
    where a.attivo = true
      and (public.normalizza_testo_import(a.nome) = v
           or public.normalizza_testo_import(a.codice) = v)
    limit 1;
    return v_id;
  end if;

  select a.id into v_id
  from public.aree_servizio a
  where a.attivo = true
    and (
      upper(a.codice) = v_code
      or public.normalizza_testo_import(a.nome) = public.normalizza_testo_import(v_name)
      or (v_code = 'LOGISTICA' and public.normalizza_testo_import(a.nome) like '%logistica%')
      or (v_code = 'CUCINA' and public.normalizza_testo_import(a.nome) like '%cucina%')
      or (v_code = 'SAFETY_SECURITY' and (public.normalizza_testo_import(a.nome) like '%safety%' or public.normalizza_testo_import(a.nome) like '%security%'))
    )
  order by a.created_at
  limit 1;

  if v_id is not null then return v_id; end if;

  insert into public.aree_servizio(codice,nome,attivo,note)
  values(v_code,v_name,true,'Area creata automaticamente da Import Excel')
  on conflict (codice) do update set attivo = true
  returning id into v_id;

  return v_id;
end;
$$;

-- Legge direttamente le colonne Turni / Turni 2 / Turni 3 ecc. del file originale,
-- crea un solo turno per servizio+data+orario e collega la persona come DISPONIBILE.
create or replace function public.collega_turni_da_riga_import(p_riga_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  kv record;
  v_servizio text;
  v_norm text;
  v_area_id uuid;
  v_area_code text;
  v_area_name text;
  v_token text;
  v_head text[];
  v_clock text[];
  v_numero integer;
  v_data date;
  v_start time;
  v_end time;
  v_next boolean;
  v_turno_id uuid;
  v_code text;
  v_created integer := 0;
  v_linked integer := 0;
  v_rc integer := 0;
  v_clean_warnings jsonb := '[]'::jsonb;
begin
  select ir.*, i.nome_file
  into r
  from public.importazioni_righe ir
  join public.importazioni i on i.id = ir.importazione_id
  where ir.id = p_riga_id
  for update of ir;

  if not found or r.esito <> 'importata' or r.persona_id is null then
    return jsonb_build_object('status','riga_non_importata');
  end if;

  -- 1) prova prima il campo normalizzato area/servizio
  if jsonb_typeof(r.dati_normalizzati -> 'aree') = 'array' then
    v_servizio := r.dati_normalizzati -> 'aree' ->> 0;
  elsif r.dati_normalizzati ? 'aree' then
    v_servizio := r.dati_normalizzati ->> 'aree';
  end if;

  -- 2) sui Google Form individua automaticamente il servizio tra le colonne Qualifica*
  if coalesce(trim(v_servizio),'') = '' then
    for kv in select key, value from jsonb_each_text(coalesce(r.dati_originali,'{}'::jsonb)) loop
      v_norm := public.normalizza_testo_import(kv.value);
      if v_norm like '%supporto cucina%' then
        v_servizio := 'Supporto cucina'; exit;
      elsif v_norm like '%supporto logistica%' then
        v_servizio := 'Supporto logistica'; exit;
      elsif v_norm like '%safety%' or v_norm like '%security%' then
        v_servizio := 'Safety and security'; exit;
      end if;
    end loop;
  end if;

  v_area_id := public.assicurati_area_servizio_import(v_servizio);
  if v_area_id is null then
    return jsonb_build_object('status','servizio_non_riconosciuto','servizio',v_servizio);
  end if;

  select codice,nome into v_area_code,v_area_name
  from public.aree_servizio where id = v_area_id;

  insert into public.persone_aree(persona_id,area_servizio_id,note)
  values(r.persona_id,v_area_id,'Collegamento automatico da disponibilita Excel')
  on conflict (persona_id,area_servizio_id) do nothing;

  -- Tutte le colonne che si chiamano Turni, Turni 2, Turni 3... vengono lette.
  for kv in select key, value from jsonb_each_text(coalesce(r.dati_originali,'{}'::jsonb)) loop
    if regexp_replace(lower(kv.key),'[^a-z0-9]+','','g') not like 'turni%' then
      continue;
    end if;
    if coalesce(trim(kv.value),'') = '' then continue; end if;

    for v_token in
      select trim(x) from unnest(regexp_split_to_array(kv.value,'[[:space:]]*,[[:space:]]*')) as x
    loop
      v_head := regexp_match(lower(v_token), 'turno[[:space:]]*([0-9]+)[[:space:]]*\.[[:space:]]*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})');
      v_clock := regexp_match(lower(v_token), 'h[[:space:]]*([0-9]{1,2})(:[0-9]{2})?[[:space:]]*-[[:space:]]*([0-9]{1,2})(:[0-9]{2})?');
      if v_head is null or v_clock is null then continue; end if;

      begin
        v_numero := v_head[1]::integer;
        v_data := to_date(v_head[2],'DD/MM/YYYY');
        v_start := make_time(v_clock[1]::integer,coalesce(nullif(replace(v_clock[2],':',''),''),'0')::integer,0);
        v_end := make_time(v_clock[3]::integer,coalesce(nullif(replace(v_clock[4],':',''),''),'0')::integer,0);
      exception when others then
        continue;
      end;

      v_next := v_end <= v_start;

      select t.id into v_turno_id
      from public.turni t
      where t.attivo = true
        and t.area_servizio_id = v_area_id
        and t.data = v_data
        and t.ora_inizio = v_start
        and t.ora_fine = v_end
      order by t.created_at
      limit 1;

      if v_turno_id is null then
        v_code := 'AUTO-' || upper(regexp_replace(coalesce(v_area_code,'AREA'),'[^A-Za-z0-9]+','','g'))
          || '-' || to_char(v_data,'YYYYMMDD') || '-' || to_char(v_start,'HH24MI') || '-' || to_char(v_end,'HH24MI');

        insert into public.turni(
          area_servizio_id,data,ora_inizio,ora_fine,codice,titolo,luogo,numero_richiesto,note,attivo,
          fonte,importazione_id,termina_giorno_successivo
        ) values(
          v_area_id,v_data,v_start,v_end,v_code,
          coalesce(nullif(trim(v_servizio),''),v_area_name),null,null,
          format('Creato automaticamente da disponibilita Excel - Turno %s.',v_numero),true,
          'excel_auto',r.importazione_id,v_next
        ) returning id into v_turno_id;
        v_created := v_created + 1;
      end if;

      insert into public.persone_turni(
        persona_id,turno_id,stato,fonte,note,importazione_id,
        stato_modificato_at,stato_modificato_da,stato_modificato_postazione
      ) values(
        r.persona_id,v_turno_id,'disponibile','excel_auto',
        format('Disponibilita importata da %s - Turno %s',r.nome_file,v_numero),r.importazione_id,
        now(),auth.uid(),'Import Excel'
      ) on conflict (persona_id,turno_id) do nothing;
      get diagnostics v_rc = row_count;
      v_linked := v_linked + v_rc;
    end loop;
  end loop;

  select coalesce(jsonb_agg(x),'[]'::jsonb)
  into v_clean_warnings
  from jsonb_array_elements(coalesce(r.avvisi,'[]'::jsonb)) x
  where coalesce(x->>'tipo','') <> 'turno_non_riconosciuto';

  update public.importazioni_righe
  set
    avvisi = v_clean_warnings,
    risultato_importazione = coalesce(risultato_importazione,'{}'::jsonb) || jsonb_build_object(
      'turni_auto_creati',v_created,
      'turni_auto_collegati',v_linked,
      'servizio_turni_auto',coalesce(v_servizio,v_area_name)
    ),
    updated_at = now()
  where id = p_riga_id;

  return jsonb_build_object(
    'status','ok','servizio',coalesce(v_servizio,v_area_name),
    'turni_creati',v_created,'collegamenti_creati',v_linked
  );
end;
$$;

create or replace function public.trg_turni_automatici_da_import()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.collega_turni_da_riga_import(new.id);
  return new;
end;
$$;

revoke all on function public.trg_turni_automatici_da_import() from public,anon,authenticated;

drop trigger if exists trg_turni_automatici_da_import on public.importazioni_righe;
create trigger trg_turni_automatici_da_import
after update of esito, persona_id on public.importazioni_righe
for each row
when (
  new.esito = 'importata'
  and new.persona_id is not null
  and (old.esito is distinct from new.esito or old.persona_id is distinct from new.persona_id)
)
execute function public.trg_turni_automatici_da_import();

-- Recupera anche le righe gia importate prima di questa migrazione.
do $$
declare x record;
begin
  for x in
    select id from public.importazioni_righe
    where esito = 'importata' and persona_id is not null
    order by created_at
  loop
    perform public.collega_turni_da_riga_import(x.id);
  end loop;
end $$;

-- Realtime e controllo finale
alter table public.turni replica identity full;

select
  count(*) filter (where fonte = 'excel_auto') as turni_excel_creati,
  count(*) filter (where termina_giorno_successivo = true) as turni_notturni
from public.turni;
