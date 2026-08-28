-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- ACCREDITAMENTO DEFINITIVO
-- =========================================================
-- Separa lo stato di ACCREDITO dalla PRESENZA al Campo.
-- Una persona resta accreditata anche dopo una successiva uscita.
--
-- Eseguire una sola volta nel SQL Editor di Supabase.
-- =========================================================

alter table public.persone
  add column if not exists accreditato boolean not null default false,
  add column if not exists accreditato_at timestamptz,
  add column if not exists accreditato_da uuid references auth.users(id) on delete set null,
  add column if not exists accreditato_postazione text;

create index if not exists persone_accreditato_idx
  on public.persone (accreditato, attivo);

comment on column public.persone.accreditato is
  'Accredito iniziale completato. Indipendente dallo stato presente/fuori dal Campo.';
comment on column public.persone.accreditato_at is
  'Data e ora del primo completamento dell accredito.';

-- ---------------------------------------------------------
-- Conferma accredito.
-- - solo Admin / Segreteria
-- - se la persona proviene da Excel e ha una verifica pendente,
--   richiede prima la chiusura della verifica
-- - attiva sempre il QR
-- - NON modifica la presenza: l'entrata viene registrata dal
--   frontend con la RPC movimenti già esistente
-- ---------------------------------------------------------
create or replace function public.conferma_accreditamento_persona(
  p_persona_id uuid,
  p_postazione text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruolo text;
  v_persona public.persone%rowtype;
  v_verifica_stato text;
  v_ha_verifica boolean := false;
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

  select p.*
    into v_persona
  from public.persone p
  where p.id = p_persona_id
    and p.attivo = true
  for update;

  if not found then
    return jsonb_build_object('status', 'persona_non_trovata');
  end if;

  -- Le persone importate possono avere una riga di verifica.
  -- Se esiste, deve risultare completata prima dell'accredito.
  if to_regclass('public.verifiche_accreditamento_persona') is not null then
    select true, v.stato
      into v_ha_verifica, v_verifica_stato
    from public.verifiche_accreditamento_persona v
    where v.persona_id = p_persona_id
    limit 1;
  end if;

  if coalesce(v_ha_verifica, false)
     and coalesce(v_verifica_stato, 'da_verificare') <> 'verificato' then
    return jsonb_build_object(
      'status', 'verifica_necessaria',
      'persona_id', p_persona_id
    );
  end if;

  if v_persona.accreditato = true then
    -- Manteniamo comunque il QR attivo.
    update public.persone
       set qr_attivo = true
     where id = p_persona_id
       and qr_attivo is distinct from true;

    return jsonb_build_object(
      'status', 'gia_accreditato',
      'persona_id', p_persona_id,
      'accreditato_at', v_persona.accreditato_at,
      'accreditato_postazione', v_persona.accreditato_postazione
    );
  end if;

  update public.persone
     set accreditato = true,
         accreditato_at = now(),
         accreditato_da = auth.uid(),
         accreditato_postazione = nullif(trim(coalesce(p_postazione, '')), ''),
         qr_attivo = true
   where id = p_persona_id;

  insert into public.log_attivita (
    operatore_id, azione, entita, entita_id, dettagli
  ) values (
    auth.uid(),
    'accredito_completato',
    'persone',
    p_persona_id,
    jsonb_build_object(
      'postazione', nullif(trim(coalesce(p_postazione, '')), ''),
      'verifica_excel', case when v_ha_verifica then v_verifica_stato else null end
    )
  );

  return jsonb_build_object(
    'status', 'accreditato',
    'persona_id', p_persona_id,
    'accreditato_at', now(),
    'postazione', nullif(trim(coalesce(p_postazione, '')), '')
  );
end;
$$;

revoke all on function public.conferma_accreditamento_persona(uuid,text) from public, anon;
grant execute on function public.conferma_accreditamento_persona(uuid,text) to authenticated;

-- Controllo non distruttivo.
select
  p.proname as funzione,
  pg_get_function_identity_arguments(p.oid) as argomenti
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'conferma_accreditamento_persona';
