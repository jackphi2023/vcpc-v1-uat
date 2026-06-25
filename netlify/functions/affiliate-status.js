const { json, adminClient, parseBody } = require('./_utils');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  try {
    const body = parseBody(event);
    const email = normalizeEmail(body.email);

    if (!validEmail(email)) {
      return json(400, { error: 'INVALID_EMAIL' }, { 'Cache-Control': 'no-store' });
    }

    const sb = adminClient();

    const { data: application, error: applicationError } = await sb
      .from('affiliate_applications')
      .select('id,status')
      .eq('email', email)
      .maybeSingle();

    if (applicationError) throw applicationError;

    if (!application) {
      const { data: legacyAffiliate, error: legacyError } = await sb
        .from('affiliates')
        .select('status')
        .eq('email', email)
        .maybeSingle();

      if (legacyError) throw legacyError;

      return json(
        200,
        { status: legacyAffiliate && legacyAffiliate.status === 'ACTIVE' ? 'ACTIVE' : 'NOT_REGISTERED' },
        { 'Cache-Control': 'no-store' }
      );
    }

    if (application.status === 'PENDING') {
      return json(200, { status: 'PENDING' }, { 'Cache-Control': 'no-store' });
    }

    if (application.status === 'REJECTED') {
      return json(200, { status: 'REJECTED' }, { 'Cache-Control': 'no-store' });
    }

    const { data: affiliate, error: affiliateError } = await sb
      .from('affiliates')
      .select('status')
      .eq('application_id', application.id)
      .maybeSingle();

    if (affiliateError) throw affiliateError;

    if (!affiliate) {
      return json(200, { status: 'PENDING' }, { 'Cache-Control': 'no-store' });
    }

    return json(
      200,
      { status: affiliate.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED' },
      { 'Cache-Control': 'no-store' }
    );
  } catch (error) {
    console.error('[affiliate-status]', error);
    return json(500, { error: 'STATUS_CHECK_FAILED' }, { 'Cache-Control': 'no-store' });
  }
};
