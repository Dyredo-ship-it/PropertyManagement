-- ============================================================
-- Migration: tighten RLS so a "tenant" profile cannot read
-- agency-only data. Without this, the generic org-wide policy in
-- schema.sql lets a tenant read tenant_notes, maintenance_requests,
-- accounting rows, etc. of the whole organisation.
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

-- Helper: returns the tenants.id that the current auth user is linked
-- to via their profile (null for admins).
create or replace function current_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from profiles where id = auth.uid();
$$;

grant execute on function current_tenant_id() to authenticated;

-- ── Tables admin-only: tenant must NOT read these at all ───────
--     (they remain org-wide readable for admin + other team roles)

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'tenant_notes',
      'tenant_absences',
      'rental_applications',
      'accounting_transactions',
      'manual_adjustments',
      'accounting_settings',
      'renovations',
      'building_actions'
    ])
  loop
    execute format('drop policy if exists "%1$s_select_org" on %1$s', t);
    execute format($q$
      create policy "%1$s_select_org" on %1$s
        for select using (
          organization_id = current_org_id()
          and current_user_role() = 'admin'
        )
    $q$, t);

    execute format('drop policy if exists "%1$s_write_org" on %1$s', t);
    execute format($q$
      create policy "%1$s_write_org" on %1$s
        for all using (
          organization_id = current_org_id()
          and current_user_role() = 'admin'
        )
        with check (
          organization_id = current_org_id()
          and current_user_role() = 'admin'
        )
    $q$, t);
  end loop;
end $$;

-- ── tenant_documents: tenant sees their own, admin sees all ───
drop policy if exists "tenant_documents_select_org" on tenant_documents;
create policy "tenant_documents_select_org" on tenant_documents
  for select using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or tenant_id = current_tenant_id()
    )
  );

drop policy if exists "tenant_documents_write_org" on tenant_documents;
create policy "tenant_documents_write_org" on tenant_documents
  for all using (
    organization_id = current_org_id() and current_user_role() = 'admin'
  )
  with check (
    organization_id = current_org_id() and current_user_role() = 'admin'
  );

-- ── maintenance_requests: tenant sees requests on their own record ───
drop policy if exists "maintenance_requests_select_org" on maintenance_requests;
create policy "maintenance_requests_select_org" on maintenance_requests
  for select using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or tenant_id = current_tenant_id()
    )
  );

-- Tenants can only create requests for themselves; admins can do anything.
drop policy if exists "maintenance_requests_write_org" on maintenance_requests;

drop policy if exists "maintenance_requests_insert_self" on maintenance_requests;
create policy "maintenance_requests_insert_self" on maintenance_requests
  for insert with check (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or tenant_id = current_tenant_id()
    )
  );

drop policy if exists "maintenance_requests_update_org" on maintenance_requests;
create policy "maintenance_requests_update_org" on maintenance_requests
  for update using (
    organization_id = current_org_id() and current_user_role() = 'admin'
  )
  with check (
    organization_id = current_org_id() and current_user_role() = 'admin'
  );

drop policy if exists "maintenance_requests_delete_org" on maintenance_requests;
create policy "maintenance_requests_delete_org" on maintenance_requests
  for delete using (
    organization_id = current_org_id() and current_user_role() = 'admin'
  );

-- ── calendar_events: admin-only for now (shared calendar of the régie) ───
drop policy if exists "calendar_events_select_org" on calendar_events;
create policy "calendar_events_select_org" on calendar_events
  for select using (
    organization_id = current_org_id() and current_user_role() = 'admin'
  );

drop policy if exists "calendar_events_write_org" on calendar_events;
create policy "calendar_events_write_org" on calendar_events
  for all using (
    organization_id = current_org_id() and current_user_role() = 'admin'
  )
  with check (
    organization_id = current_org_id() and current_user_role() = 'admin'
  );

-- ── buildings: tenant sees only their own building ───
drop policy if exists "buildings_select_org" on buildings;
create policy "buildings_select_org" on buildings
  for select using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or id = (select building_id from tenants where id = current_tenant_id())
    )
  );

drop policy if exists "buildings_write_org" on buildings;
create policy "buildings_write_org" on buildings
  for all using (
    organization_id = current_org_id() and current_user_role() = 'admin'
  )
  with check (
    organization_id = current_org_id() and current_user_role() = 'admin'
  );
