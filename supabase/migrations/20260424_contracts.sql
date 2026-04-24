-- ============================================================
-- Migration: Contracts & Insurance tracker
--
-- Adds a new `contracts` table for recurring supplier contracts
-- attached to a building: assurance bâtiment, RC, chauffage,
-- conciergerie, ascenseur, etc. Each contract has a renewal date
-- and a notice period (in days) that feed the app's upcoming-events
-- timeline with automatic renewal alerts.
--
-- Usage: Supabase → SQL Editor → paste + Run. Idempotent.
-- ============================================================

create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,

  type text not null check (type in (
    'assurance-batiment',
    'assurance-rc',
    'assurance-incendie',
    'chauffage',
    'conciergerie',
    'ascenseur',
    'jardinage',
    'nettoyage',
    'securite',
    'telecom',
    'autre'
  )),
  label text not null,
  provider text,
  policy_number text,

  start_date date,
  renewal_date date,
  notice_period_days integer not null default 90,
  auto_renew boolean not null default true,

  annual_amount numeric(12,2),
  currency text default 'CHF',
  payment_frequency text check (payment_frequency in ('monthly','quarterly','yearly','one-time')) default 'yearly',

  notes text,
  status text not null check (status in ('active','expired','cancelled')) default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_org_idx on contracts(organization_id);
create index if not exists contracts_building_idx on contracts(building_id);
create index if not exists contracts_renewal_idx on contracts(renewal_date) where status = 'active';

-- Auto-update `updated_at` on any modification.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists contracts_set_updated_at on contracts;
create trigger contracts_set_updated_at
before update on contracts
for each row
execute function set_updated_at();

-- RLS: a member of an organization can read/write only that org's rows.
alter table contracts enable row level security;

drop policy if exists "members read contracts" on contracts;
create policy "members read contracts"
on contracts for select
using (organization_id in (
  select organization_id from organization_members where user_id = auth.uid()
));

drop policy if exists "members write contracts" on contracts;
create policy "members write contracts"
on contracts for all
using (organization_id in (
  select organization_id from organization_members where user_id = auth.uid()
))
with check (organization_id in (
  select organization_id from organization_members where user_id = auth.uid()
));
