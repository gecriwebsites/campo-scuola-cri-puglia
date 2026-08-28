-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- GIORNATA OPERATIVA CONDIVISA
-- Eseguire una sola volta nel SQL Editor di Supabase.
-- =========================================================

create table if not exists public.giornate_operative (
  data date primary key,
  stato text not null default 'da_aprire'
    check (stato in ('da_aprire','operativa','chiusa')),
  checklist_apertura jsonb not null default '{}'::jsonb,
  checklist_chiusura jsonb not null default '{}'::jsonb,
  note text,
  aperta_at timestamptz,
  aperta_da uuid references auth.users(id) on delete set null,
  chiusa_at timestamptz,
  chiusa_da uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint giornate_operative_periodo check (data between date '2026-09-16' and date '2026-09-30')
);

alter table public.giornate_operative enable row level security;

-- Tutti gli account operativi attivi possono leggere lo stato della giornata.
drop policy if exists giornate_operative_select_operativi on public.giornate_operative;
create policy giornate_operative_select_operativi
on public.giornate_operative
for select
to authenticated
using (
  exists (
    select 1
    from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria','cucina','sola_lettura')
  )
);

-- Solo Admin può creare o modificare la giornata.
drop policy if exists giornate_operative_insert_admin on public.giornate_operative;
create policy giornate_operative_insert_admin
on public.giornate_operative
for insert
to authenticated
with check (
  exists (
    select 1
    from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo = 'admin'
  )
);

drop policy if exists giornate_operative_update_admin on public.giornate_operative;
create policy giornate_operative_update_admin
on public.giornate_operative
for update
to authenticated
using (
  exists (
    select 1
    from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo = 'admin'
  )
);

-- Nessuna cancellazione dal frontend: lo storico giornaliero resta disponibile.
revoke delete on public.giornate_operative from authenticated;
grant select, insert, update on public.giornate_operative to authenticated;

-- Aggiornamento atomico della checklist / stato. Solo Admin.
create or replace function public.salva_giornata_operativa(
  p_data date,
  p_stato text,
  p_checklist_apertura jsonb default '{}'::jsonb,
  p_checklist_chiusura jsonb default '{}'::jsonb,
  p_note text default null
)
returns public.giornate_operative
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruolo text;
  v_row public.giornate_operative;
begin
  select u.ruolo
    into v_ruolo
  from public.utenti_segreteria u
  where u.user_id = auth.uid()
    and u.attivo = true
  limit 1;

  if v_ruolo <> 'admin' then
    raise exception 'Operazione riservata all''Amministratore';
  end if;

  if p_data < date '2026-09-16' or p_data > date '2026-09-30' then
    raise exception 'Data fuori dal periodo del Campo';
  end if;

  if p_stato not in ('da_aprire','operativa','chiusa') then
    raise exception 'Stato giornata non valido';
  end if;

  insert into public.giornate_operative (
    data, stato, checklist_apertura, checklist_chiusura, note,
    aperta_at, aperta_da, chiusa_at, chiusa_da, updated_at, updated_by
  ) values (
    p_data,
    p_stato,
    coalesce(p_checklist_apertura, '{}'::jsonb),
    coalesce(p_checklist_chiusura, '{}'::jsonb),
    nullif(trim(coalesce(p_note,'')),''),
    case when p_stato = 'operativa' then now() else null end,
    case when p_stato = 'operativa' then auth.uid() else null end,
    case when p_stato = 'chiusa' then now() else null end,
    case when p_stato = 'chiusa' then auth.uid() else null end,
    now(), auth.uid()
  )
  on conflict (data) do update set
    stato = excluded.stato,
    checklist_apertura = excluded.checklist_apertura,
    checklist_chiusura = excluded.checklist_chiusura,
    note = excluded.note,
    aperta_at = case
      when excluded.stato = 'operativa' and public.giornate_operative.aperta_at is null then now()
      else public.giornate_operative.aperta_at
    end,
    aperta_da = case
      when excluded.stato = 'operativa' and public.giornate_operative.aperta_da is null then auth.uid()
      else public.giornate_operative.aperta_da
    end,
    chiusa_at = case
      when excluded.stato = 'chiusa' then now()
      when excluded.stato <> 'chiusa' then null
      else public.giornate_operative.chiusa_at
    end,
    chiusa_da = case
      when excluded.stato = 'chiusa' then auth.uid()
      when excluded.stato <> 'chiusa' then null
      else public.giornate_operative.chiusa_da
    end,
    updated_at = now(),
    updated_by = auth.uid()
  returning * into v_row;

  insert into public.log_attivita (operatore_id, azione, entita, entita_id, dettagli)
  values (
    auth.uid(),
    case p_stato when 'operativa' then 'giornata_aperta' when 'chiusa' then 'giornata_chiusa' else 'giornata_aggiornata' end,
    'giornate_operative',
    null,
    jsonb_build_object('data', p_data, 'stato', p_stato)
  );

  return v_row;
end;
$$;

revoke all on function public.salva_giornata_operativa(date,text,jsonb,jsonb,text) from public, anon;
grant execute on function public.salva_giornata_operativa(date,text,jsonb,jsonb,text) to authenticated;

-- Realtime sullo stato della giornata.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'giornate_operative'
  ) then
    alter publication supabase_realtime add table public.giornate_operative;
  end if;
end $$;
