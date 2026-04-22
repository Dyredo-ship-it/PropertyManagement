-- ============================================================
-- Migration: team invitations + granular per-member permissions
-- Run in Supabase → SQL Editor → New query → Run.
--
-- Adds:
--   profiles.is_super_admin  — true for the org creator; full access
--                              to billing & team management.
--   profiles.member_role     — preset role (admin | manager | accountant
--                              | viewer | tenant). 'tenant' stays the
--                              existing tenant-portal role.
--   profiles.permissions     — jsonb feature→"none"|"read"|"write"
--                              overriding the role's default.
--   organization_invitations — pending invites with signed token.
-- ============================================================

-- 1) Extend profiles
alter table profiles
  add column if not exists is_super_admin boolean not null default false;

alter table profiles
  add column if not exists member_role text
    check (member_role in ('admin','manager','accountant','viewer','tenant'))
    default null;

alter table profiles
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- Backfill: anyone currently 'admin' is treated as super admin of their org,
-- since they created it via signup_rpc. Safe to re-run.
update profiles
  set is_super_admin = true,
      member_role    = 'admin'
  where role = 'admin'
    and is_super_admin = false
    and member_role is null;

-- Keep tenant role mirrored in member_role for consistency.
update profiles
  set member_role = 'tenant'
  where role = 'tenant'
    and member_role is null;

-- 2) Invitations table
create table if not exists organization_invitations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invited_email text not null,
  member_role text not null default 'manager'
    check (member_role in ('admin','manager','accountant','viewer')),
  permissions jsonb not null default '{}'::jsonb,
  token text unique not null,
  status text not null default 'pending'
    check (status in ('pending','accepted','expired','revoked')),
  invited_by uuid references profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists org_invites_org_idx on organization_invitations(organization_id);
create index if not exists org_invites_email_idx on organization_invitations(lower(invited_email));
create index if not exists org_invites_token_idx on organization_invitations(token);

-- RLS
alter table organization_invitations enable row level security;

-- Members of the org can read invitations issued by their org
drop policy if exists "org_invites_select_org" on organization_invitations;
create policy "org_invites_select_org" on organization_invitations
  for select using (organization_id = current_org_id());

-- Only super admins can create / update / delete invites for their org.
drop policy if exists "org_invites_write_super_admin" on organization_invitations;
create policy "org_invites_write_super_admin" on organization_invitations
  for all using (
    organization_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  )
  with check (
    organization_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

-- 3) RPC to accept an invitation
-- Called by an authenticated user. Validates the token, links the caller's
-- profile to the invited organization, applies role + permissions, marks
-- the invitation accepted. Returns the organization id.
create or replace function accept_organization_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv organization_invitations;
  v_user_email text;
begin
  select * into v_inv from organization_invitations
    where token = p_token
      and status = 'pending'
      and expires_at > now()
    for update;

  if not found then
    raise exception 'Invitation invalide, expirée ou déjà utilisée';
  end if;

  -- Light email check: the caller's auth email should match the invite.
  select email into v_user_email from auth.users where id = auth.uid();
  if lower(v_user_email) <> lower(v_inv.invited_email) then
    raise exception 'Cette invitation est destinée à une autre adresse email';
  end if;

  -- Upsert the profile: link it to the invited organization with the
  -- invitation's role + permissions. Preserves the existing full_name.
  insert into profiles (id, organization_id, email, full_name, role, member_role, permissions, is_super_admin)
    values (auth.uid(), v_inv.organization_id, v_user_email, null, 'admin', v_inv.member_role, v_inv.permissions, false)
    on conflict (id) do update
      set organization_id = excluded.organization_id,
          role            = excluded.role,
          member_role     = excluded.member_role,
          permissions     = excluded.permissions,
          is_super_admin  = false,
          updated_at      = now();

  update organization_invitations
    set status = 'accepted',
        accepted_at = now()
    where id = v_inv.id;

  return v_inv.organization_id;
end;
$$;

grant execute on function accept_organization_invitation(text) to authenticated;
