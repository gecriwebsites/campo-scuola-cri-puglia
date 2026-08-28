-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- STAMPA QR / ETICHETTE BADGE
-- Eseguire una sola volta nel SQL Editor di Supabase.
-- =========================================================

create table if not exists public.stampe_qr (
  id bigint generated always as identity primary key,
  persona_id uuid not null references public.persone(id) on delete cascade,
  tipo text not null default 'singola' check (tipo in ('singola','massiva')),
  formato text not null default '70x45',
  postazione text,
  dettagli jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists stampe_qr_persona_created_idx
  on public.stampe_qr(persona_id, created_at desc);

alter table public.stampe_qr enable row level security;

-- Admin e Segreteria possono vedere lo storico delle stampe.
drop policy if exists stampe_qr_select_operativi on public.stampe_qr;
create policy stampe_qr_select_operativi
on public.stampe_qr
for select
to authenticated
using (
  exists (
    select 1
    from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria')
  )
);

-- Admin e Segreteria possono registrare una stampa generata.
drop policy if exists stampe_qr_insert_operativi on public.stampe_qr;
create policy stampe_qr_insert_operativi
on public.stampe_qr
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria')
  )
);

-- Lo storico non viene modificato o cancellato dal frontend.
revoke all on public.stampe_qr from anon;
revoke update, delete on public.stampe_qr from authenticated;
grant select, insert on public.stampe_qr to authenticated;

-- Facoltativo ma utile per aggiornare in tempo reale l'indicazione "ultima stampa".
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stampe_qr'
  ) then
    alter publication supabase_realtime add table public.stampe_qr;
  end if;
end $$;
