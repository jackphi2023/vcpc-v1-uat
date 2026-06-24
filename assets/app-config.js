/* VCPC V1 UAT runtime configuration.
   The Supabase publishable key is intentionally public and protected by RLS.
   Never place a secret/service-role key in this file. */
window.VCPC_CONFIG = {
  DEMO_MODE: false,
  BACKEND_READY: true,
  ALLOW_MOCK_GATEWAY: false,
  ENFORCE_AUTH_IN_DEMO: true,
  APP_URL: 'https://www.vietcapitalpartner.com',
  UAT_URL: '',
  PAYMENT_API_BASE: '/.netlify/functions',
  SUPABASE_URL: 'https://sfuoaafqefpygvzhvagq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_oL97b3GsTwCoCElayoKmcQ_34j-mc86',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_oL97b3GsTwCoCElayoKmcQ_34j-mc86'
};
window.VCPC_CONFIG.isProd = function(){ return !window.VCPC_CONFIG.DEMO_MODE; };
