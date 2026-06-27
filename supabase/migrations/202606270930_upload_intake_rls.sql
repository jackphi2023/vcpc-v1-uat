-- Upload Intake Gate RLS policies
-- Purpose: allow authenticated organization members to upload initial BizHealth/BizOS data
-- into the tenant path and create intake metadata/issues without using service role on the client.
-- Apply this migration in Supabase before testing production upload.

insert into storage.buckets (id, name, public)
values ('vcpc-data', 'vcpc-data', false)
on conflict (id) do nothing;

alter table if exists public.dataset_versions enable row level security;
alter table if exists public.data_uploads enable row level security;
alter table if exists public.validation_issues enable row level security;
alter table if exists public.audit_logs enable row level security;

-- Dataset versions: org members can read/create/update dataset versions for their organization.
drop policy if exists "org_members_select_dataset_versions" on public.dataset_versions;
create policy "org_members_select_dataset_versions"
on public.dataset_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = dataset_versions.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_insert_dataset_versions" on public.dataset_versions;
create policy "org_members_insert_dataset_versions"
on public.dataset_versions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = dataset_versions.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_update_dataset_versions" on public.dataset_versions;
create policy "org_members_update_dataset_versions"
on public.dataset_versions
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = dataset_versions.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
)
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = dataset_versions.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

-- Data uploads: org members can read/create/update/delete uploads for their organization.
drop policy if exists "org_members_select_data_uploads" on public.data_uploads;
create policy "org_members_select_data_uploads"
on public.data_uploads
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = data_uploads.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_insert_data_uploads" on public.data_uploads;
create policy "org_members_insert_data_uploads"
on public.data_uploads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = data_uploads.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_update_data_uploads" on public.data_uploads;
create policy "org_members_update_data_uploads"
on public.data_uploads
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = data_uploads.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
)
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = data_uploads.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_delete_data_uploads" on public.data_uploads;
create policy "org_members_delete_data_uploads"
on public.data_uploads
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = data_uploads.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

-- Validation issues: org members can create/read/update intake issues for their organization.
drop policy if exists "org_members_select_validation_issues" on public.validation_issues;
create policy "org_members_select_validation_issues"
on public.validation_issues
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = validation_issues.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_insert_validation_issues" on public.validation_issues;
create policy "org_members_insert_validation_issues"
on public.validation_issues
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = validation_issues.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_update_validation_issues" on public.validation_issues;
create policy "org_members_update_validation_issues"
on public.validation_issues
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = validation_issues.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
)
with check (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = validation_issues.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

-- Audit logs: org members may insert their own audit events; read access remains governed by existing admin policies if any.
drop policy if exists "org_members_insert_audit_logs" on public.audit_logs;
create policy "org_members_insert_audit_logs"
on public.audit_logs
for insert
to authenticated
with check (
  organization_id is null
  or exists (
    select 1
    from public.organization_members m
    where m.organization_id = audit_logs.organization_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

-- Storage: tenant path convention is <organization_id>/<engagement_id>/<dataset_or_folder>/<filename>.
-- The first path segment must match an organization where the user is an active member.
drop policy if exists "org_members_select_vcpc_data_objects" on storage.objects;
create policy "org_members_select_vcpc_data_objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vcpc-data'
  and exists (
    select 1
    from public.organization_members m
    where m.organization_id::text = split_part(storage.objects.name, '/', 1)
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_insert_vcpc_data_objects" on storage.objects;
create policy "org_members_insert_vcpc_data_objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vcpc-data'
  and exists (
    select 1
    from public.organization_members m
    where m.organization_id::text = split_part(storage.objects.name, '/', 1)
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);

drop policy if exists "org_members_update_vcpc_data_objects" on storage.objects;
create policy "org_members_update_vcpc_data_objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vcpc-data'
  and exists (
    select 1
    from public.organization_members m
    where m.organization_id::text = split_part(storage.objects.name, '/', 1)
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
)
with check (
  bucket_id = 'vcpc-data'
  and exists (
    select 1
    from public.organization_members m
    where m.organization_id::text = split_part(storage.objects.name, '/', 1)
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  )
);
