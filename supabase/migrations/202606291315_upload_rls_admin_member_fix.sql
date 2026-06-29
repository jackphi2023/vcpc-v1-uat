-- Robust upload RLS policies for VCPC intake/admin uploads
-- Purpose:
-- 1) Allow authenticated active organization members to upload/read/write their org intake metadata and files.
-- 2) Allow VCPC platform admins/reviewers to upload supplementary data for any customer org.
-- 3) Avoid fragile policy subqueries that can fail when organization_members/platform_user_roles RLS is restricted.
--
-- Apply this SQL in Supabase SQL Editor for the production project.

insert into storage.buckets (id, name, public)
values ('vcpc-data', 'vcpc-data', false)
on conflict (id) do update set public = excluded.public;

-- Security-definer helpers bypass RLS on lookup tables while still using auth.uid().
create or replace function public.vcpc_is_platform_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_user_roles r
    where r.user_id = auth.uid()
      and r.role in ('admin','reviewer')
  );
$$;

create or replace function public.vcpc_is_active_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and coalesce(m.status, 'active') = 'active'
  );
$$;

grant execute on function public.vcpc_is_platform_reviewer() to authenticated;
grant execute on function public.vcpc_is_active_org_member(uuid) to authenticated;

alter table if exists public.dataset_versions enable row level security;
alter table if exists public.data_uploads enable row level security;
alter table if exists public.validation_issues enable row level security;
alter table if exists public.audit_logs enable row level security;

-- Replace older fragile policies if they exist.
drop policy if exists "org_members_select_dataset_versions" on public.dataset_versions;
drop policy if exists "org_members_insert_dataset_versions" on public.dataset_versions;
drop policy if exists "org_members_update_dataset_versions" on public.dataset_versions;
drop policy if exists "vcpc_upload_select_dataset_versions" on public.dataset_versions;
drop policy if exists "vcpc_upload_insert_dataset_versions" on public.dataset_versions;
drop policy if exists "vcpc_upload_update_dataset_versions" on public.dataset_versions;

create policy "vcpc_upload_select_dataset_versions"
on public.dataset_versions
for select
to authenticated
using (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(dataset_versions.organization_id)
);

create policy "vcpc_upload_insert_dataset_versions"
on public.dataset_versions
for insert
to authenticated
with check (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(dataset_versions.organization_id)
);

create policy "vcpc_upload_update_dataset_versions"
on public.dataset_versions
for update
to authenticated
using (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(dataset_versions.organization_id)
)
with check (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(dataset_versions.organization_id)
);

drop policy if exists "org_members_select_data_uploads" on public.data_uploads;
drop policy if exists "org_members_insert_data_uploads" on public.data_uploads;
drop policy if exists "org_members_update_data_uploads" on public.data_uploads;
drop policy if exists "org_members_delete_data_uploads" on public.data_uploads;
drop policy if exists "vcpc_upload_select_data_uploads" on public.data_uploads;
drop policy if exists "vcpc_upload_insert_data_uploads" on public.data_uploads;
drop policy if exists "vcpc_upload_update_data_uploads" on public.data_uploads;
drop policy if exists "vcpc_upload_delete_data_uploads" on public.data_uploads;

create policy "vcpc_upload_select_data_uploads"
on public.data_uploads
for select
to authenticated
using (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(data_uploads.organization_id)
);

create policy "vcpc_upload_insert_data_uploads"
on public.data_uploads
for insert
to authenticated
with check (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(data_uploads.organization_id)
);

create policy "vcpc_upload_update_data_uploads"
on public.data_uploads
for update
to authenticated
using (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(data_uploads.organization_id)
)
with check (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(data_uploads.organization_id)
);

create policy "vcpc_upload_delete_data_uploads"
on public.data_uploads
for delete
to authenticated
using (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(data_uploads.organization_id)
);

drop policy if exists "org_members_select_validation_issues" on public.validation_issues;
drop policy if exists "org_members_insert_validation_issues" on public.validation_issues;
drop policy if exists "org_members_update_validation_issues" on public.validation_issues;
drop policy if exists "vcpc_upload_select_validation_issues" on public.validation_issues;
drop policy if exists "vcpc_upload_insert_validation_issues" on public.validation_issues;
drop policy if exists "vcpc_upload_update_validation_issues" on public.validation_issues;

create policy "vcpc_upload_select_validation_issues"
on public.validation_issues
for select
to authenticated
using (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(validation_issues.organization_id)
);

create policy "vcpc_upload_insert_validation_issues"
on public.validation_issues
for insert
to authenticated
with check (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(validation_issues.organization_id)
);

create policy "vcpc_upload_update_validation_issues"
on public.validation_issues
for update
to authenticated
using (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(validation_issues.organization_id)
)
with check (
  public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(validation_issues.organization_id)
);

drop policy if exists "org_members_insert_audit_logs" on public.audit_logs;
drop policy if exists "vcpc_upload_insert_audit_logs" on public.audit_logs;

create policy "vcpc_upload_insert_audit_logs"
on public.audit_logs
for insert
to authenticated
with check (
  organization_id is null
  or public.vcpc_is_platform_reviewer()
  or public.vcpc_is_active_org_member(audit_logs.organization_id)
);

-- Storage: tenant path convention is <organization_id>/<engagement_id>/<dataset_or_folder>/<filename>.
-- Use a safe UUID cast guard so bad paths simply fail policy instead of raising cast errors.
create or replace function public.vcpc_storage_org_from_path(p_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_first text;
begin
  v_first := split_part(coalesce(p_name,''), '/', 1);
  if v_first ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_first::uuid;
  end if;
  return null;
end;
$$;

grant execute on function public.vcpc_storage_org_from_path(text) to authenticated;

drop policy if exists "org_members_select_vcpc_data_objects" on storage.objects;
drop policy if exists "org_members_insert_vcpc_data_objects" on storage.objects;
drop policy if exists "org_members_update_vcpc_data_objects" on storage.objects;
drop policy if exists "vcpc_upload_select_vcpc_data_objects" on storage.objects;
drop policy if exists "vcpc_upload_insert_vcpc_data_objects" on storage.objects;
drop policy if exists "vcpc_upload_update_vcpc_data_objects" on storage.objects;

create policy "vcpc_upload_select_vcpc_data_objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vcpc-data'
  and (
    public.vcpc_is_platform_reviewer()
    or public.vcpc_is_active_org_member(public.vcpc_storage_org_from_path(storage.objects.name))
  )
);

create policy "vcpc_upload_insert_vcpc_data_objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vcpc-data'
  and (
    public.vcpc_is_platform_reviewer()
    or public.vcpc_is_active_org_member(public.vcpc_storage_org_from_path(storage.objects.name))
  )
);

create policy "vcpc_upload_update_vcpc_data_objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vcpc-data'
  and (
    public.vcpc_is_platform_reviewer()
    or public.vcpc_is_active_org_member(public.vcpc_storage_org_from_path(storage.objects.name))
  )
)
with check (
  bucket_id = 'vcpc-data'
  and (
    public.vcpc_is_platform_reviewer()
    or public.vcpc_is_active_org_member(public.vcpc_storage_org_from_path(storage.objects.name))
  )
);
