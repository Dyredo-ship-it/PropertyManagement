-- ============================================================
-- Migration: per-organization rent payment settings
-- rent_due_day      — day of the month by which rent must arrive
--                     for the month it covers (1..28, default 1).
-- rent_in_advance   — true: rent for month M is due by day D of M
--                     (Swiss convention). false: due by day D of M-1.
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

alter table organizations
  add column if not exists rent_due_day int not null default 1
    check (rent_due_day between 1 and 28);

alter table organizations
  add column if not exists rent_in_advance boolean not null default true;
