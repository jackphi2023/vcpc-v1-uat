const {
  json,
  adminClient,
  requireRole,
  parseBody,
  randomPassword,
  slugify,
} = require('./_utils');

async function findAuthUserByEmail(sb, email) {
  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('id,email')
    .eq('email', email)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile && profile.id) {
    const { data, error } = await sb.auth.admin.getUserById(profile.id);
    if (error) throw error;
    return data && data.user ? data.user : null;
  }

  for (let page = 1; page <= 20; page += 1) {
    const result = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    const users = (result.data && result.data.users) || [];
    const found = users.find((user) => String(user.email || '').toLowerCase() === email);
    if (found) return found;
    if (users.length < 1000) break;
  }

  return null;
}

async function uniqueAffiliateCode(sb, base) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const code = `VCPC-${base.replace(/-/g, '').toUpperCase().slice(0, 8)}-${suffix}`;
    const { data, error } = await sb.from('affiliates').select('id').eq('code', code).maybeSingle();
    if (error) throw error;
    if (!data) return code;
  }
  throw new Error('AFFILIATE_CODE_GENERATION_FAILED');
}

async function uniqueAffiliateSlug(sb, base) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const slug = attempt === 0
      ? base
      : `${base}-${Math.random().toString(36).slice(2, 7).toLowerCase()}`;
    const { data, error } = await sb.from('affiliates').select('id').eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!data) return slug;
  }
  throw new Error('AFFILIATE_SLUG_GENERATION_FAILED');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  let createdNewUserId = null;

  try {
    const { user: actor } = await requireRole(event, ['admin']);
    const body = parseBody(event);
    if (!body.application_id) throw new Error('APPLICATION_ID_REQUIRED');

    const sb = adminClient();
    const { data: application, error: applicationError } = await sb
      .from('affiliate_applications')
      .select('*')
      .eq('id', body.application_id)
      .single();

    if (applicationError || !application) throw new Error('APPLICATION_NOT_FOUND');
    if (application.status === 'REJECTED') throw new Error('APPLICATION_REJECTED');

    const { data: existingAffiliate, error: existingAffiliateError } = await sb
      .from('affiliates')
      .select('*')
      .eq('application_id', application.id)
      .maybeSingle();

    if (existingAffiliateError) throw existingAffiliateError;
    if (existingAffiliate) {
      return json(200, {
        ok: true,
        idempotent: true,
        affiliate: existingAffiliate,
        login_email: existingAffiliate.email,
        portal_url: `/doitackinhdoanh/${existingAffiliate.slug}`,
        message: 'AFFILIATE_ALREADY_APPROVED_PASSWORD_NOT_REISSUED',
      });
    }

    if (application.status !== 'PENDING' && application.status !== 'APPROVED') {
      throw new Error('APPLICATION_NOT_PENDING');
    }

    const email = String(application.email || '').trim().toLowerCase();
    const tempPassword = randomPassword(16);
    let authUser = await findAuthUserByEmail(sb, email);

    if (authUser) {
      const { data: roleRow, error: roleError } = await sb
        .from('platform_user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (roleError) throw roleError;

      const existingVcpcRole = roleRow && roleRow.role;
      const metadataRole = authUser.app_metadata && authUser.app_metadata.vcpc_role;

      if (existingVcpcRole && existingVcpcRole !== 'affiliate' && metadataRole !== 'affiliate') {
        throw new Error('EMAIL_ALREADY_USED_BY_NON_AFFILIATE_ACCOUNT');
      }

      const { error: updateAuthError } = await sb.auth.admin.updateUserById(authUser.id, {
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          full_name: application.name,
          phone: application.phone,
          must_change_password: true,
        },
        app_metadata: {
          ...(authUser.app_metadata || {}),
          vcpc_role: 'affiliate',
        },
      });

      if (updateAuthError) throw updateAuthError;
    } else {
      const created = await sb.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: application.name,
          phone: application.phone,
          must_change_password: true,
        },
      });

      if (created.error || !created.data || !created.data.user) {
        throw created.error || new Error('AUTH_USER_CREATE_FAILED');
      }

      authUser = created.data.user;
      createdNewUserId = authUser.id;

      const { error: newUserMetadataError } = await sb.auth.admin.updateUserById(authUser.id, {
        app_metadata: {
          ...(authUser.app_metadata || {}),
          vcpc_role: 'affiliate',
        },
      });
      if (newUserMetadataError) throw newUserMetadataError;
    }

    const { error: profileUpsertError } = await sb.from('profiles').upsert({
      id: authUser.id,
      email,
      full_name: application.name,
      name: application.name,
      phone: application.phone,
      updated_at: Date.now(),
    }, { onConflict: 'id' });

    if (profileUpsertError) throw profileUpsertError;

    const { error: roleUpsertError } = await sb.from('platform_user_roles').upsert({
      user_id: authUser.id,
      role: 'affiliate',
      updated_at: Date.now(),
    }, { onConflict: 'user_id' });

    if (roleUpsertError) throw roleUpsertError;

    const base = slugify(application.name);
    const slug = await uniqueAffiliateSlug(sb, base);
    const code = await uniqueAffiliateCode(sb, base);
    const rate = Number(body.commission_rate || 35);
    const discount = Number(body.customer_discount_percent || 10);
    const now = Date.now();

    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('INVALID_COMMISSION_RATE');
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) throw new Error('INVALID_CUSTOMER_DISCOUNT');

    const { data: affiliate, error: affiliateError } = await sb.from('affiliates').insert({
      application_id: application.id,
      user_id: authUser.id,
      email,
      name: application.name,
      code,
      slug,
      status: 'ACTIVE',
      commission_rate: rate,
      rate_is_manual: rate !== 35,
      customer_discount_percent: discount,
      must_change_password: true,
      temporary_password_issued_at: now,
    }).select().single();

    if (affiliateError) throw affiliateError;

    const { error: applicationUpdateError } = await sb
      .from('affiliate_applications')
      .update({
        status: 'APPROVED',
        reviewed_by: actor.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', application.id);

    if (applicationUpdateError) throw applicationUpdateError;

    await sb.from('audit_logs').insert({
      event: 'AFFILIATE_APPROVED',
      payload: {
        application_id: application.id,
        affiliate_id: affiliate.id,
        commission_rate: rate,
        customer_discount_percent: discount,
      },
      user_id: actor.id,
      at: now,
    });

    return json(200, {
      ok: true,
      affiliate,
      temporary_password: tempPassword,
      login_email: email,
      login_url: '/app/affiliate-login.html',
      portal_url: `/doitackinhdoanh/${affiliate.slug}`,
    }, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[admin-approve-affiliate]', error);

    if (createdNewUserId) {
      try {
        const sb = adminClient();
        await sb.auth.admin.deleteUser(createdNewUserId);
      } catch (rollbackError) {
        console.error('[admin-approve-affiliate rollback]', rollbackError);
      }
    }

    const status = error.message === 'FORBIDDEN' ? 403 :
      (error.message === 'AUTH_REQUIRED' || error.message === 'AUTH_INVALID' ? 401 : 400);

    return json(status, { error: error.message }, { 'Cache-Control': 'no-store' });
  }
};
