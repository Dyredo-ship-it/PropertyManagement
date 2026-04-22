-- ============================================================
-- Migration: push_subscriptions
-- Stores Web Push subscriptions per user/device so the send-push
-- edge function can deliver notifications even when the app is
-- closed.
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_org_idx on push_subscriptions(organization_id);
create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);

-- Trigger for updated_at
drop trigger if exists push_subscriptions_set_updated_at on push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on push_subscriptions
  for each row execute function set_updated_at();

alter table push_subscriptions enable row level security;

-- A user can read/write only their own subscriptions.
drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
create policy "push_subscriptions_select_own" on push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push_subscriptions_write_own" on push_subscriptions;
create policy "push_subscriptions_write_own" on push_subscriptions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and organization_id = current_org_id());
