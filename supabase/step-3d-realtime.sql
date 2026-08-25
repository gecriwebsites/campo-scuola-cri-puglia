-- CAMPO SCUOLA CRI PUGLIA 2026
-- PASSO 3D - Realtime Persone e Accreditamento

-- Consente a Supabase Realtime di notificare le postazioni
-- quando cambiano anagrafiche o movimenti di ingresso/uscita.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'persone'
  ) then
    alter publication supabase_realtime add table public.persone;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'movimenti_persone'
  ) then
    alter publication supabase_realtime add table public.movimenti_persone;
  end if;
end $$;

-- Manteniamo l'identità completa delle righe per futuri aggiornamenti
-- Realtime e controlli di concorrenza.
alter table public.persone replica identity full;
alter table public.movimenti_persone replica identity full;
