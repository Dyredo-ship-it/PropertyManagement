-- ============================================================
-- Migration: contracts — attach scanned/PDF document
--
-- Stores the original filename + a base64 data URL. No Supabase
-- Storage bucket needed — contracts are typically < 1 MB per file
-- and a régie rarely has more than ~50 contracts per org, so a
-- straight TEXT column is cheapest to operate.
-- ============================================================

alter table contracts
  add column if not exists document_name text,
  add column if not exists document_data_url text;
