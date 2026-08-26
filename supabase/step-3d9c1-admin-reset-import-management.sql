-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- 3D.9C.1 - GESTIONE STAGING EXCEL + RESET ADMIN
-- =========================================================

-- ---------------------------------------------------------
-- Elimina una sessione di importazione Excel e le sue righe.
-- Accesso: Admin e Segreteria.
-- ---------------------------------------------------------
create or replace function public.elimina_importazione_excel(
  p_importazione_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruolo text;
  v_nome_file text;
  v_righe integer := 0;
begin
  select u.ruolo
    into v_ruolo
  from public.utenti_segreteria u
  where u.user_id = auth.uid()
    and u.attivo = true
  limit 1;

  if v_ruolo not in ('admin', 'segreteria') then
    raise exception 'Operazione non autorizzata';
  end if;

  select i.nome_file
    into v_nome_file
  from public.importazioni i
  where i.id = p_importazione_id
  for update;

  if not found then
    return jsonb_build_object('status', 'importazione_non_trovata');
  end if;

  select count(*)::integer
    into v_righe
  from public.importazioni_righe r
  where r.importazione_id = p_importazione_id;

  delete from public.importazioni_righe
  where importazione_id = p_importazione_id;

  delete from public.importazioni
  where id = p_importazione_id;

  return jsonb_build_object(
    'status', 'eliminata',
    'importazione_id', p_importazione_id,
    'nome_file', v_nome_file,
    'righe_eliminate', v_righe
  );
end;
$$;

revoke all on function public.elimina_importazione_excel(uuid) from public, anon;
grant execute on function public.elimina_importazione_excel(uuid) to authenticated;


-- ---------------------------------------------------------
-- Anteprima dei dati che verrebbero rimossi dal reset.
-- Accesso: SOLO Admin.
-- ---------------------------------------------------------
create or replace function public.anteprima_reset_gestionale()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruolo text;
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

  return jsonb_build_object(
    'persone', (select count(*) from public.persone),
    'turni', (select count(*) from public.turni),
    'assegnazioni_turni', (select count(*) from public.persone_turni),
    'mezzi', (select count(*) from public.mezzi),
    'attivazioni_mezzi', (select count(*) from public.attivazioni_mezzi),
    'movimenti_persone', (select count(*) from public.movimenti_persone),
    'movimenti_mezzi', (select count(*) from public.movimenti_mezzi),
    'ticket_pasti', (select count(*) from public.persone_pasti),
    'importazioni', (select count(*) from public.importazioni),
    'righe_importazione', (select count(*) from public.importazioni_righe),
    'letti_occupati', (
      select count(*) from public.posti_letto where persona_id is not null
    )
  );
end;
$$;

revoke all on function public.anteprima_reset_gestionale() from public, anon;
grant execute on function public.anteprima_reset_gestionale() to authenticated;


-- ---------------------------------------------------------
-- RESET COMPLETO DEI DATI OPERATIVI.
--
-- PRESERVA:
-- - utenti/auth e utenti_segreteria
-- - configurazione corsi
-- - aree di servizio
-- - tipologie persona
-- - qualifiche master
-- - servizi pasto 16-30 settembre
-- - struttura tende/posti letto
-- - configurazione del sito
-- - log_attivita (audit storico)
--
-- Accesso: SOLO Admin.
-- Richiede conferma testuale esatta: SVUOTA GESTIONALE
-- ---------------------------------------------------------
create or replace function public.reset_gestionale_operativo(
  p_conferma text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruolo text;
  v_persone integer := 0;
  v_turni integer := 0;
  v_mezzi integer := 0;
  v_importazioni integer := 0;
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

  if trim(coalesce(p_conferma, '')) <> 'SVUOTA GESTIONALE' then
    return jsonb_build_object('status', 'conferma_non_valida');
  end if;

  select count(*)::integer into v_persone from public.persone;
  select count(*)::integer into v_turni from public.turni;
  select count(*)::integer into v_mezzi from public.mezzi;
  select count(*)::integer into v_importazioni from public.importazioni;

  -- Pasti / cucina
  delete from public.movimenti_ticket_pasti;
  delete from public.persone_pasti;
  delete from public.esigenze_alimentari;

  -- Turni / assegnazioni
  delete from public.storico_persone_turni;
  delete from public.persone_turni;
  delete from public.turni;

  -- Mezzi
  delete from public.autisti_mezzi;
  delete from public.attivazioni_mezzi;
  delete from public.movimenti_mezzi;
  delete from public.mezzi;

  -- Relazioni persone
  delete from public.persone_aree;
  delete from public.persone_corsi;
  delete from public.persone_qualifiche;
  delete from public.persone_tipologie;
  delete from public.movimenti_persone;

  -- Libera tutti i posti letto prima di eliminare le persone.
  update public.posti_letto
     set persona_id = null,
         assegnato_at = null,
         assegnato_da = null,
         assegnato_postazione = null,
         note_assegnazione = null,
         attivo = case when emergenza = true then false else true end;

  update public.tende
     set posti_emergenza_attivi = false,
         destinazione = case
           when codice = 'T05' then 'faculty'
           else 'da_definire'
         end;

  -- Cache cucina + anagrafica
  delete from public.cucina_persone;
  delete from public.persone;

  -- Staging Excel
  delete from public.importazioni_righe;
  delete from public.importazioni;

  return jsonb_build_object(
    'status', 'reset_completato',
    'persone_eliminate', v_persone,
    'turni_eliminati', v_turni,
    'mezzi_eliminati', v_mezzi,
    'importazioni_eliminate', v_importazioni,
    'configurazione_preservata', true,
    'account_preservati', true
  );
end;
$$;

revoke all on function public.reset_gestionale_operativo(text) from public, anon;
grant execute on function public.reset_gestionale_operativo(text) to authenticated;

-- Test non distruttivo: verifica solo che le funzioni esistano.
select
  p.proname as funzione
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'elimina_importazione_excel',
    'anteprima_reset_gestionale',
    'reset_gestionale_operativo'
  )
order by p.proname;
