const { json, userClient, requireUser, parseBody } = require('./_utils');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200,{});
  if (event.httpMethod !== 'POST') return json(405,{error:'METHOD_NOT_ALLOWED'});
  try {
    await requireUser(event);
    const b=parseBody(event);
    const sb=userClient(event);
    const { data, error } = await sb.rpc('vcpc_complete_signup', {
      p_organization_name:b.organization_name||'Tổ chức của tôi',
      p_tax_id:b.tax_id||'',
      p_service_code:b.service_code||'BIZHEALTH',
      p_plan_code:b.plan_code||'BIZHEALTH_STANDARD',
      p_billing_term:Number(b.billing_term_months)||3,
      p_affiliate_code:b.affiliate_code||b.ref||null,
    });
    if(error) throw error;
    return json(200,{ok:true,...(data||{})});
  } catch(e) { return json(e.message==='AUTH_REQUIRED'||e.message==='AUTH_INVALID'?401:400,{error:e.message}); }
};
