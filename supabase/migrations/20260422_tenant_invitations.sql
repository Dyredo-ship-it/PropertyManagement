-- ============================================================
-- Migration: extend organization_invitations + accept RPC for tenants
-- Allows a super admin to invite a locataire to the portail with role
-- 'tenant', binding their future profile to a specific tenants.id row.
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

-- Relax the member_role check to also accept 'tenant'.
alter table organization_invitations
  drop constraint if exists organization_invitations_member_role_check;

alter table organization_invitations
  add constraint organization_invitations_member_role_check
    check (member_role in ('admin','manager','accountant','viewer','tenant'));

-- New nullable column to link the invitation to an existing tenant row.
alter table organization_invitations
  add column if not exists tenant_id uuid references tenants(id) on delete set null;

-- Rewrite accept_organization_invitation to handle the tenant branch:
-- when member_role='tenant', the new profile gets role='tenant' and
-- tenant_id=<the invited tenants.id>. Admin invites keep the previous
-- behaviour.
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

  select email into v_user_email from auth.users where id = auth.uid();
  if lower(v_user_email) <> lower(v_inv.invited_email) then
    raise exception 'Cette invitation est destinée à une autre adresse email';
  end if;

  if v_inv.member_role = 'tenant' then
    -- Tenant portal account — link profile.role = 'tenant', tenant_id
    -- points to the invited tenants row so the tenant portal only ever
    -- sees their own data via RLS.
    insert into profiles (id, organization_id, email, full_name, role, member_role, permissions, is_super_admin, tenant_id)
      values (auth.uid(), v_inv.organization_id, v_user_email, null, 'tenant', 'tenant', '{}'::jsonb, false, v_inv.tenant_id)
      on conflict (id) do update
        set organization_id = excluded.organization_id,
            role            = 'tenant',
            member_role     = 'tenant',
            permissions     = '{}'::jsonb,
            is_super_admin  = false,
            tenant_id       = excluded.tenant_id,
            updated_at      = now();

    -- Also attach the auth user id on the tenants row so admin-side
    -- code that still reads tenants.user_id keeps working.
    if v_inv.tenant_id is not null then
      update tenants set user_id = auth.uid() where id = v_inv.tenant_id;
    end if;
  else
    -- Colleague invitation (existing behaviour).
    insert into profiles (id, organization_id, email, full_name, role, member_role, permissions, is_super_admin)
      values (auth.uid(), v_inv.organization_id, v_user_email, null, 'admin', v_inv.member_role, v_inv.permissions, false)
      on conflict (id) do update
        set organization_id = excluded.organization_id,
            role            = 'admin',
            member_role     = excluded.member_role,
            permissions     = excluded.permissions,
            is_super_admin  = false,
            updated_at      = now();
  end if;

  update organization_invitations
    set status = 'accepted',
        accepted_at = now()
    where id = v_inv.id;

  return v_inv.organization_id;
end;
$$;

grant execute on function accept_organization_invitation(text) to authenticated;
