-- Run this in Supabase SQL Editor.
-- Creates an atomic "signup" RPC that bypasses RLS to create
-- organization + profile + trial subscription in one transaction.

create or replace function create_organization_with_profile(
  org_name text,
  user_full_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  uid uuid := auth.uid();
  v_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = uid;

  insert into organizations (name, plan) values (org_name, 'starter')
  returning id into new_org_id;

  insert into profiles (id, organization_id, email, full_name, role)
  values (uid, new_org_id, coalesce(v_email, ''), user_full_name, 'admin')
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        full_name = excluded.full_name,
        role = 'admin';

  insert into subscriptions (organization_id, plan, status)
  values (new_org_id, 'starter', 'trialing')
  on conflict (organization_id) do nothing;

  return new_org_id;
end;
$$;

grant execute on function create_organization_with_profile(text, text) to authenticated;
