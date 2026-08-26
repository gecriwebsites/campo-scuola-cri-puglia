-- =========================================================
-- CAMPO SCUOLA CRI PUGLIA 2026
-- MASTER WORKBOOK - SUPPORTO IMPORT UNICO
-- =========================================================

alter table public.persone
add column if not exists chiave_import text;

create unique index if not exists ux_persone_chiave_import_norm
on public.persone (lower(trim(chiave_import)))
where chiave_import is not null and trim(chiave_import) <> '';

comment on column public.persone.chiave_import is
'Chiave stabile usata dal file master Excel per collegare PERSONE, CORSI, TURNI, PASTI e MEZZI. Può coincidere con il codice fiscale oppure essere un codice personalizzato (es. P001).';

-- La colonna viene esposta alle policy già presenti sulla tabella persone.
-- Realtime della tabella persone è già attivo nel gestionale.

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'persone'
  and column_name = 'chiave_import';
