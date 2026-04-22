-- ============================================================
-- Migration: public preview of a pending invitation by token
--
-- Unauthenticated users clicking the email CTA need enough context
-- to see "who invited me and to what" *before* creating an account.
-- The invitations table is RLS-locked to org members, so we expose a
-- SECURITY DEFINER RPC that returns a minimal, non-sensitive preview
-- based solely on the 48-byte random token.
--
-- What leaks by design (token-gated): invited email, role, org name,
-- and for tenant invites the building name + unit. These are details
-- the invitee already knows about themselves.
-- ============================================================

create or replace function get_invitation_preview(p_token text)
returns table (
  invited_email    text,
  member_role      text,
  organization_name text,
  tenant_unit      text,
  building_name    text,
  expires_at       timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    inv.invited_email,
    inv.member_role,
    org.name  as organization_name,
    t.unit    as tenant_unit,
    coalesce(b.name, t.building_name) as building_name,
    inv.expires_at
  from organization_invitations inv
  join organizations org on org.id = inv.organization_id
  left join tenants   t  on t.id  = inv.tenant_id
  left join buildings b  on b.id  = t.building_id
  where inv.token = p_token
    and inv.status = 'pending'
    and inv.expires_at > now()
  limit 1;
end;
$$;

-- Callable by anyone — the token itself is the bearer credential.
grant execute on function get_invitation_preview(text) to anon, authenticated;
