-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- RESET PRE-CAMPO COMPLETO
-- Eseguire una sola volta nel SQL Editor di Supabase.
--
-- SCOPO
-- Porta il gestionale allo stato iniziale dopo i test.
-- Elimina TUTTI i dati operativi e di collaudo.
--
-- PRESERVA SOLTANTO LA CONFIGURAZIONE STRUTTURALE:
-- - auth.users
-- - utenti_segreteria / ruoli e account
-- - corsi
-- - aree_servizio
-- - qualifiche
-- - tipologie_persona
-- - servizi_pasto
-- - tende e posti_letto come struttura vuota
--
-- ELIMINA ANCHE:
-- - giornate operative / checklist / aperture e chiusure
-- - criticita operative
-- - passaggi consegne
-- - storico stampe QR
-- - log_attivita dei test
-- =========================================================

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
    'letti_occupati', (select count(*) from public.posti_letto where persona_id is not null),
    'giornate_operative', (select count(*) from public.giornate_operative),
    'criticita', (select count(*) from public.criticita_operative),
    'passaggi_consegne', (select count(*) from public.passaggi_consegne),
    'stampe_qr', (select count(*) from public.stampe_qr),
    'log_attivita', (select count(*) from public.log_attivita)
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
  v_giornate integer := 0;
  v_criticita integer := 0;
  v_passaggi integer := 0;
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
  select count(*)::integer into v_giornate from public.giornate_operative;
  select count(*)::integer into v_criticita from public.criticita_operative;
  select count(*)::integer into v_passaggi from public.passaggi_consegne;
  select count(*)::integer into v_stampe_qr from public.stampe_qr;
  select count(*)::integer into v_log from public.log_attivita;

  -- =======================================================
  -- 1. DATI DI COORDINAMENTO / GIORNATE / TEST
  -- =======================================================
  delete from public.passaggi_consegne where true;
  delete from public.criticita_operative where true;
  delete from public.giornate_operative where true;

  -- Lo storico stampa viene eliminato esplicitamente prima delle persone.
  delete from public.stampe_qr where true;

  -- =======================================================
  -- 2. VERIFICA ACCREDITO / IMPORT
  -- =======================================================
  if to_regclass('public.verifiche_accreditamento_persona') is not null then
    delete from public.verifiche_accreditamento_persona where true;
  end if;

  delete from public.importazioni_righe where true;
  delete from public.importazioni where true;

  -- =======================================================
  -- 3. PASTI / CUCINA
  -- =======================================================
  delete from public.movimenti_ticket_pasti where true;
  delete from public.persone_pasti where true;
  delete from public.esigenze_alimentari where true;

  -- =======================================================
  -- 4. TURNI
  -- =======================================================
  delete from public.storico_persone_turni where true;
  delete from public.persone_turni where true;
  delete from public.turni where true;

  -- =======================================================
  -- 5. MEZZI
  -- =======================================================
  delete from public.autisti_mezzi where true;
  delete from public.attivazioni_mezzi where true;
  delete from public.movimenti_mezzi where true;
  delete from public.mezzi where true;

  -- =======================================================
  -- 6. RELAZIONI E MOVIMENTI PERSONE
  -- =======================================================
  delete from public.persone_aree where true;
  delete from public.persone_corsi where true;
  delete from public.persone_qualifiche where true;
  delete from public.persone_tipologie where true;
  delete from public.movimenti_persone where true;

  -- =======================================================
  -- 7. ALLOGGI: LIBERA TUTTO E RIPRISTINA CONFIGURAZIONE BASE
  -- =======================================================
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

  -- =======================================================
  -- 8. CACHE CUCINA / ANAGRAFICA
  -- =======================================================
  if to_regclass('public.cucina_persone') is not null then
    delete from public.cucina_persone where true;
  end if;

  delete from public.persone where true;

  -- =======================================================
  -- 9. AUDIT TEST
  -- Deve essere l'ultima cancellazione per lasciare il nuovo Campo pulito.
  -- =======================================================
  delete from public.log_attivita where true;

  return jsonb_build_object(
    'status', 'reset_completato',
    'persone_eliminate', v_persone,
    'turni_eliminati', v_turni,
    'mezzi_eliminati', v_mezzi,
    'importazioni_eliminate', v_importazioni,
    'giornate_eliminate', v_giornate,
    'criticita_eliminate', v_criticita,
    'passaggi_eliminati', v_passaggi,
    'stampe_qr_eliminate', v_stampe_qr,
    'log_eliminati', v_log,
    'configurazione_preservata', true,
    'account_preservati', true,
    'stato', 'pronto_da_zero'
  );
end;
$$;

revoke all on function public.reset_gestionale_operativo(text) from public, anon;
grant execute on function public.reset_gestionale_operativo(text) to authenticated;

-- Controllo non distruttivo
select
  p.proname as funzione,
  pg_get_function_identity_arguments(p.oid) as argomenti
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('anteprima_reset_gestionale','reset_gestionale_operativo')
order by p.proname;
