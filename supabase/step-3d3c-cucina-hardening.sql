-- CAMPO SCUOLA CRI PUGLIA 2026
-- PASSO 3D.3C.1
-- La Cucina consuma ticket solo tramite RPC atomica.

-- Niente UPDATE diretto della tabella da parte del ruolo Cucina.
drop policy if exists cucina_persone_pasti_update
on public.persone_pasti;

-- L'RPC effettua la modifica con privilegi controllati,
-- verificando comunque il ruolo dell'utente autenticato.
create or replace function public.cucina_consuma_ticket_persona(
  p_persona_id uuid,
  p_tipo public.tipo_pasto,
  p_data date default null,
  p_postazione text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruolo text;
  v_data date;
  v_servizio_id uuid;
  v_ticket record;
begin
  select u.ruolo
  into v_ruolo
  from public.utenti_segreteria u
  where u.user_id = auth.uid()
    and u.attivo = true
  limit 1;

  if v_ruolo not in ('admin', 'segreteria', 'cucina') then
    raise exception 'Accesso non autorizzato';
  end if;

  v_data := coalesce(
    p_data,
    (now() at time zone 'Europe/Rome')::date
  );

  select sp.id
  into v_servizio_id
  from public.servizi_pasto sp
  where sp.data = v_data
    and sp.tipo = p_tipo
    and sp.attivo = true
  limit 1;

  if not found then
    return jsonb_build_object(
      'status', 'servizio_non_attivo',
      'tipo', p_tipo,
      'data', v_data
    );
  end if;

  update public.persone_pasti
  set
    consumato = true,
    consumato_at = now(),
    consumato_da = auth.uid(),
    consumato_postazione = nullif(trim(coalesce(p_postazione, '')), ''),
    motivo_ultima_variazione = null
  where persona_id = p_persona_id
    and servizio_pasto_id = v_servizio_id
    and previsto = true
    and ticket_attivo = true
    and consumato = false
  returning * into v_ticket;

  if found then
    return jsonb_build_object(
      'status', 'consumato',
      'ticket_id', v_ticket.id,
      'tipo', p_tipo,
      'data', v_data,
      'consumato_at', v_ticket.consumato_at
    );
  end if;

  select *
  into v_ticket
  from public.persone_pasti
  where persona_id = p_persona_id
    and servizio_pasto_id = v_servizio_id
  limit 1;

  if not found then
    return jsonb_build_object('status', 'non_previsto');
  end if;

  if v_ticket.consumato = true then
    return jsonb_build_object(
      'status', 'gia_utilizzato',
      'tipo', p_tipo,
      'data', v_data,
      'consumato_at', v_ticket.consumato_at,
      'consumato_postazione', v_ticket.consumato_postazione
    );
  end if;

  return jsonb_build_object('status', 'non_disponibile');
end;
$$;

revoke all
on function public.cucina_consuma_ticket_persona(
  uuid,
  public.tipo_pasto,
  date,
  text
)
from public, anon;

grant execute
on function public.cucina_consuma_ticket_persona(
  uuid,
  public.tipo_pasto,
  date,
  text
)
to authenticated;
