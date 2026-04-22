-- ============================================================
-- Migration: maintenance-photos storage bucket
-- Org-scoped storage for photos attached to maintenance requests.
-- Files live at "<org_id>/<request_id>/<filename>".
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', true)
on conflict (id) do nothing;

-- Anyone authenticated can READ photos from their own org.
drop policy if exists "maintenance-photos_select_org" on storage.objects;
create policy "maintenance-photos_select_org"
  on storage.objects for select
  using (
    bucket_id = 'maintenance-photos'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

-- Only authenticated users can upload photos to their own org's folder.
drop policy if exists "maintenance-photos_insert_org" on storage.objects;
create policy "maintenance-photos_insert_org"
  on storage.objects for insert
  with check (
    bucket_id = 'maintenance-photos'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

-- Admins (and the uploader themselves) can delete photos from their org.
drop policy if exists "maintenance-photos_delete_org" on storage.objects;
create policy "maintenance-photos_delete_org"
  on storage.objects for delete
  using (
    bucket_id = 'maintenance-photos'
    and (storage.foldername(name))[1] = current_org_id()::text
  );
