-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- COORDINAMENTO OPERATIVO / REFERENTE SEGRETERIA
-- Eseguire una sola volta nel SQL Editor di Supabase.
-- =========================================================

create table if not exists public.criticita_operative (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titolo text not null,
  descrizione text,
  area text not null default 'generale',
  priorita text not null default 'media'
    check (priorita in ('bassa','media','alta','critica')),
  stato text not null default 'aperta'
    check (stato in ('aperta','in_gestione','risolta')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_postazione text,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  risolta_at timestamptz,
  risolta_da uuid references auth.users(id) on delete set null,
  constraint criticita_operative_periodo check (data between date '2026-09-16' and date '2026-09-30')
);

create index if not exists criticita_operative_data_stato_idx
  on public.criticita_operative (data, stato, priorita, created_at desc);

alter table public.criticita_operative enable row level security;

drop policy if exists criticita_operative_select_operativi on public.criticita_operative;
create policy criticita_operative_select_operativi
on public.criticita_operative
for select
to authenticated
using (
  exists (
    select 1 from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria','sola_lettura')
  )
);

drop policy if exists criticita_operative_insert_coordinamento on public.criticita_operative;
create policy criticita_operative_insert_coordinamento
on public.criticita_operative
for insert
to authenticated
with check (
  exists (
    select 1 from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria')
  )
  and created_by = auth.uid()
);

drop policy if exists criticita_operative_update_coordinamento on public.criticita_operative;
create policy criticita_operative_update_coordinamento
on public.criticita_operative
for update
to authenticated
using (
  exists (
    select 1 from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria')
  )
)
with check (
  exists (
    select 1 from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria')
  )
);

revoke all on public.criticita_operative from anon;
grant select, insert, update on public.criticita_operative to authenticated;


create table if not exists public.passaggi_consegne (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  testo text not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_postazione text,
  constraint passaggi_consegne_periodo check (data between date '2026-09-16' and date '2026-09-30')
);

create index if not exists passaggi_consegne_data_idx
  on public.passaggi_consegne (data, created_at desc);

alter table public.passaggi_consegne enable row level security;

drop policy if exists passaggi_consegne_select_operativi on public.passaggi_consegne;
create policy passaggi_consegne_select_operativi
on public.passaggi_consegne
for select
to authenticated
using (
  exists (
    select 1 from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria','sola_lettura')
  )
);

drop policy if exists passaggi_consegne_insert_coordinamento on public.passaggi_consegne;
create policy passaggi_consegne_insert_coordinamento
on public.passaggi_consegne
for insert
to authenticated
with check (
  exists (
    select 1 from public.utenti_segreteria u
    where u.user_id = auth.uid()
      and u.attivo = true
      and u.ruolo in ('admin','segreteria')
  )
  and created_by = auth.uid()
);

revoke all on public.passaggi_consegne from anon;
grant select, insert on public.passaggi_consegne to authenticated;

-- Realtime dei due registri.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'criticita_operative'
  ) then
    alter publication supabase_realtime add table public.criticita_operative;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'passaggi_consegne'
  ) then
    alter publication supabase_realtime add table public.passaggi_consegne;
  end if;
end $$;
