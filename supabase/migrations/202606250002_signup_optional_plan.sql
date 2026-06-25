-- VCPC signup flow update
-- Allows account-only signup to create/reuse an Organization without forcing a plan.
-- When a plan is supplied, creates or updates the current DRAFT/INTAKE engagement idempotently.

create or replace function public.vcpc_complete_signup(
  p_organization_name text,
  p_tax_id text,
  p_service_code text,
  p_plan_code text,
  p_billing_term integer,
  p_affiliate_code text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  org public.organizations;
  pl public.service_plans;
  eng public.engagements;
  same_eng public.engagements;
  affiliate public.affiliates;
  term integer;
  tdisc numeric;
  base bigint;
  after_term bigint;
  final_after_affiliate bigint;
  coupon_pct numeric := 0;
  normalized_plan text := nullif(upper(trim(coalesce(p_plan_code,''))), '');
  normalized_service text := nullif(upper(trim(coalesce(p_service_code,''))), '');
  normalized_affiliate text := nullif(upper(trim(coalesce(p_affiliate_code,''))), '');
  created_engagement boolean := false;
  updated_engagement boolean := false;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Reuse the first active organization owned by this user.
  select o.* into org
  from public.organizations o
  join public.organization_members m on m.organization_id=o.id
  where m.user_id=uid
    and m.role='owner'
    and m.status='active'
    and o.status<>'ARCHIVED'
  order by o.created_at
  limit 1;

  if org.id is null then
    insert into public.organizations(name,tax_id,owner_id,contact_email)
    select
      coalesce(nullif(trim(p_organization_name),''),'Tổ chức của tôi'),
      nullif(trim(p_tax_id),''),
      uid,
      email
    from auth.users
    where id=uid
    returning * into org;

    insert into public.organization_members(
      organization_id,user_id,name,email,role,status,allowed_modules,activated_at
    )
    select
      org.id,
      uid,
      coalesce(raw_user_meta_data->>'full_name',''),
      email,
      'owner',
      'active',
      array['dashboard','data','mi','alerts','actions','team','billing','settings'],
      public.vcpc_now_ms()
    from auth.users
    where id=uid
    on conflict (organization_id,user_id) do update set
      status='active',
      role='owner',
      activated_at=coalesce(public.organization_members.activated_at,excluded.activated_at),
      updated_at=public.vcpc_now_ms();
  else
    update public.organizations
    set
      name=coalesce(nullif(trim(p_organization_name),''),name),
      tax_id=coalesce(nullif(trim(p_tax_id),''),tax_id),
      updated_at=public.vcpc_now_ms()
    where id=org.id
    returning * into org;
  end if;

  -- Account-only signup: Organization is ready, but no engagement is invented.
  if normalized_plan is null then
    insert into public.audit_logs(event,payload,user_id,organization_id)
    values(
      'USER_ORGANIZATION_READY',
      jsonb_build_object('deferred_service_selection',true),
      uid,
      org.id
    );

    return jsonb_build_object(
      'ok',true,
      'deferred',true,
      'organization_id',org.id,
      'engagement_id',null
    );
  end if;

  select * into pl
  from public.service_plans
  where code=normalized_plan
    and active=true;

  if pl.code is null then
    raise exception 'INVALID_PLAN';
  end if;

  if normalized_service is not null then
    if normalized_service='BIZHEALTH' and pl.product<>'bizhealth' then
      raise exception 'SERVICE_PLAN_MISMATCH';
    elsif normalized_service='BIZOS' and pl.product<>'strategy_os' then
      raise exception 'SERVICE_PLAN_MISMATCH';
    elsif normalized_service not in ('BIZHEALTH','BIZOS') then
      raise exception 'INVALID_SERVICE';
    end if;
  end if;

  term := case
    when pl.billing_type='monthly' then coalesce(p_billing_term,3)
    else 1
  end;

  if pl.billing_type='monthly' and term not in (3,6,12) then
    raise exception 'INVALID_TERM';
  end if;

  -- Price calculation is always server-side.
  tdisc := public.vcpc_term_discount(term);
  base := case when pl.billing_type='monthly' then pl.price_vnd*term else pl.price_vnd end;
  after_term := round(base*(1-tdisc/100.0));

  if normalized_affiliate is not null then
    select * into affiliate
    from public.affiliates
    where code=normalized_affiliate
      and status='ACTIVE';

    if affiliate.id is not null then
      coupon_pct := affiliate.customer_discount_percent;
    end if;
  end if;

  final_after_affiliate := round(after_term*(1-coupon_pct/100.0));

  -- Prefer one editable onboarding engagement. This makes callback reloads and
  -- plan changes at onboarding idempotent instead of creating duplicates.
  select * into eng
  from public.engagements
  where organization_id=org.id
    and owner_id=uid
    and state in ('DRAFT','INTAKE')
  order by created_at desc
  limit 1
  for update;

  if eng.id is not null then
    if eng.quote_locked_at is not null
       or exists(select 1 from public.payments p where p.engagement_id=eng.id) then
      raise exception 'PLAN_LOCKED';
    end if;

    update public.engagements
    set
      product=pl.product,
      plan_code=pl.code,
      billing_term=term,
      monthly_price=pl.price_vnd,
      base_amount=base,
      term_discount_percent=tdisc,
      term_discount_amount=base-after_term,
      affiliate_code=case when affiliate.id is not null then affiliate.code else null end,
      promo_discount_percent=coupon_pct,
      promo_discount_amount=after_term-final_after_affiliate,
      final_amount=final_after_affiliate,
      deposit_percent=20,
      deposit_amount=round(final_after_affiliate*0.20),
      balance_amount=round(final_after_affiliate*0.80),
      updated_at=public.vcpc_now_ms()
    where id=eng.id
    returning * into eng;

    updated_engagement := true;
  else
    -- If the same plan already exists beyond onboarding, return it rather than
    -- creating a duplicate from a callback reload.
    select * into same_eng
    from public.engagements
    where organization_id=org.id
      and owner_id=uid
      and plan_code=pl.code
      and state not in ('ARCHIVED','TERMINATED')
    order by created_at desc
    limit 1;

    if same_eng.id is not null then
      return jsonb_build_object(
        'ok',true,
        'idempotent',true,
        'organization_id',org.id,
        'engagement_id',same_eng.id,
        'plan_code',same_eng.plan_code,
        'state',same_eng.state
      );
    end if;

    insert into public.engagements(
      organization_id,owner_id,product,plan_code,billing_term,state,monthly_price,base_amount,
      term_discount_percent,term_discount_amount,affiliate_code,promo_discount_percent,
      promo_discount_amount,final_amount,deposit_percent,deposit_amount,balance_amount
    ) values(
      org.id,
      uid,
      pl.product,
      pl.code,
      term,
      'DRAFT',
      pl.price_vnd,
      base,
      tdisc,
      base-after_term,
      case when affiliate.id is not null then affiliate.code else null end,
      coupon_pct,
      after_term-final_after_affiliate,
      final_after_affiliate,
      20,
      round(final_after_affiliate*0.20),
      round(final_after_affiliate*0.80)
    )
    returning * into eng;

    created_engagement := true;
  end if;

  if affiliate.id is not null then
    insert into public.affiliate_referrals(
      affiliate_id,organization_id,engagement_id,status
    ) values(
      affiliate.id,org.id,eng.id,'REGISTERED'
    )
    on conflict (engagement_id) do update set
      affiliate_id=excluded.affiliate_id,
      organization_id=excluded.organization_id,
      status='REGISTERED';
  else
    delete from public.affiliate_referrals
    where engagement_id=eng.id
      and status='REGISTERED';
  end if;

  insert into public.audit_logs(event,payload,user_id,organization_id)
  values(
    case when created_engagement then 'USER_SIGNUP_COMPLETE' else 'SIGNUP_PLAN_UPDATED' end,
    jsonb_build_object(
      'service_code',coalesce(normalized_service,case when pl.product='bizhealth' then 'BIZHEALTH' else 'BIZOS' end),
      'plan_code',pl.code,
      'billing_term',term,
      'created_engagement',created_engagement,
      'updated_engagement',updated_engagement
    ),
    uid,
    org.id
  );

  return jsonb_build_object(
    'ok',true,
    'organization_id',org.id,
    'engagement_id',eng.id,
    'plan_code',eng.plan_code,
    'billing_term',eng.billing_term,
    'state',eng.state,
    'created_engagement',created_engagement,
    'updated_engagement',updated_engagement
  );
end;
$$;

grant execute on function public.vcpc_complete_signup(text,text,text,text,integer,text)
to authenticated;
