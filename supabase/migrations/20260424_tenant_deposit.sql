-- ============================================================
-- Migration: Tenant deposit (Mietkaution / caution de garantie)
--
-- Tracks the Swiss security deposit per tenant: amount, type (bank
-- guarantee, blocked account, paritaire, cash), the bank/IBAN of the
-- account holding it, and the release date / actually-released date.
--
-- All fields optional — legacy tenants keep working unchanged.
-- ============================================================

alter table tenants
  add column if not exists deposit_amount numeric(12,2),
  add column if not exists deposit_type text
    check (deposit_type in (
      'compte-bloque',     -- compte de garantie au nom du locataire
      'garantie-bancaire', -- garantie via banque / assurance
      'paritaire',         -- compte paritaire géré par l'agence
      'cash',              -- espèces conservées par le bailleur (rare)
      'autre'
    )),
  add column if not exists deposit_bank text,
  add column if not exists deposit_iban text,
  add column if not exists deposit_account_number text,
  add column if not exists deposit_document_name text,
  add column if not exists deposit_document_data_url text,
  add column if not exists deposit_released_at date,
  add column if not exists deposit_notes text;
