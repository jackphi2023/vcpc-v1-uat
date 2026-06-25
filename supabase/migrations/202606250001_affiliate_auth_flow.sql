-- VCPC Affiliate authentication hardening for AFF-01 to AFF-05.
-- Run after 202606240001_vcpc_uat.sql.
-- Safe to run more than once.

alter table public.affiliates
  add column if not exists must_change_password boolean not null default true,
  add column if not exists temporary_password_issued_at bigint,
  add column if not exists password_changed_at bigint;

-- Existing ACTIVE affiliates must complete the first-password flow once.
update public.affiliates
set must_change_password = true
where must_change_password is null;

-- Emails are normalized to lowercase by the application. These indexes also
-- prevent duplicates that differ only by uppercase/lowercase characters.
create unique index if not exists affiliate_applications_email_lower_uidx
  on public.affiliate_applications (lower(email));

create unique index if not exists affiliates_email_lower_uidx
  on public.affiliates (lower(email));

-- Keep timestamps consistent for rows changed directly from server functions.
update public.affiliates
set updated_at = public.vcpc_now_ms()
where updated_at is null;

comment on column public.affiliates.must_change_password is
  'Server-controlled flag. TRUE until an approved affiliate replaces the temporary password.';

comment on column public.affiliates.temporary_password_issued_at is
  'Unix epoch milliseconds when the one-time temporary password was issued.';

comment on column public.affiliates.password_changed_at is
  'Unix epoch milliseconds when the affiliate completed the first password change.';
