-- VCPC V1 UAT - Supabase schema matching the current HTML/JS application
-- Run once in Supabase SQL Editor. Safe to re-run where possible.

create extension if not exists pgcrypto;

create or replace function public.vcpc_now_ms()
returns bigint language sql stable as $$
  select floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  name text,
  phone text,
  avatar_url text,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.platform_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','affiliate','reviewer','admin')),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.service_plans (
  code text primary key,
  product text not null check (product in ('bizhealth','strategy_os')),
  display_name text not null,
  price_vnd bigint not null,
  billing_type text not null check (billing_type in ('one_time','monthly')),
  active boolean not null default true,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

insert into public.service_plans(code,product,display_name,price_vnd,billing_type)
values
 ('BIZHEALTH_STANDARD','bizhealth','BizHealth Standard',24900000,'one_time'),
 ('BIZHEALTH_PREMIUM','bizhealth','BizHealth Premium',39900000,'one_time'),
 ('OS_LITE','strategy_os','BizOS Starter',7900000,'monthly'),
 ('OS_STANDARD','strategy_os','BizOS Growth',15900000,'monthly'),
 ('OS_PARTNER','strategy_os','BizOS Scale',28900000,'monthly')
on conflict(code) do update set
 product=excluded.product,display_name=excluded.display_name,price_vnd=excluded.price_vnd,
 billing_type=excluded.billing_type,active=true,updated_at=public.vcpc_now_ms();

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  industry text,
  size text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  logo_url text,
  primary_color text,
  login_title text,
  owner_id uuid not null references auth.users(id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','ARCHIVED')),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'viewer' check (role in ('owner','admin','finance','data_owner','manager','branch','branch_manager','viewer')),
  status text not null default 'active' check (status in ('pending','active','suspended','revoked')),
  allowed_modules text[] not null default '{}',
  branch_scope text[] not null default '{}',
  invited_at bigint,
  activated_at bigint,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms(),
  unique(organization_id,user_id),
  unique(organization_id,email)
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  quantity integer not null default 0,
  used integer not null default 0,
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  active boolean not null default true,
  starts_at bigint,
  expires_at bigint,
  created_by uuid references auth.users(id),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  product text not null check (product in ('bizhealth','strategy_os')),
  plan_code text not null references public.service_plans(code),
  billing_term integer not null default 1,
  state text not null default 'DRAFT' check (state in (
    'DRAFT','INTAKE','VALIDATING','DATA_INCOMPLETE','READY','SCOPE_CONFIRMED',
    'AWAITING_DEPOSIT','AWAITING_CONFIRMATION','BUILDING','AI_QA','VCPC_REVIEW',
    'PUBLISHED','PREVIEW','AWAITING_BALANCE','ACTIVE','ACTIVE_90D','DUE',
    'GRACE_READ_ONLY','READONLY','SUSPENDED','TERMINATED','ARCHIVED'
  )),
  monthly_price bigint not null default 0,
  base_amount bigint not null default 0,
  term_discount_percent numeric(5,2) not null default 0,
  term_discount_amount bigint not null default 0,
  promo_code text,
  promo_discount_percent numeric(5,2) not null default 0,
  promo_discount_amount bigint not null default 0,
  affiliate_code text,
  final_amount bigint not null default 0,
  deposit_percent numeric(5,2) not null default 20,
  deposit_amount bigint not null default 0,
  balance_amount bigint not null default 0,
  quote_locked_at bigint,
  deposit_paid_at bigint,
  final_paid_at bigint,
  data_approved_at bigint,
  preview_started_at bigint,
  preview_until bigint,
  service_started_at bigint,
  service_expires_at bigint,
  renewal_due_at bigint,
  intake jsonb not null default '{}'::jsonb,
  active_dataset_version_id uuid,
  active_dashboard_version_id uuid,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms(),
  unique(organization_id,plan_code,state) deferrable initially deferred
);
-- The deferrable unique above is intentionally dropped; multiple historical states/plans are valid.
alter table public.engagements drop constraint if exists engagements_organization_id_plan_code_state_key;

