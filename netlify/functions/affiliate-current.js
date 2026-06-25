const { json, adminClient, requireRole } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  try {
    const { user } = await requireRole(event, ['affiliate']);
    const sb = adminClient();

    const { data: affiliate, error } = await sb
      .from('affiliates')
      .select('id,user_id,email,name,code,slug,status,customer_discount_percent,commission_rate,must_change_password,password_changed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!affiliate) return json(404, { error: 'AFFILIATE_NOT_FOUND' });
    if (affiliate.status !== 'ACTIVE') return json(403, { error: 'AFFILIATE_NOT_ACTIVE' });

    return json(200, {
      ok: true,
      affiliate: {
        id: affiliate.id,
        email: affiliate.email,
        name: affiliate.name,
        code: affiliate.code,
        slug: affiliate.slug,
        status: affiliate.status,
        customer_discount_percent: affiliate.customer_discount_percent,
        commission_rate: affiliate.commission_rate,
        must_change_password: affiliate.must_change_password === true,
        password_changed_at: affiliate.password_changed_at || null,
      },
    }, { 'Cache-Control': 'no-store' });
  } catch (error) {
    const status = error.message === 'FORBIDDEN' ? 403 :
      (error.message === 'AUTH_REQUIRED' || error.message === 'AUTH_INVALID' ? 401 : 400);
    return json(status, { error: error.message }, { 'Cache-Control': 'no-store' });
  }
};
