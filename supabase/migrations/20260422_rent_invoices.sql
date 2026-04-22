-- ============================================================
-- Migration: rent_invoices — registry of issued QR-bills
-- Every time a Palier rent receipt is generated with a QR-bill,
-- we persist the (reference → tenant, month, amount) mapping here.
-- The CAMT.054 import later looks up incoming payments by reference
-- to automatically mark invoices paid and create a 101 accounting
-- transaction on the matching building.
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

create table if not exists rent_invoices (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  building_id uuid references buildings(id) on delete set null,
  month text not null,                  -- "2026-04"
  reference text not null,              -- QRR (27 digits) or SCOR (RFxx…)
  amount numeric(12,2) not null,
  currency text not null default 'CHF',
  iban text not null,
  status text not null default 'issued'
    check (status in ('issued', 'paid', 'cancelled')),
  paid_amount numeric(12,2),
  paid_at timestamptz,
  camt_tx_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference)
);

create index if not exists rent_invoices_org_idx on rent_invoices(organization_id);
create index if not exists rent_invoices_ref_idx on rent_invoices(organization_id, reference);
create index if not exists rent_invoices_tenant_month_idx on rent_invoices(tenant_id, month);

drop trigger if exists rent_invoices_set_updated_at on rent_invoices;
create trigger rent_invoices_set_updated_at before update on rent_invoices
  for each row execute function set_updated_at();

alter table rent_invoices enable row level security;

drop policy if exists "rent_invoices_select_org" on rent_invoices;
create policy "rent_invoices_select_org" on rent_invoices
  for select using (organization_id = current_org_id());

drop policy if exists "rent_invoices_write_org" on rent_invoices;
create policy "rent_invoices_write_org" on rent_invoices
  for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());
