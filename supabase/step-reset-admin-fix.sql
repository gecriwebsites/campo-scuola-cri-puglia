-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- FIX RESET ADMIN - COMPATIBILE CON SAFE UPDATE/DELETE
-- =========================================================
--
-- Corregge l'errore:
--   DELETE requires a WHERE clause
--
-- Aggiorna inoltre l'ordine di eliminazione per includere
-- le nuove tabelle introdotte (verifica accredito/import Master).
--
-- PRESERVA:
-- - auth.users / account di accesso
-- - utenti_segreteria e ruoli
-- - corsi master
-- - aree_servizio master
-- - qualifiche master
-- - tipologie_persona master
-- - servizi_pasto 16-30 settembre
-- - tende e struttura posti letto
-- - log_attivita
--
-- ELIMINA:
-- - persone e relativi collegamenti
-- - verifiche accredito
-- - movimenti persone
-- - turni e assegnazioni
-- - ticket pasti e esigenze alimentari
-- - mezzi, attivazioni, autisti e movimenti
-- - importazioni Excel/Master e relative righe
-- - assegnazioni letti
-- =========================================================

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

  -- =======================================================
  -- 1. VERIFICA ACCREDITO
  -- Dipende sia da persone sia da importazioni.
  -- =======================================================
  if to_regclass('public.verifiche_accreditamento_persona') is not null then
    delete from public.verifiche_accreditamento_persona
    where true;
  end if;

  -- =======================================================
  -- 2. STORICO IMPORT / PROVENIENZA
  -- Le righe possono avere FK verso persone.
  -- =======================================================
  delete from public.importazioni_righe
  where true;

  delete from public.importazioni
  where true;

  -- =======================================================
  -- 3. PASTI / CUCINA
  -- =======================================================
  delete from public.movimenti_ticket_pasti
  where true;

  delete from public.persone_pasti
  where true;

  delete from public.esigenze_alimentari
  where true;

  -- =======================================================
  -- 4. TURNI
  -- =======================================================
  delete from public.storico_persone_turni
  where true;

  delete from public.persone_turni
  where true;

  delete from public.turni
  where true;

  -- =======================================================
  -- 5. MEZZI
  -- =======================================================
  delete from public.autisti_mezzi
  where true;

  delete from public.attivazioni_mezzi
  where true;

  delete from public.movimenti_mezzi
  where true;

  delete from public.mezzi
  where true;

  -- =======================================================
  -- 6. RELAZIONI PERSONE
  -- =======================================================
  delete from public.persone_aree
  where true;

  delete from public.persone_corsi
  where true;

  delete from public.persone_qualifiche
  where true;

  delete from public.persone_tipologie
  where true;

  delete from public.movimenti_persone
  where true;

  -- =======================================================
  -- 7. LIBERA POSTI LETTO E RIPRISTINA TENDE
  -- =======================================================
  update public.posti_letto
     set persona_id = null,
         assegnato_at = null,
         assegnato_da = null,
         assegnato_postazione = null,
         note_assegnazione = null,
         attivo = case
           when emergenza = true then false
           else true
         end
   where true;

  update public.tende
     set posti_emergenza_attivi = false,
         destinazione = case
           when codice = 'T05' then 'faculty'
           else 'da_definire'
         end,
         solo_docenti = case
           when codice = 'T05' then true
           else false
         end
   where true;

  -- =======================================================
  -- 8. CACHE CUCINA
  -- =======================================================
  if to_regclass('public.cucina_persone') is not null then
    delete from public.cucina_persone
    where true;
  end if;

  -- =======================================================
  -- 9. ANAGRAFICA
  -- Include anche chiave_import del nuovo Excel Master.
  -- =======================================================
  delete from public.persone
  where true;

  return jsonb_build_object(
    'status', 'reset_completato',
    'persone_eliminate', v_persone,
    'turni_eliminati', v_turni,
    'mezzi_eliminati', v_mezzi,
    'importazioni_eliminate', v_importazioni,
    'ticket_pasti_eliminati', v_ticket,
    'letti_liberati', v_letti,
    'configurazione_preservata', true,
    'account_preservati', true
  );
end;
$$;

revoke all on function public.reset_gestionale_operativo(text) from public, anon;
grant execute on function public.reset_gestionale_operativo(text) to authenticated;

-- =========================================================
-- CONTROLLO NON DISTRUTTIVO
-- =========================================================
select
  p.proname as funzione,
  pg_get_function_identity_arguments(p.oid) as argomenti
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'reset_gestionale_operativo';
