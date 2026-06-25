const { json, adminClient, requireRole, parseBody } = require('./_utils');

function strongPassword(value) {
  const password = String(value || '');
  return password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  try {
    const { user } = await requireRole(event, ['affiliate']);
    const body = parseBody(event);
    const newPassword = String(body.new_password || '');

    if (!strongPassword(newPassword)) {
      return json(400, { error: 'WEAK_PASSWORD' });
    }

    const sb = adminClient();
    const { data: affiliate, error: affiliateError } = await sb
      .from('affiliates')
      .select('id,slug,status,must_change_password')
      .eq('user_id', user.id)
      .maybeSingle();

    if (affiliateError) throw affiliateError;
    if (!affiliate) return json(404, { error: 'AFFILIATE_NOT_FOUND' });
    if (affiliate.status !== 'ACTIVE') return json(403, { error: 'AFFILIATE_NOT_ACTIVE' });

    if (affiliate.must_change_password !== true) {
      return json(200, { ok: true, idempotent: true, slug: affiliate.slug });
    }

    const { data: authRecord, error: getUserError } = await sb.auth.admin.getUserById(user.id);
    if (getUserError || !authRecord || !authRecord.user) {
      throw getUserError || new Error('AUTH_USER_NOT_FOUND');
    }

    const existingUserMetadata = authRecord.user.user_metadata || {};
    const existingAppMetadata = authRecord.user.app_metadata || {};

    const { error: passwordError } = await sb.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: {
        ...existingUserMetadata,
        must_change_password: false,
      },
      app_metadata: {
        ...existingAppMetadata,
        vcpc_role: 'affiliate',
      },
    });

    if (passwordError) throw passwordError;

    const changedAt = Date.now();
    const { error: updateError } = await sb
      .from('affiliates')
      .update({
        must_change_password: false,
        password_changed_at: changedAt,
        updated_at: changedAt,
      })
      .eq('id', affiliate.id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    await sb.from('audit_logs').insert({
      event: 'AFFILIATE_PASSWORD_CHANGED',
      payload: { affiliate_id: affiliate.id },
      user_id: user.id,
      at: changedAt,
    });

    return json(200, { ok: true, slug: affiliate.slug }, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('[affiliate-complete-password]', error);
    const status = error.message === 'FORBIDDEN' ? 403 :
      (error.message === 'AUTH_REQUIRED' || error.message === 'AUTH_INVALID' ? 401 : 400);
    return json(status, { error: error.message }, { 'Cache-Control': 'no-store' });
  }
};
