const { createClient } = require('@supabase/supabase-js');

function cors(extra={}) {
  return {
    'Access-Control-Allow-Origin': process.env.APP_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    ...extra,
  };
}
function json(statusCode, body, extra={}) {
  return { statusCode, headers: cors(extra), body: JSON.stringify(body) };
}
function env() {
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !service) throw new Error('SUPABASE_SERVER_ENV_MISSING');
  return { url, service, publishable };
}
function adminClient() {
  const { url, service } = env();
  return createClient(url, service, { auth: { autoRefreshToken:false, persistSession:false } });
}
function bearer(event) {
  const v = event.headers.authorization || event.headers.Authorization || '';
  return v.startsWith('Bearer ') ? v.slice(7) : '';
}
function userClient(event) {
  const { url, publishable } = env();
  if (!publishable) throw new Error('SUPABASE_PUBLISHABLE_KEY_MISSING');
  const token = bearer(event);
  return createClient(url, publishable, {
    auth:{autoRefreshToken:false,persistSession:false},
    global:{headers: token ? {Authorization:`Bearer ${token}`} : {}}
  });
}
async function requireUser(event) {
  const token = bearer(event);
  if (!token) throw new Error('AUTH_REQUIRED');
  const sb = adminClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new Error('AUTH_INVALID');
  return data.user;
}
async function requireRole(event, roles=['admin']) {
  const user = await requireUser(event);
  const sb = adminClient();
  const { data, error } = await sb.from('platform_user_roles').select('role').eq('user_id',user.id).single();
  if (error || !data || !roles.includes(data.role)) throw new Error('FORBIDDEN');
  return { user, role:data.role };
}
function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); }
  catch { throw new Error('INVALID_JSON'); }
}
function randomPassword(length=14) {
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out='';
  for(let i=0;i<length;i++) out+=chars[Math.floor(Math.random()*chars.length)];
  return out;
}
function slugify(value) {
  return String(value||'partner').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'partner';
}
module.exports={cors,json,env,adminClient,userClient,bearer,requireUser,requireRole,parseBody,randomPassword,slugify};