create table if not exists public.dashboard_instances (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references public.engagements(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_code text not null,
  plan_code text not null,
  name text not null default 'Dashboard',
  status text not null default 'WAITING' check (status in ('WAITING','BUILDING','REVIEW','PREVIEW','ACTIVE','READONLY','SUSPENDED','ARCHIVED')),
  active_version_id uuid,
  branding jsonb not null default '{}'::jsonb,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.dashboard_versions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dataset_version_id uuid,
  version text,
  version_no integer,
  title text not null default 'Dashboard điều hành',
  note text,
  prompt text,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','current','published','archived')),
  created_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  published_at bigint,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.dashboard_user_access (
  id uuid primary key default gen_random_uuid(),
  dashboard_instance_id uuid not null references public.dashboard_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  allowed_modules text[] not null default '{}',
  branch_scope text[] not null default '{}',
  status text not null default 'active' check (status in ('pending','active','suspended','revoked')),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms(),
  unique(dashboard_instance_id,user_id)
);

create table if not exists public.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'STAGING' check (status in ('STAGING','VALIDATING','READY_FOR_REVIEW','LIVE','REJECTED','ARCHIVED','ROLLED_BACK')),
  dqs_score integer not null default 0 check (dqs_score between 0 and 100),
  row_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  published_at bigint,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms(),
  unique(engagement_id,version)
);

create table if not exists public.data_uploads (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dataset_version_id uuid references public.dataset_versions(id) on delete set null,
  name text not null,
  file_name text,
  storage_path text,
  type text,
  mime_type text,
  size_bytes bigint not null default 0,
  status text not null default 'uploaded',
  dqs_score integer not null default 0,
  rows integer not null default 0,
  sheets integer not null default 0,
  issues integer not null default 0,
  uploaded_by text,
  uploaded_by_user uuid references auth.users(id),
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.validation_issues (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references public.dataset_versions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  severity text not null check (severity in ('CRITICAL','HIGH','MEDIUM','LOW')),
  code text,
  title text not null,
  detail text,
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  created_at bigint not null default public.vcpc_now_ms(),
  resolved_at bigint
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  instalment text not null check (instalment in ('deposit','final','renewal')),
  amount bigint not null,
  currency text not null default 'VND',
  status text not null default 'AWAITING_CONFIRMATION' check (status in ('CREATED','PENDING','AWAITING_CONFIRMATION','PAID','FAILED','CANCELLED')),
  provider text not null default 'bank_transfer',
  transaction_id text not null unique,
  reference text,
  plan_code text,
  proof_url text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  paid_at bigint,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.invoice_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  legal_name text,
  tax_id text,
  email text,
  amount bigint,
  currency text default 'VND',
  status text not null default 'REQUESTED' check (status in ('REQUESTED','ISSUED','CANCELLED')),
  invoice_no text,
  issued_at bigint,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references public.engagements(id) on delete cascade,
  promo_code_id uuid references public.promo_codes(id),
  code text not null,
  discount_percent numeric(5,2) not null,
  created_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null,
  type text,
  network text,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  reviewed_by uuid references auth.users(id),
  reviewed_at bigint,
  rejection_reason text,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  application_id uuid unique references public.affiliate_applications(id) on delete set null,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  code text not null unique,
  slug text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','REJECTED')),
  customer_discount_percent numeric(5,2) not null default 10,
  commission_rate numeric(5,2) not null default 35 check (commission_rate between 0 and 100),
  rate_is_manual boolean not null default false,
  successful_customers integer not null default 0,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null unique references public.engagements(id) on delete cascade,
  status text not null default 'REGISTERED' check (status in ('REGISTERED','QUALIFIED','CANCELLED')),
  created_at bigint not null default public.vcpc_now_ms(),
  qualified_at bigint
);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null unique references public.engagements(id) on delete cascade,
  payment_id uuid not null references public.payments(id),
  customer_name text,
  plan_code text,
  commission_base bigint not null,
  commission_rate numeric(5,2) not null,
  amount bigint not null,
  status text not null default 'PAYABLE' check (status in ('PENDING','PAYABLE','PAID','CANCELLED')),
  approved_at bigint,
  payout_due_at bigint,
  paid_at bigint,
  payout_reference text,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount bigint not null,
  status text not null default 'PENDING' check (status in ('PENDING','PAID','CANCELLED')),
  scheduled_for bigint,
  paid_at bigint,
  reference text,
  created_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dashboard_instance_id uuid references public.dashboard_instances(id) on delete cascade,
  hostname text not null unique,
  domain_type text not null default 'CUSTOM',
  status text not null default 'DNS_PENDING' check (status in ('DRAFT','DNS_PENDING','DNS_VERIFIED','SSL_PENDING','ACTIVE','FAILED','DISABLED')),
  verification_token text,
  login_title text,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.review_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  type text,
  status text default 'OPEN',
  assigned_to uuid references auth.users(id),
  payload jsonb default '{}'::jsonb,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  title text,
  status text default 'OPEN',
  payload jsonb default '{}'::jsonb,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  title text,
  severity text,
  status text default 'OPEN',
  payload jsonb default '{}'::jsonb,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.mi_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  title text,
  status text default 'DRAFT',
  payload jsonb default '{}'::jsonb,
  created_at bigint not null default public.vcpc_now_ms(),
  updated_at bigint not null default public.vcpc_now_ms()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  at bigint not null default public.vcpc_now_ms(),
  created_at bigint not null default public.vcpc_now_ms()
);

-- Generic update timestamp
create or replace function public.vcpc_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = public.vcpc_now_ms(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['profiles','platform_user_roles','service_plans','organizations','organization_members','promo_codes','engagements','dashboard_instances','dashboard_versions','dashboard_user_access','dataset_versions','data_uploads','payments','invoice_requests','affiliate_applications','affiliates','affiliate_commissions','tenant_domains','review_tasks','recommendations','alert_events','mi_items']
  loop
    begin execute format('create trigger %I_touch before update on public.%I for each row execute function public.vcpc_touch_updated_at()',t,t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- Create profile/role for every Supabase auth user.
create or replace function public.vcpc_handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,name,phone)
  values(new.id,lower(new.email),coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''))
  on conflict(id) do update set email=excluded.email,full_name=coalesce(nullif(excluded.full_name,''),profiles.full_name),name=coalesce(nullif(excluded.name,''),profiles.name),phone=coalesce(nullif(excluded.phone,''),profiles.phone),updated_at=public.vcpc_now_ms();
  insert into public.platform_user_roles(user_id,role) values(new.id,'user') on conflict(user_id) do nothing;
  return new;
end; $$;

do $$ begin
  create trigger vcpc_auth_user_created after insert or update of email,raw_user_meta_data on auth.users
  for each row execute function public.vcpc_handle_new_auth_user();
exception when duplicate_object then null; end $$;

create or replace function public.vcpc_is_staff()
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(auth.jwt()->>'role','')='service_role'
 or exists(select 1 from public.platform_user_roles where user_id=auth.uid() and role in ('admin','reviewer'));
$$;

create or replace function public.vcpc_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(auth.jwt()->>'role','')='service_role'
 or exists(select 1 from public.platform_user_roles where user_id=auth.uid() and role='admin');
$$;

create or replace function public.vcpc_is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.vcpc_is_staff() or exists(
  select 1 from public.organization_members
  where organization_id=p_org and user_id=auth.uid() and status='active'
 );
$$;

create or replace function public.vcpc_can_manage_org(p_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.vcpc_is_staff() or exists(
  select 1 from public.organization_members
  where organization_id=p_org and user_id=auth.uid() and status='active' and role in ('owner','admin','finance','data_owner')
 );
$$;

create or replace function public.vcpc_is_affiliate(p_affiliate uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.vcpc_is_staff() or exists(select 1 from public.affiliates where id=p_affiliate and user_id=auth.uid() and status='ACTIVE');
$$;

-- Create dashboard shell for every engagement.
create or replace function public.vcpc_create_dashboard_shell()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.dashboard_instances(engagement_id,organization_id,service_code,plan_code,name,status)
 values(new.id,new.organization_id,case when new.product='strategy_os' then 'BIZOS' else 'BIZHEALTH' end,new.plan_code,
        case when new.product='strategy_os' then 'BizOS Dashboard' else 'BizHealth Dashboard' end,'WAITING')
 on conflict(engagement_id) do nothing;
 return new;
end; $$;

do $$ begin
 create trigger vcpc_engagement_dashboard after insert on public.engagements
 for each row execute function public.vcpc_create_dashboard_shell();
exception when duplicate_object then null; end $$;

-- Validate state transitions even when a client calls PostgREST directly.
create or replace function public.vcpc_validate_engagement_transition()
returns trigger language plpgsql security definer set search_path=public as $$
declare allowed boolean:=false; staff boolean:=public.vcpc_is_staff();
begin
 if new.state=old.state then return new; end if;
 if staff then
   allowed := case old.state
    when 'DRAFT' then new.state in ('INTAKE','ARCHIVED')
    when 'INTAKE' then new.state in ('VALIDATING','DATA_INCOMPLETE','READY','ARCHIVED')
    when 'VALIDATING' then new.state in ('DATA_INCOMPLETE','READY','ARCHIVED')
    when 'DATA_INCOMPLETE' then new.state in ('VALIDATING','READY','ARCHIVED')
    when 'READY' then new.state in ('SCOPE_CONFIRMED','ARCHIVED')
    when 'SCOPE_CONFIRMED' then new.state in ('AWAITING_DEPOSIT','AWAITING_CONFIRMATION','ARCHIVED')
    when 'AWAITING_DEPOSIT' then new.state in ('AWAITING_CONFIRMATION','BUILDING','ARCHIVED')
    when 'AWAITING_CONFIRMATION' then new.state in ('AWAITING_DEPOSIT','BUILDING','PREVIEW','ACTIVE','ACTIVE_90D','ARCHIVED')
    when 'BUILDING' then new.state in ('AI_QA','ARCHIVED')
    when 'AI_QA' then new.state in ('VCPC_REVIEW','BUILDING','ARCHIVED')
    when 'VCPC_REVIEW' then new.state in ('PUBLISHED','BUILDING','ARCHIVED')
    when 'PUBLISHED' then new.state in ('PREVIEW','ARCHIVED')
    when 'PREVIEW' then new.state in ('AWAITING_BALANCE','ACTIVE','ACTIVE_90D','ARCHIVED')
    when 'AWAITING_BALANCE' then new.state in ('ACTIVE','ACTIVE_90D','ARCHIVED')
    when 'ACTIVE' then new.state in ('DUE','READONLY','SUSPENDED','TERMINATED','ARCHIVED')
    when 'ACTIVE_90D' then new.state in ('DUE','READONLY','SUSPENDED','TERMINATED','ARCHIVED')
    when 'DUE' then new.state in ('ACTIVE','ACTIVE_90D','GRACE_READ_ONLY','READONLY','SUSPENDED','ARCHIVED')
    when 'GRACE_READ_ONLY' then new.state in ('ACTIVE','ACTIVE_90D','SUSPENDED','ARCHIVED')
    when 'READONLY' then new.state in ('ACTIVE','ACTIVE_90D','SUSPENDED','ARCHIVED')
    when 'SUSPENDED' then new.state in ('ACTIVE','ACTIVE_90D','TERMINATED','ARCHIVED')
    when 'TERMINATED' then new.state in ('ARCHIVED')
    else false end;
 else
   allowed := case old.state
    when 'DRAFT' then new.state='INTAKE'
    when 'INTAKE' then new.state in ('VALIDATING','DATA_INCOMPLETE','READY')
    when 'VALIDATING' then new.state in ('DATA_INCOMPLETE','READY')
    when 'DATA_INCOMPLETE' then new.state in ('VALIDATING','READY')
    when 'READY' then new.state='SCOPE_CONFIRMED'
    when 'SCOPE_CONFIRMED' then new.state in ('AWAITING_DEPOSIT','AWAITING_CONFIRMATION')
    when 'AWAITING_DEPOSIT' then new.state='AWAITING_CONFIRMATION'
    else false end;
 end if;
 if not allowed then raise exception 'VCPC_INVALID_STATE_TRANSITION:%->%',old.state,new.state; end if;
 return new;
end; $$;

do $$ begin
 create trigger vcpc_engagement_state_guard before update of state on public.engagements
 for each row execute function public.vcpc_validate_engagement_transition();
exception when duplicate_object then null; end $$;

create or replace function public.vcpc_term_discount(p_term integer)
returns numeric language sql immutable as $$
 select case when p_term=6 then 10 when p_term=12 then 15 else 0 end::numeric;
$$;

-- Transactional account/org/engagement completion. Reuses the first owned organization.
create or replace function public.vcpc_complete_signup(
 p_organization_name text,
 p_tax_id text,
 p_service_code text,
 p_plan_code text,
 p_billing_term integer,
 p_affiliate_code text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 uid uuid:=auth.uid(); org public.organizations; pl public.service_plans; eng public.engagements;
 term integer; tdisc numeric; base bigint; after_term bigint; affiliate public.affiliates; coupon_pct numeric:=0;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into pl from public.service_plans where code=p_plan_code and active=true;
 if pl.code is null then raise exception 'INVALID_PLAN'; end if;
 term := case when pl.billing_type='monthly' then coalesce(p_billing_term,3) else 1 end;
 if pl.billing_type='monthly' and term not in (3,6,12) then raise exception 'INVALID_TERM'; end if;
 select o.* into org from public.organizations o join public.organization_members m on m.organization_id=o.id
 where m.user_id=uid and m.role='owner' and m.status='active' order by o.created_at limit 1;
 if org.id is null then
   insert into public.organizations(name,tax_id,owner_id,contact_email)
   select coalesce(nullif(trim(p_organization_name),''),'Tổ chức của tôi'),nullif(trim(p_tax_id),''),uid,email from auth.users where id=uid
   returning * into org;
   insert into public.organization_members(organization_id,user_id,name,email,role,status,allowed_modules,activated_at)
   select org.id,uid,coalesce(raw_user_meta_data->>'full_name',''),email,'owner','active',array['dashboard','data','mi','alerts','actions','team','billing','settings'],public.vcpc_now_ms()
   from auth.users where id=uid on conflict do nothing;
 end if;
 select * into eng from public.engagements where organization_id=org.id and plan_code=pl.code and state not in ('ARCHIVED','TERMINATED') order by created_at desc limit 1;
 if eng.id is not null then
   return jsonb_build_object('ok',true,'idempotent',true,'organization_id',org.id,'engagement_id',eng.id);
 end if;
 tdisc:=public.vcpc_term_discount(term);
 base:=case when pl.billing_type='monthly' then pl.price_vnd*term else pl.price_vnd end;
 after_term:=round(base*(1-tdisc/100.0));
 if nullif(upper(trim(p_affiliate_code)),'') is not null then
   select * into affiliate from public.affiliates where code=upper(trim(p_affiliate_code)) and status='ACTIVE';
   if affiliate.id is not null then coupon_pct:=affiliate.customer_discount_percent; end if;
 end if;
 insert into public.engagements(
  organization_id,owner_id,product,plan_code,billing_term,state,monthly_price,base_amount,
  term_discount_percent,term_discount_amount,affiliate_code,promo_discount_percent,promo_discount_amount,
  final_amount,deposit_percent,deposit_amount,balance_amount
 ) values(
  org.id,uid,pl.product,pl.code,term,'DRAFT',pl.price_vnd,base,tdisc,base-after_term,
  case when affiliate.id is not null then affiliate.code end,coupon_pct,
  after_term-round(after_term*(1-coupon_pct/100.0)),round(after_term*(1-coupon_pct/100.0)),20,
  round(round(after_term*(1-coupon_pct/100.0))*0.20),round(round(after_term*(1-coupon_pct/100.0))*0.80)
 ) returning * into eng;
 if affiliate.id is not null then
   insert into public.affiliate_referrals(affiliate_id,organization_id,engagement_id,status)
   values(affiliate.id,org.id,eng.id,'REGISTERED') on conflict(engagement_id) do nothing;
 end if;
 insert into public.audit_logs(event,payload,user_id,organization_id)
 values('USER_SIGNUP_COMPLETE',jsonb_build_object('service_code',p_service_code,'plan_code',p_plan_code,'billing_term',term),uid,org.id);
 return jsonb_build_object('ok',true,'organization_id',org.id,'engagement_id',eng.id);
end; $$;

create or replace function public.vcpc_next_tuesday_ms()
returns bigint language sql stable as $$
 select floor(extract(epoch from (
   date_trunc('day',now()) + (((2-extract(dow from now())::integer+7)%7 + case when extract(dow from now())::integer=2 then 7 else 0 end)::text||' days')::interval + interval '9 hours'
 ))*1000)::bigint;
$$;

create or replace function public.vcpc_admin_confirm_payment(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare pay public.payments; eng public.engagements; aff public.affiliates; ref public.affiliate_referrals;
 expiry bigint; base bigint; rate numeric; comm bigint; new_count integer; org_name text;
begin
 if not public.vcpc_is_staff() then raise exception 'STAFF_ONLY'; end if;
 select * into pay from public.payments where id=p_payment_id for update;
 if pay.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if pay.status='PAID' then return jsonb_build_object('ok',true,'idempotent',true); end if;
 select * into eng from public.engagements where id=pay.engagement_id for update;
 if eng.id is null then raise exception 'ENGAGEMENT_NOT_FOUND'; end if;
 if eng.quote_locked_at is null and pay.instalment in ('deposit','final') then raise exception 'QUOTE_NOT_LOCKED'; end if;
 if pay.instalment='deposit' and pay.amount<>eng.deposit_amount then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
 if pay.instalment='final' and pay.amount<>eng.balance_amount then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
 update public.payments set status='PAID',paid_at=public.vcpc_now_ms() where id=pay.id;
 if pay.instalment='deposit' then
   if eng.state not in ('AWAITING_DEPOSIT','AWAITING_CONFIRMATION','SCOPE_CONFIRMED') then raise exception 'INVALID_DEPOSIT_STATE:%',eng.state; end if;
   if eng.state='SCOPE_CONFIRMED' then
     update public.engagements set state='AWAITING_DEPOSIT' where id=eng.id;
   end if;
   update public.engagements set state='BUILDING',deposit_paid_at=public.vcpc_now_ms(),quote_locked_at=coalesce(quote_locked_at,public.vcpc_now_ms()) where id=eng.id;
   update public.dashboard_instances set status='BUILDING' where engagement_id=eng.id;
 elsif pay.instalment='final' then
   if eng.state not in ('PREVIEW','AWAITING_BALANCE','AWAITING_CONFIRMATION') then raise exception 'INVALID_FINAL_STATE:%',eng.state; end if;
   expiry:=case when eng.product='strategy_os' then public.vcpc_now_ms()+(eng.billing_term::bigint*30*86400000) else public.vcpc_now_ms()+(90::bigint*86400000) end;
   update public.engagements set state=case when eng.product='strategy_os' then 'ACTIVE' else 'ACTIVE_90D' end,
      final_paid_at=public.vcpc_now_ms(),service_started_at=public.vcpc_now_ms(),service_expires_at=expiry,renewal_due_at=expiry where id=eng.id;
   update public.dashboard_instances set status='ACTIVE' where engagement_id=eng.id;
   if eng.promo_code is not null and not exists(select 1 from public.coupon_redemptions where engagement_id=eng.id) then
     insert into public.coupon_redemptions(engagement_id,promo_code_id,code,discount_percent)
     select eng.id,p.id,p.code,eng.promo_discount_percent from public.promo_codes p where p.code=eng.promo_code and p.active=true;
     update public.promo_codes set used=used+1 where code=eng.promo_code and active=true;
   end if;
   select * into ref from public.affiliate_referrals where engagement_id=eng.id for update;
   if ref.id is not null and not exists(select 1 from public.affiliate_commissions where engagement_id=eng.id) then
     select * into aff from public.affiliates where id=ref.affiliate_id for update;
     select name into org_name from public.organizations where id=eng.organization_id;
     base:=case when eng.product='strategy_os' then round((eng.final_amount::numeric/eng.billing_term)*least(eng.billing_term,3)) else eng.final_amount end;
     new_count:=aff.successful_customers+1;
     rate:=case when aff.rate_is_manual then aff.commission_rate when new_count>=5 then 40 else 35 end;
     comm:=round(base*rate/100.0);
     insert into public.affiliate_commissions(affiliate_id,organization_id,engagement_id,payment_id,customer_name,plan_code,commission_base,commission_rate,amount,status,approved_at,payout_due_at)
     values(aff.id,eng.organization_id,eng.id,pay.id,org_name,eng.plan_code,base,rate,comm,'PAYABLE',public.vcpc_now_ms(),public.vcpc_next_tuesday_ms());
     update public.affiliate_referrals set status='QUALIFIED',qualified_at=public.vcpc_now_ms() where id=ref.id;
     update public.affiliates set successful_customers=new_count,commission_rate=rate where id=aff.id;
   end if;
 elsif pay.instalment='renewal' then
   expiry:=greatest(coalesce(eng.service_expires_at,public.vcpc_now_ms()),public.vcpc_now_ms())+(eng.billing_term::bigint*30*86400000);
   update public.engagements set state=case when eng.product='strategy_os' then 'ACTIVE' else 'ACTIVE_90D' end,service_expires_at=expiry,renewal_due_at=expiry where id=eng.id;
   update public.dashboard_instances set status='ACTIVE' where engagement_id=eng.id;
 end if;
 insert into public.audit_logs(event,payload,user_id,organization_id)
 values('PAYMENT_CONFIRMED',jsonb_build_object('payment_id',pay.id,'instalment',pay.instalment,'amount',pay.amount),auth.uid(),eng.organization_id);
 return jsonb_build_object('ok',true,'engagement_id',eng.id);
end; $$;

create or replace function public.vcpc_admin_transition_engagement(p_engagement_id uuid,p_state text,p_note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare eng public.engagements;
begin
 if not public.vcpc_is_staff() then raise exception 'STAFF_ONLY'; end if;
 select * into eng from public.engagements where id=p_engagement_id for update;
 if eng.id is null then raise exception 'ENGAGEMENT_NOT_FOUND'; end if;
 update public.engagements set state=upper(p_state) where id=eng.id;
 update public.dashboard_instances set status=case upper(p_state)
   when 'BUILDING' then 'BUILDING' when 'AI_QA' then 'REVIEW' when 'VCPC_REVIEW' then 'REVIEW'
   when 'PREVIEW' then 'PREVIEW' when 'ACTIVE' then 'ACTIVE' when 'ACTIVE_90D' then 'ACTIVE'
   when 'READONLY' then 'READONLY' when 'SUSPENDED' then 'SUSPENDED' when 'ARCHIVED' then 'ARCHIVED' else status end
 where engagement_id=eng.id;
 insert into public.audit_logs(event,payload,user_id,organization_id)
 values('ENGAGEMENT_STATE_CHANGED',jsonb_build_object('from',eng.state,'to',upper(p_state),'note',p_note),auth.uid(),eng.organization_id);
 return true;
end; $$;

create or replace function public.vcpc_admin_publish_dashboard(p_engagement_id uuid,p_title text,p_config jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare eng public.engagements; vid uuid; vno integer;
begin
 if not public.vcpc_is_staff() then raise exception 'STAFF_ONLY'; end if;
 select * into eng from public.engagements where id=p_engagement_id for update;
 if eng.id is null then raise exception 'ENGAGEMENT_NOT_FOUND'; end if;
 if eng.state not in ('VCPC_REVIEW','PUBLISHED') then raise exception 'INVALID_PUBLISH_STATE:%',eng.state; end if;
 select coalesce(max(version_no),0)+1 into vno from public.dashboard_versions where engagement_id=eng.id;
 update public.dashboard_versions set status='archived' where engagement_id=eng.id and status in ('current','published');
 insert into public.dashboard_versions(engagement_id,organization_id,version,version_no,title,config,status,created_by,published_by,published_at)
 values(eng.id,eng.organization_id,'v'||vno,vno,coalesce(nullif(p_title,''),'Dashboard điều hành'),coalesce(p_config,'{}'::jsonb),'published',auth.uid(),auth.uid(),public.vcpc_now_ms())
 returning id into vid;
 update public.engagements set state='PUBLISHED',active_dashboard_version_id=vid where id=eng.id;
 update public.engagements set state='PREVIEW',preview_started_at=public.vcpc_now_ms(),preview_until=public.vcpc_now_ms()+48*3600000 where id=eng.id;
 update public.dashboard_instances set status='PREVIEW',active_version_id=vid where engagement_id=eng.id;
 insert into public.dashboard_user_access(dashboard_instance_id,organization_id,user_id,role,status,created_at,updated_at)
 select di.id,eng.organization_id,m.user_id,m.role,'active',public.vcpc_now_ms(),public.vcpc_now_ms()
 from public.dashboard_instances di join public.organization_members m on m.organization_id=eng.organization_id
 where di.engagement_id=eng.id and m.user_id is not null and m.status='active'
 on conflict(dashboard_instance_id,user_id) do update set role=excluded.role,status='active',updated_at=public.vcpc_now_ms();
 insert into public.audit_logs(event,payload,user_id,organization_id)
 values('DASHBOARD_PUBLISHED',jsonb_build_object('engagement_id',eng.id,'dashboard_version_id',vid,'preview_hours',48),auth.uid(),eng.organization_id);
 return vid;
end; $$;

create or replace function public.vcpc_admin_mark_commission_paid(p_commission_id uuid,p_reference text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare c public.affiliate_commissions;
begin
 if not public.vcpc_is_admin() then raise exception 'ADMIN_ONLY'; end if;
 select * into c from public.affiliate_commissions where id=p_commission_id for update;
 if c.id is null then raise exception 'COMMISSION_NOT_FOUND'; end if;
 update public.affiliate_commissions set status='PAID',paid_at=public.vcpc_now_ms(),payout_reference=p_reference where id=c.id;
 insert into public.audit_logs(event,payload,user_id,organization_id)
 values('AFFILIATE_COMMISSION_PAID',jsonb_build_object('commission_id',c.id,'amount',c.amount,'reference',p_reference),auth.uid(),c.organization_id);
 return true;
end; $$;

create or replace function public.vcpc_admin_set_affiliate_rate(p_affiliate_id uuid,p_rate numeric)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.vcpc_is_admin() then raise exception 'ADMIN_ONLY'; end if;
 if p_rate<0 or p_rate>100 then raise exception 'INVALID_RATE'; end if;
 update public.affiliates set commission_rate=p_rate,rate_is_manual=true where id=p_affiliate_id;
 insert into public.audit_logs(event,payload,user_id)
 values('AFFILIATE_RATE_CHANGED',jsonb_build_object('affiliate_id',p_affiliate_id,'rate',p_rate),auth.uid());
 return true;
end; $$;

create or replace function public.vcpc_run_lifecycle_maintenance()
returns jsonb language plpgsql security definer set search_path=public as $$
declare n_preview integer; n_due integer; n_readonly integer; n_archived integer; nowms bigint:=public.vcpc_now_ms();
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' and not public.vcpc_is_admin() then raise exception 'ADMIN_ONLY'; end if;
 update public.engagements set state='AWAITING_BALANCE' where state='PREVIEW' and preview_until is not null and preview_until<=nowms;
 get diagnostics n_preview=row_count;
 update public.dashboard_instances di set status='SUSPENDED' from public.engagements e where di.engagement_id=e.id and e.state='AWAITING_BALANCE';
 update public.engagements set state='DUE' where state in ('ACTIVE','ACTIVE_90D') and service_expires_at is not null and service_expires_at<=nowms;
 get diagnostics n_due=row_count;
 update public.engagements set state='GRACE_READ_ONLY' where state='DUE' and service_expires_at is not null and service_expires_at+3*86400000<=nowms;
 get diagnostics n_readonly=row_count;
 update public.engagements set state='SUSPENDED' where state='GRACE_READ_ONLY' and service_expires_at is not null and service_expires_at+7*86400000<=nowms;
 update public.dashboard_instances di set status='SUSPENDED' from public.engagements e where di.engagement_id=e.id and e.state='SUSPENDED';
 update public.engagements set state='ARCHIVED' where state='AWAITING_BALANCE' and preview_until is not null and preview_until+7*86400000<=nowms;
 get diagnostics n_archived=row_count;
 return jsonb_build_object('preview_expired',n_preview,'became_due',n_due,'became_readonly',n_readonly,'archived_unpaid',n_archived);
end; $$;


-- Publish a reviewed STAGING dataset and preserve the previous LIVE version.
create or replace function public.vcpc_admin_publish_dataset(p_dataset_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare ds public.dataset_versions; blockers integer;
begin
 if not public.vcpc_is_staff() then raise exception 'STAFF_ONLY'; end if;
 select * into ds from public.dataset_versions where id=p_dataset_id for update;
 if ds.id is null then raise exception 'DATASET_NOT_FOUND'; end if;
 select count(*) into blockers from public.validation_issues where dataset_version_id=ds.id and status='OPEN' and severity in ('CRITICAL','HIGH');
 if blockers>0 then raise exception 'DATASET_BLOCKED:%',blockers; end if;
 update public.dataset_versions set status='ARCHIVED' where engagement_id=ds.engagement_id and status='LIVE' and id<>ds.id;
 update public.dataset_versions set status='LIVE',published_by=auth.uid(),published_at=public.vcpc_now_ms() where id=ds.id;
 update public.engagements set active_dataset_version_id=ds.id,data_approved_at=public.vcpc_now_ms() where id=ds.engagement_id;
 insert into public.audit_logs(event,payload,user_id,organization_id)
 values('DATASET_PUBLISHED',jsonb_build_object('dataset_version_id',ds.id,'version',ds.version),auth.uid(),ds.organization_id);
 return true;
end; $$;

create or replace function public.vcpc_admin_rollback_dataset(p_engagement_id uuid,p_dataset_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare ds public.dataset_versions;
begin
 if not public.vcpc_is_staff() then raise exception 'STAFF_ONLY'; end if;
 select * into ds from public.dataset_versions where id=p_dataset_id and engagement_id=p_engagement_id for update;
 if ds.id is null then raise exception 'DATASET_NOT_FOUND'; end if;
 update public.dataset_versions set status='ARCHIVED' where engagement_id=p_engagement_id and status='LIVE' and id<>ds.id;
 update public.dataset_versions set status='LIVE',published_by=auth.uid(),published_at=public.vcpc_now_ms() where id=ds.id;
 update public.engagements set active_dataset_version_id=ds.id where id=p_engagement_id;
 insert into public.audit_logs(event,payload,user_id,organization_id)
 values('DATASET_ROLLED_BACK',jsonb_build_object('dataset_version_id',ds.id,'version',ds.version),auth.uid(),ds.organization_id);
 return true;
end; $$;

-- Storage bucket for customer uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vcpc-data','vcpc-data',false,52428800,array['text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/pdf'])
on conflict(id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.platform_user_roles enable row level security;
alter table public.service_plans enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.promo_codes enable row level security;
alter table public.engagements enable row level security;
alter table public.dashboard_instances enable row level security;
alter table public.dashboard_versions enable row level security;
alter table public.dashboard_user_access enable row level security;
alter table public.dataset_versions enable row level security;
alter table public.data_uploads enable row level security;
alter table public.validation_issues enable row level security;
alter table public.payments enable row level security;
alter table public.invoice_requests enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.affiliate_applications enable row level security;
alter table public.affiliates enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.review_tasks enable row level security;
alter table public.recommendations enable row level security;
alter table public.alert_events enable row level security;
alter table public.mi_items enable row level security;
alter table public.audit_logs enable row level security;

-- Drop policies before recreate for repeatability.
do $$ declare r record; begin
 for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and policyname like 'vcpc_%' loop
  execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
 end loop;
end $$;

create policy vcpc_profiles_select on public.profiles for select to authenticated using (id=auth.uid() or public.vcpc_is_staff());
create policy vcpc_profiles_update on public.profiles for update to authenticated using (id=auth.uid() or public.vcpc_is_staff()) with check (id=auth.uid() or public.vcpc_is_staff());
create policy vcpc_roles_select on public.platform_user_roles for select to authenticated using (user_id=auth.uid() or public.vcpc_is_staff());
create policy vcpc_plans_select on public.service_plans for select to anon,authenticated using (active=true or public.vcpc_is_staff());
create policy vcpc_org_select on public.organizations for select to authenticated using (public.vcpc_is_org_member(id));
create policy vcpc_org_update on public.organizations for update to authenticated using (public.vcpc_can_manage_org(id)) with check (public.vcpc_can_manage_org(id));
create policy vcpc_members_select on public.organization_members for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_members_insert on public.organization_members for insert to authenticated with check (public.vcpc_can_manage_org(organization_id));
create policy vcpc_members_update on public.organization_members for update to authenticated using (public.vcpc_can_manage_org(organization_id)) with check (public.vcpc_can_manage_org(organization_id));
create policy vcpc_members_delete on public.organization_members for delete to authenticated using (public.vcpc_can_manage_org(organization_id));
create policy vcpc_promo_select on public.promo_codes for select to authenticated using ((active=true and (expires_at is null or expires_at>public.vcpc_now_ms()) and (quantity=0 or used<quantity)) or public.vcpc_is_staff());
create policy vcpc_promo_admin_all on public.promo_codes for all to authenticated using (public.vcpc_is_admin()) with check (public.vcpc_is_admin());
create policy vcpc_eng_select on public.engagements for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_eng_insert on public.engagements for insert to authenticated with check (public.vcpc_can_manage_org(organization_id));
create policy vcpc_eng_update on public.engagements for update to authenticated using (public.vcpc_can_manage_org(organization_id)) with check (public.vcpc_can_manage_org(organization_id));
create policy vcpc_dash_instance_select on public.dashboard_instances for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_dash_instance_staff on public.dashboard_instances for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
create policy vcpc_dash_versions_select on public.dashboard_versions for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_dash_versions_staff on public.dashboard_versions for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
create policy vcpc_dash_access_select on public.dashboard_user_access for select to authenticated using (user_id=auth.uid() or public.vcpc_can_manage_org(organization_id));
create policy vcpc_dash_access_manage on public.dashboard_user_access for all to authenticated using (public.vcpc_can_manage_org(organization_id)) with check (public.vcpc_can_manage_org(organization_id));
create policy vcpc_dataset_select on public.dataset_versions for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_dataset_write on public.dataset_versions for all to authenticated using (public.vcpc_can_manage_org(organization_id)) with check (public.vcpc_can_manage_org(organization_id));
create policy vcpc_upload_select on public.data_uploads for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_upload_write on public.data_uploads for all to authenticated using (public.vcpc_can_manage_org(organization_id)) with check (public.vcpc_can_manage_org(organization_id));
create policy vcpc_issues_select on public.validation_issues for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_issues_write on public.validation_issues for all to authenticated using (public.vcpc_can_manage_org(organization_id)) with check (public.vcpc_can_manage_org(organization_id));
create policy vcpc_pay_select on public.payments for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_pay_insert on public.payments for insert to authenticated with check (public.vcpc_is_org_member(organization_id));
create policy vcpc_pay_admin_update on public.payments for update to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
create policy vcpc_invoice_select on public.invoice_requests for select to authenticated using (public.vcpc_is_org_member(organization_id));
create policy vcpc_invoice_insert on public.invoice_requests for insert to authenticated with check (public.vcpc_is_org_member(organization_id));
create policy vcpc_invoice_admin_update on public.invoice_requests for update to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
create policy vcpc_coupon_select on public.coupon_redemptions for select to authenticated using (exists(select 1 from public.engagements e where e.id=engagement_id and public.vcpc_is_org_member(e.organization_id)));
create policy vcpc_aff_app_select on public.affiliate_applications for select to authenticated using (lower(email)=lower(coalesce(auth.jwt()->>'email','')) or public.vcpc_is_staff());
create policy vcpc_affiliate_select on public.affiliates for select to authenticated using (user_id=auth.uid() or public.vcpc_is_staff());
create policy vcpc_affiliate_staff on public.affiliates for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
create policy vcpc_ref_select on public.affiliate_referrals for select to authenticated using (public.vcpc_is_affiliate(affiliate_id) or public.vcpc_is_org_member(organization_id));
create policy vcpc_comm_select on public.affiliate_commissions for select to authenticated using (public.vcpc_is_affiliate(affiliate_id) or public.vcpc_is_staff());
create policy vcpc_payout_select on public.affiliate_payouts for select to authenticated using (public.vcpc_is_affiliate(affiliate_id) or public.vcpc_is_staff());
create policy vcpc_tenant_public_select on public.tenant_domains for select to anon,authenticated using (status='ACTIVE' or public.vcpc_is_staff());
create policy vcpc_tenant_staff on public.tenant_domains for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
create policy vcpc_review_select on public.review_tasks for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id));
create policy vcpc_review_staff on public.review_tasks for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
create policy vcpc_rec_select on public.recommendations for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id));
create policy vcpc_rec_write on public.recommendations for all to authenticated using (organization_id is null or public.vcpc_can_manage_org(organization_id)) with check (organization_id is null or public.vcpc_can_manage_org(organization_id));
create policy vcpc_alert_select on public.alert_events for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id));
create policy vcpc_alert_write on public.alert_events for all to authenticated using (organization_id is null or public.vcpc_can_manage_org(organization_id)) with check (organization_id is null or public.vcpc_can_manage_org(organization_id));
create policy vcpc_mi_select on public.mi_items for select to authenticated using (organization_id is null or public.vcpc_is_org_member(organization_id));
create policy vcpc_mi_write on public.mi_items for all to authenticated using (public.vcpc_is_staff()) with check (public.vcpc_is_staff());
create policy vcpc_audit_select on public.audit_logs for select to authenticated using (public.vcpc_is_staff() or organization_id is null or public.vcpc_is_org_member(organization_id));
create policy vcpc_audit_insert on public.audit_logs for insert to authenticated with check (user_id=auth.uid() or user_id is null);

-- Storage policies: tenant path must start with organization UUID.
do $$ begin
 create policy vcpc_storage_read on storage.objects for select to authenticated using (
   bucket_id='vcpc-data' and exists(select 1 from public.organization_members m where m.organization_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.status='active')
 );
exception when duplicate_object then null; end $$;
do $$ begin
 create policy vcpc_storage_insert on storage.objects for insert to authenticated with check (
   bucket_id='vcpc-data' and exists(select 1 from public.organization_members m where m.organization_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','finance','data_owner'))
 );
exception when duplicate_object then null; end $$;
do $$ begin
 create policy vcpc_storage_update on storage.objects for update to authenticated using (
   bucket_id='vcpc-data' and exists(select 1 from public.organization_members m where m.organization_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','finance','data_owner'))
 );
exception when duplicate_object then null; end $$;

-- RPC grants
grant execute on function public.vcpc_complete_signup(text,text,text,text,integer,text) to authenticated;
grant execute on function public.vcpc_admin_confirm_payment(uuid) to authenticated,service_role;
grant execute on function public.vcpc_admin_transition_engagement(uuid,text,text) to authenticated,service_role;
grant execute on function public.vcpc_admin_publish_dashboard(uuid,text,jsonb) to authenticated,service_role;
grant execute on function public.vcpc_admin_mark_commission_paid(uuid,text) to authenticated,service_role;
grant execute on function public.vcpc_admin_set_affiliate_rate(uuid,numeric) to authenticated,service_role;
grant execute on function public.vcpc_run_lifecycle_maintenance() to authenticated,service_role;
grant execute on function public.vcpc_admin_publish_dataset(uuid) to authenticated,service_role;
grant execute on function public.vcpc_admin_rollback_dataset(uuid,uuid) to authenticated,service_role;

-- Basic table grants; RLS remains authoritative.
grant usage on schema public to anon,authenticated;
grant select on public.service_plans to anon,authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;

-- Optional one-time bootstrap: the first signed-in user may promote themself to admin.
create or replace function public.vcpc_bootstrap_first_admin()
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if exists(select 1 from public.platform_user_roles where role='admin') then return false; end if;
 update public.platform_user_roles set role='admin' where user_id=auth.uid();
 insert into public.audit_logs(event,payload,user_id,at) values('BOOTSTRAP_FIRST_ADMIN','{}'::jsonb,auth.uid(),public.vcpc_now_ms());
 return true;
end; $$;
grant execute on function public.vcpc_bootstrap_first_admin() to authenticated;


-- Secure quote calculation. Customers cannot directly change financial fields.
create or replace function public.vcpc_apply_quote(
  p_engagement_id uuid,
  p_code text default null,
  p_lock boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  eng public.engagements;
  pl public.service_plans;
  promo public.promo_codes;
  aff public.affiliates;
  use_code text;
  term integer;
  base bigint;
  term_pct numeric:=0;
  after_term bigint;
  code_pct numeric:=0;
  final_amt bigint;
  promo_code_value text:=null;
  affiliate_code_value text:=null;
  updated public.engagements;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into eng from public.engagements where id=p_engagement_id for update;
  if eng.id is null then raise exception 'ENGAGEMENT_NOT_FOUND'; end if;
  if not public.vcpc_can_manage_org(eng.organization_id) then raise exception 'FORBIDDEN'; end if;
  if eng.quote_locked_at is not null then
    if p_lock and coalesce(nullif(upper(trim(p_code)),''),eng.promo_code,eng.affiliate_code) in (eng.promo_code,eng.affiliate_code) then
      return to_jsonb(eng);
    end if;
    raise exception 'QUOTE_LOCKED';
  end if;
  select * into pl from public.service_plans where code=eng.plan_code and active=true;
  if pl.code is null then raise exception 'PLAN_NOT_FOUND'; end if;
  term:=case when pl.billing_type='monthly' then eng.billing_term else 1 end;
  if pl.billing_type='monthly' and term not in (3,6,12) then raise exception 'INVALID_BILLING_TERM'; end if;
  base:=case when pl.billing_type='monthly' then pl.price_vnd*term else pl.price_vnd end;
  term_pct:=public.vcpc_term_discount(term);
  after_term:=round(base*(1-term_pct/100.0));
  use_code:=nullif(upper(trim(coalesce(p_code,eng.promo_code,eng.affiliate_code,''))), '');
  affiliate_code_value:=eng.affiliate_code;
  if use_code is not null then
    select * into promo from public.promo_codes
      where code=use_code and active=true
        and (expires_at is null or expires_at>public.vcpc_now_ms())
        and (quantity=0 or used<quantity);
    if promo.id is not null then
      code_pct:=promo.discount_percent;
      promo_code_value:=promo.code;
    else
      select * into aff from public.affiliates where code=use_code and status='ACTIVE';
      if aff.id is null then raise exception 'CODE_NOT_FOUND_OR_INACTIVE'; end if;
      code_pct:=aff.customer_discount_percent;
      affiliate_code_value:=aff.code;
    end if;
  end if;
  final_amt:=round(after_term*(1-code_pct/100.0));
  perform set_config('vcpc.quote_rpc','1',true);
  update public.engagements set
    monthly_price=pl.price_vnd,
    base_amount=base,
    term_discount_percent=term_pct,
    term_discount_amount=base-after_term,
    promo_code=promo_code_value,
    affiliate_code=affiliate_code_value,
    promo_discount_percent=code_pct,
    promo_discount_amount=after_term-final_amt,
    final_amount=final_amt,
    deposit_percent=20,
    deposit_amount=round(final_amt*0.20),
    balance_amount=final_amt-round(final_amt*0.20),
    quote_locked_at=case when p_lock then public.vcpc_now_ms() else null end
  where id=eng.id returning * into updated;
  if aff.id is not null then
    insert into public.affiliate_referrals(affiliate_id,organization_id,engagement_id,status)
    values(aff.id,eng.organization_id,eng.id,'REGISTERED')
    on conflict(engagement_id) do update set affiliate_id=excluded.affiliate_id;
  end if;
  insert into public.audit_logs(event,payload,user_id,organization_id)
  values(case when p_lock then 'QUOTE_LOCKED' else 'QUOTE_RECALCULATED' end,
    jsonb_build_object('engagement_id',eng.id,'code',use_code,'final_amount',final_amt,'deposit_amount',round(final_amt*0.20),'balance_amount',final_amt-round(final_amt*0.20)),
    auth.uid(),eng.organization_id);
  return to_jsonb(updated);
end; $$;

create or replace function public.vcpc_guard_engagement_financials()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(current_setting('vcpc.quote_rpc',true),'')='1'
     or coalesce(auth.jwt()->>'role','')='service_role'
     or public.vcpc_is_staff() then return new; end if;
  if row(new.plan_code,new.billing_term,new.monthly_price,new.base_amount,new.term_discount_percent,new.term_discount_amount,
         new.promo_code,new.affiliate_code,new.promo_discount_percent,new.promo_discount_amount,new.final_amount,
         new.deposit_percent,new.deposit_amount,new.balance_amount,new.quote_locked_at)
     is distinct from
     row(old.plan_code,old.billing_term,old.monthly_price,old.base_amount,old.term_discount_percent,old.term_discount_amount,
         old.promo_code,old.affiliate_code,old.promo_discount_percent,old.promo_discount_amount,old.final_amount,
         old.deposit_percent,old.deposit_amount,old.balance_amount,old.quote_locked_at)
  then raise exception 'QUOTE_FIELDS_SERVER_ONLY'; end if;
  return new;
end; $$;

do $$ begin
  create trigger vcpc_engagement_quote_guard before update on public.engagements
  for each row execute function public.vcpc_guard_engagement_financials();
exception when duplicate_object then null; end $$;

create or replace function public.vcpc_guard_payment_insert()
returns trigger language plpgsql security definer set search_path=public as $$
declare eng public.engagements; expected bigint;
begin
  if coalesce(auth.jwt()->>'role','')='service_role' or public.vcpc_is_staff() then return new; end if;
  if new.status not in ('CREATED','PENDING','AWAITING_CONFIRMATION') then raise exception 'INVALID_CLIENT_PAYMENT_STATUS'; end if;
  if new.instalment not in ('deposit','final') then raise exception 'INVALID_CLIENT_PAYMENT_TYPE'; end if;
  select * into eng from public.engagements where id=new.engagement_id;
  if eng.id is null or eng.organization_id<>new.organization_id then raise exception 'PAYMENT_ENGAGEMENT_MISMATCH'; end if;
  if not public.vcpc_is_org_member(eng.organization_id) then raise exception 'FORBIDDEN'; end if;
  if eng.quote_locked_at is null then raise exception 'QUOTE_NOT_LOCKED'; end if;
  expected:=case when new.instalment='deposit' then eng.deposit_amount else eng.balance_amount end;
  if new.amount<>expected then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
  if exists(select 1 from public.payments p where p.engagement_id=new.engagement_id and p.instalment=new.instalment and p.status in ('CREATED','PENDING','AWAITING_CONFIRMATION','PAID')) then
    raise exception 'PAYMENT_ALREADY_EXISTS';
  end if;
  return new;
end; $$;

do $$ begin
  create trigger vcpc_payment_insert_guard before insert on public.payments
  for each row execute function public.vcpc_guard_payment_insert();
exception when duplicate_object then null; end $$;

grant execute on function public.vcpc_apply_quote(uuid,text,boolean) to authenticated;
