-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- RESET COMPLETO PRE-CAMPO / DATI DI TEST
-- =========================================================
-- Eseguire una sola volta nel SQL Editor di Supabase.
--
-- SCOPO
-- Durante i test il gestionale può contenere persone, accrediti,
-- movimenti, QR stampati, giornate aperte/chiuse, criticità,
-- passaggi consegne, turni, pasti, mezzi e log tecnici.
-- Il comando "SVUOTA GESTIONALE" deve riportare TUTTI questi
-- dati operativi a zero prima dell'avvio reale del Campo.
--
-- PRESERVA SOLO LA CONFIGURAZIONE STRUTTURALE:
-- - auth.users / account di accesso
-- - utenti_segreteria e ruoli
-- - corsi
-- - aree_servizio
-- - qualifiche
-- - tipologie_persona
-- - servizi_pasto
-- - tende e posti_letto come struttura vuota
-- - configurazione applicativa
--
-- ELIMINA ANCHE:
-- - giornate_operative e relative checklist/aperture/chiusure
-- - criticita_operative
-- - passaggi_consegne
-- - stampe_qr
-- - log_attivita
-- =========================================================

create or replace function public.anteprima_reset_gestionale()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruolo text;
  v_giornate bigint := 0;
  v_criticita bigint := 0;
  v_consegne bigint := 0;
  v_stampe_qr bigint := 0;
  v_log bigint := 0;
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

  if to_regclass('public.giornate_operative') is not null then
    execute 'select count(*) from public.giornate_operative' into v_giornate;
  end if;
  if to_regclass('public.criticita_operative') is not null then
    execute 'select count(*) from public.criticita_operative' into v_criticita;
  end if;
  if to_regclass('public.passaggi_consegne') is not null then
    execute 'select count(*) from public.passaggi_consegne' into v_consegne;
  end if;
  if to_regclass('public.stampe_qr') is not null then
    execute 'select count(*) from public.stampe_qr' into v_stampe_qr;
  end if;
  if to_regclass('public.log_attivita') is not null then
    execute 'select count(*) from public.log_attivita' into v_log;
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
    'letti_occupati', (select count(*) from public.posti_letto where persona_id is not null),
    'giornate_operative', v_giornate,
    'criticita_operative', v_criticita,
    'passaggi_consegne', v_consegne,
    'stampe_qr', v_stampe_qr,
    'log_attivita', v_log
  );
end;
$$;

revoke all on function public.anteprima_reset_gestionale() from public, anon;
grant execute on function public.anteprima_reset_gestionale() to authenticated;


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
  v_ticket integer := 0;
  v_letti integer := 0;
  v_giornate integer := 0;
  v_criticita integer := 0;
  v_consegne integer := 0;
  v_stampe_qr integer := 0;
  v_log integer := 0;
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
  select count(*)::integer into v_ticket from public.persone_pasti;
  select count(*)::integer into v_letti from public.posti_letto where persona_id is not null;

  if to_regclass('public.giornate_operative') is not null then
    execute 'select count(*)::integer from public.giornate_operative' into v_giornate;
  end if;
  if to_regclass('public.criticita_operative') is not null then
    execute 'select count(*)::integer from public.criticita_operative' into v_criticita;
  end if;
  if to_regclass('public.passaggi_consegne') is not null then
    execute 'select count(*)::integer from public.passaggi_consegne' into v_consegne;
  end if;
  if to_regclass('public.stampe_qr') is not null then
    execute 'select count(*)::integer from public.stampe_qr' into v_stampe_qr;
  end if;
  if to_regclass('public.log_attivita') is not null then
    execute 'select count(*)::integer from public.log_attivita' into v_log;
  end if;

  -- 1. Registri operativi indipendenti introdotti negli ultimi moduli.
  if to_regclass('public.stampe_qr') is not null then
    execute 'delete from public.stampe_qr where true';
  end if;
  if to_regclass('public.passaggi_consegne') is not null then
    execute 'delete from public.passaggi_consegne where true';
  end if;
  if to_regclass('public.criticita_operative') is not null then
    execute 'delete from public.criticita_operative where true';
  end if;
  if to_regclass('public.giornate_operative') is not null then
    execute 'delete from public.giornate_operative where true';
  end if;

  -- 2. Verifiche accredito / importazioni.
  if to_regclass('public.verifiche_accreditamento_persona') is not null then
    execute 'delete from public.verifiche_accreditamento_persona where true';
  end if;

  delete from public.importazioni_righe where true;
  delete from public.importazioni where true;

  -- 3. Pasti / Cucina.
  if to_regclass('public.movimenti_ticket_pasti') is not null then
    execute 'delete from public.movimenti_ticket_pasti where true';
  end if;
  delete from public.persone_pasti where true;
  delete from public.esigenze_alimentari where true;

  -- 4. Turni.
  if to_regclass('public.storico_persone_turni') is not null then
    execute 'delete from public.storico_persone_turni where true';
  end if;
  delete from public.persone_turni where true;
  delete from public.turni where true;

  -- 5. Mezzi.
  delete from public.autisti_mezzi where true;
  delete from public.attivazioni_mezzi where true;
  delete from public.movimenti_mezzi where true;
  delete from public.mezzi where true;

  -- 6. Relazioni e movimenti persone.
  delete from public.persone_aree where true;
  delete from public.persone_corsi where true;
  delete from public.persone_qualifiche where true;
  delete from public.persone_tipologie where true;
  delete from public.movimenti_persone where true;

  -- 7. Ripristina alloggi alla configurazione iniziale.
  update public.posti_letto
     set persona_id = null,
         assegnato_at = null,
         assegnato_da = null,
         assegnato_postazione = null,
         note_assegnazione = null,
         attivo = case when emergenza = true then false else true end
   where true;

  update public.tende
     set posti_emergenza_attivi = false,
         destinazione = case when codice = 'T05' then 'faculty' else 'da_definire' end,
         solo_docenti = case when codice = 'T05' then true else false end
   where true;

  -- 8. Cache Cucina.
  if to_regclass('public.cucina_persone') is not null then
    execute 'delete from public.cucina_persone where true';
  end if;

  -- 9. Anagrafica persone. Lo storico QR è già stato rimosso sopra.
  delete from public.persone where true;

  -- 10. Audit/log di test: azzerato per partire con uno storico reale pulito.
  if to_regclass('public.log_attivita') is not null then
    execute 'delete from public.log_attivita where true';
  end if;

  return jsonb_build_object(
    'status', 'reset_completato',
    'persone_eliminate', v_persone,
    'turni_eliminati', v_turni,
    'mezzi_eliminati', v_mezzi,
    'importazioni_eliminate', v_importazioni,
    'ticket_pasti_eliminati', v_ticket,
    'letti_liberati', v_letti,
    'giornate_eliminate', v_giornate,
    'criticita_eliminate', v_criticita,
    'passaggi_consegne_eliminati', v_consegne,
    'stampe_qr_eliminate', v_stampe_qr,
    'log_eliminati', v_log,
    'configurazione_preservata', true,
    'account_preservati', true,
    'dati_operativi_azzerati', true
  );
end;
$$;

revoke all on function public.reset_gestionale_operativo(text) from public, anon;
grant execute on function public.reset_gestionale_operativo(text) to authenticated;

-- Verifica non distruttiva delle due funzioni aggiornate.
select
  p.proname as funzione,
  pg_get_function_identity_arguments(p.oid) as argomenti
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('anteprima_reset_gestionale','reset_gestionale_operativo')
order by p.proname;
