-- ============================================================
-- Migration: account_chart_entries
-- Custom chart-of-accounts per organization.
-- One row per (org, num). Stores either:
--   * an override on a standard account (is_custom = false, custom_label or disabled)
--   * a user-defined custom account (is_custom = true, custom_label required)
-- building_ids empty array = account applies to all buildings of the org.
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

create table if not exists account_chart_entries (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  num int not null,
  custom_label text,
  type text not null check (type in ('revenue','expense','investment','owner','charges_income')),
  building_ids uuid[] not null default '{}'::uuid[],
  disabled boolean not null default false,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, num)
);

create index if not exists account_chart_entries_org_idx on account_chart_entries(organization_id);

-- Trigger for updated_at
drop trigger if exists account_chart_entries_set_updated_at on account_chart_entries;
create trigger account_chart_entries_set_updated_at before update on account_chart_entries
  for each row execute function set_updated_at();

-- Enable RLS
alter table account_chart_entries enable row level security;

drop policy if exists "account_chart_entries_select_org" on account_chart_entries;
create policy "account_chart_entries_select_org" on account_chart_entries
  for select using (organization_id = current_org_id());

drop policy if exists "account_chart_entries_write_org" on account_chart_entries;
create policy "account_chart_entries_write_org" on account_chart_entries
  for all using (organization_id = current_org_id() and current_user_role() = 'admin')
  with check (organization_id = current_org_id() and current_user_role() = 'admin');
