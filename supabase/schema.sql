-- ============================================================
-- Palier — Full Schema
-- Run this in Supabase → SQL Editor → New query → Run
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- Organizations (tenancy root)
-- ============================================================
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan text not null default 'starter' check (plan in ('starter','pro','business')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Profiles (one per auth user, linked to an organization)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin','tenant')),
  tenant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_org_idx on profiles(organization_id);

-- ============================================================
-- Subscriptions (Stripe)
-- ============================================================
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid unique not null references organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'starter' check (plan in ('starter','pro','business')),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired')),
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Buildings
-- ============================================================
create table if not exists buildings (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text not null,
  units int not null default 0,
  occupied_units int not null default 0,
  monthly_revenue numeric(12,2) not null default 0,
  image_url text,
  currency text default 'CHF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists buildings_org_idx on buildings(organization_id);

-- ============================================================
-- Tenants
-- ============================================================
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  building_name text,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  unit text,
  rent_net numeric(12,2) not null default 0,
  charges numeric(12,2) not null default 0,
  lease_start date,
  lease_end date,
  status text not null default 'active' check (status in ('active','pending','ended')),
  gender text default 'unspecified' check (gender in ('male','female','unspecified')),
  payment_status text check (payment_status in ('up-to-date','late','very-late')),
  late_payment_months int default 0,
  last_payment_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenants_org_idx on tenants(organization_id);
create index if not exists tenants_building_idx on tenants(building_id);

-- Link profile.tenant_id back after tenants exists
alter table profiles
  drop constraint if exists profiles_tenant_id_fkey,
  add constraint profiles_tenant_id_fkey
    foreign key (tenant_id) references tenants(id) on delete set null;

-- ============================================================
-- Maintenance requests
-- ============================================================
create table if not exists maintenance_requests (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  building_name text,
  tenant_id uuid references tenants(id) on delete set null,
  tenant_name text,
  unit text,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','in-progress','completed')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  category text,
  request_type text check (request_type in ('technical','administrative','rental')),
  date_observed date,
  photos jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists maintenance_org_idx on maintenance_requests(organization_id);

-- ============================================================
-- Rental applications
-- ============================================================
create table if not exists rental_applications (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  building_name text,
  desired_unit text,
  applicant_name text not null,
  applicant_email text not null,
  applicant_phone text,
  current_address text,
  desired_move_in date,
  monthly_income numeric(12,2),
  household_size int,
  occupation text,
  employer text,
  message text,
  status text not null default 'received'
    check (status in ('received','under-review','accepted','rejected')),
  documents jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rental_apps_org_idx on rental_applications(organization_id);

-- ============================================================
-- Notifications
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  recipient_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text,
  category text default 'general'
    check (category in ('general','maintenance','payment','inspection','urgent')),
  read boolean not null default false,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists notifications_org_idx on notifications(organization_id);
create index if not exists notifications_recipient_idx on notifications(recipient_id);

-- ============================================================
-- Calendar events
-- ============================================================
create table if not exists calendar_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  title text not null,
  date date not null,
  start_time text,
  end_time text,
  type text default 'other' check (type in ('visit','inspection','signing','meeting','other')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists calendar_org_idx on calendar_events(organization_id);

-- ============================================================
-- Accounting transactions
-- ============================================================
create table if not exists accounting_transactions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  date_invoice date not null,
  date_payment date,
  unit text,
  description text,
  category text,
  sub_category text,
  account_number int,
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  status text,
  tenant_name text,
  month text,
  created_at timestamptz not null default now()
);
create index if not exists accounting_org_idx on accounting_transactions(organization_id);
create index if not exists accounting_building_idx on accounting_transactions(building_id);

-- ============================================================
-- Manual adjustments
-- ============================================================
create table if not exists manual_adjustments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  account_number int not null,
  label text not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('debit','credit')),
  created_at timestamptz not null default now()
);
create index if not exists manual_adj_org_idx on manual_adjustments(organization_id);

-- ============================================================
-- Accounting settings (one row per building)
-- ============================================================
create table if not exists accounting_settings (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid unique not null references buildings(id) on delete cascade,
  units jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  sub_categories jsonb not null default '[]'::jsonb,
  unit_assignments jsonb not null default '{}'::jsonb,
  unit_types jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounting_settings_org_idx on accounting_settings(organization_id);

-- ============================================================
-- Renovations
-- ============================================================
create table if not exists renovations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  unit text,
  category text,
  item text,
  amortization_years int not null default 10,
  date_completed date,
  cost numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists renovations_org_idx on renovations(organization_id);

-- ============================================================
-- Tenant notes
-- ============================================================
create table if not exists tenant_notes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  text text not null,
  date timestamptz not null default now()
);
create index if not exists tenant_notes_org_idx on tenant_notes(organization_id);

-- ============================================================
-- Tenant documents (metadata — file lives in Storage)
-- ============================================================
create table if not exists tenant_documents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null,
  file_name text not null,
  file_size int,
  mime_type text,
  storage_path text,
  created_at timestamptz not null default now()
);
create index if not exists tenant_docs_org_idx on tenant_documents(organization_id);

-- ============================================================
-- Tenant absences
-- ============================================================
create table if not exists tenant_absences (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists tenant_absences_org_idx on tenant_absences(organization_id);

-- ============================================================
-- Building actions (TODO/chronological)
-- ============================================================
create table if not exists building_actions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','done')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists building_actions_org_idx on building_actions(organization_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'organizations','profiles','subscriptions','buildings','tenants',
      'maintenance_requests','rental_applications','accounting_settings','building_actions'
    ])
  loop
    execute format('drop trigger if exists %I_set_updated_at on %I', t, t);
    execute format('create trigger %I_set_updated_at before update on %I
      for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ============================================================
-- RLS: helper to get caller's organization
-- ============================================================
create or replace function current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function current_user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- ============================================================
-- Enable RLS + policies
-- ============================================================
alter table organizations        enable row level security;
alter table profiles             enable row level security;
alter table subscriptions        enable row level security;
alter table buildings            enable row level security;
alter table tenants              enable row level security;
alter table maintenance_requests enable row level security;
alter table rental_applications  enable row level security;
alter table notifications        enable row level security;
alter table calendar_events      enable row level security;
alter table accounting_transactions enable row level security;
alter table manual_adjustments   enable row level security;
alter table accounting_settings  enable row level security;
alter table renovations          enable row level security;
alter table tenant_notes         enable row level security;
alter table tenant_documents     enable row level security;
alter table tenant_absences      enable row level security;
alter table building_actions     enable row level security;

-- Organizations: members can read; only authenticated can create their own
drop policy if exists "org_select_own" on organizations;
create policy "org_select_own" on organizations
  for select using (id = current_org_id());

drop policy if exists "org_insert_any_authed" on organizations;
create policy "org_insert_any_authed" on organizations
  for insert with check (auth.uid() is not null);

drop policy if exists "org_update_admin" on organizations;
create policy "org_update_admin" on organizations
  for update using (id = current_org_id() and current_user_role() = 'admin');

-- Profiles: user can read their own + other profiles in same org; admin can update org profiles
drop policy if exists "profiles_select_self_or_org" on profiles;
create policy "profiles_select_self_or_org" on profiles
  for select using (id = auth.uid() or organization_id = current_org_id());

drop policy if exists "profiles_insert_self" on profiles;
create policy "profiles_insert_self" on profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self_or_admin" on profiles;
create policy "profiles_update_self_or_admin" on profiles
  for update using (id = auth.uid() or (organization_id = current_org_id() and current_user_role() = 'admin'));

-- Subscriptions: readable by org members, writable by admin
drop policy if exists "subs_select_org" on subscriptions;
create policy "subs_select_org" on subscriptions
  for select using (organization_id = current_org_id());

drop policy if exists "subs_write_admin" on subscriptions;
create policy "subs_write_admin" on subscriptions
  for all using (organization_id = current_org_id() and current_user_role() = 'admin')
  with check (organization_id = current_org_id() and current_user_role() = 'admin');

-- Generic org-scoped policy creator for admin-only data
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'buildings','maintenance_requests','rental_applications',
      'calendar_events','accounting_transactions','manual_adjustments',
      'accounting_settings','renovations','tenant_notes','tenant_documents',
      'tenant_absences','building_actions'
    ])
  loop
    execute format('drop policy if exists "%1$s_select_org" on %1$s', t);
    execute format('create policy "%1$s_select_org" on %1$s
      for select using (organization_id = current_org_id())', t);

    execute format('drop policy if exists "%1$s_write_org" on %1$s', t);
    execute format('create policy "%1$s_write_org" on %1$s
      for all using (organization_id = current_org_id())
      with check (organization_id = current_org_id())', t);
  end loop;
end $$;

-- Tenants: admins full, tenant self read
drop policy if exists "tenants_select_org" on tenants;
create policy "tenants_select_org" on tenants
  for select using (
    organization_id = current_org_id()
    and (current_user_role() = 'admin' or user_id = auth.uid())
  );

drop policy if exists "tenants_write_admin" on tenants;
create policy "tenants_write_admin" on tenants
  for all using (organization_id = current_org_id() and current_user_role() = 'admin')
  with check (organization_id = current_org_id() and current_user_role() = 'admin');

-- Notifications: recipient can read/update their own, admin can read all in org
drop policy if exists "notif_select" on notifications;
create policy "notif_select" on notifications
  for select using (
    organization_id = current_org_id()
    and (current_user_role() = 'admin' or recipient_id = auth.uid() or recipient_id is null)
  );

drop policy if exists "notif_write_admin" on notifications;
create policy "notif_write_admin" on notifications
  for all using (organization_id = current_org_id() and current_user_role() = 'admin')
  with check (organization_id = current_org_id() and current_user_role() = 'admin');

drop policy if exists "notif_update_self" on notifications;
create policy "notif_update_self" on notifications
  for update using (recipient_id = auth.uid());

-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('tenant-documents', 'tenant-documents', false),
  ('application-documents', 'application-documents', false),
  ('building-photos', 'building-photos', true)
on conflict (id) do nothing;

-- Storage policies (objects scoped by first folder = organization_id)
drop policy if exists "tenant_docs_read" on storage.objects;
create policy "tenant_docs_read" on storage.objects
  for select using (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists "tenant_docs_write" on storage.objects;
create policy "tenant_docs_write" on storage.objects
  for insert with check (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists "tenant_docs_delete" on storage.objects;
create policy "tenant_docs_delete" on storage.objects
  for delete using (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists "app_docs_read" on storage.objects;
create policy "app_docs_read" on storage.objects
  for select using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists "app_docs_write" on storage.objects;
create policy "app_docs_write" on storage.objects
  for insert with check (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists "building_photos_read" on storage.objects;
create policy "building_photos_read" on storage.objects
  for select using (bucket_id = 'building-photos');

drop policy if exists "building_photos_write" on storage.objects;
create policy "building_photos_write" on storage.objects
  for insert with check (
    bucket_id = 'building-photos'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists "building_photos_delete" on storage.objects;
create policy "building_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'building-photos'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

-- Done.
