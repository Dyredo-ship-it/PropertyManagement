-- ============================================================
-- Migration: AI assistant usage metering per month
-- One row per (user, YYYY-MM) tracks how many questions the user has
-- asked the assistant in that calendar month. Used to enforce the plan
-- quota (Starter: 0, Pro: 200, Business: unlimited).
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

create table if not exists ai_usage_month (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  year_month text not null, -- "2026-04"
  question_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year_month)
);

create index if not exists ai_usage_month_user_idx on ai_usage_month(user_id, year_month);

alter table ai_usage_month enable row level security;

drop policy if exists "ai_usage_month_select_own" on ai_usage_month;
create policy "ai_usage_month_select_own" on ai_usage_month
  for select using (user_id = auth.uid());

-- Atomic increment — returns the new count. Called by the edge function
-- after each successful LLM turn (not on resume continuations).
create or replace function increment_ai_usage()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_ym text;
  v_count int;
begin
  select organization_id into v_org from profiles where id = auth.uid();
  if v_org is null then
    raise exception 'no organization for caller';
  end if;

  v_ym := to_char(now(), 'YYYY-MM');

  insert into ai_usage_month (organization_id, user_id, year_month, question_count)
    values (v_org, auth.uid(), v_ym, 1)
    on conflict (user_id, year_month) do update
      set question_count = ai_usage_month.question_count + 1,
          updated_at = now()
    returning question_count into v_count;

  return v_count;
end;
$$;

grant execute on function increment_ai_usage() to authenticated;

-- Convenience getter — returns current month's count for the caller.
create or replace function current_ai_usage()
returns int
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select question_count from ai_usage_month
      where user_id = auth.uid()
        and year_month = to_char(now(), 'YYYY-MM')),
    0
  );
$$;

grant execute on function current_ai_usage() to authenticated;
