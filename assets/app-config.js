/* VCPC V1 UAT runtime configuration.
   The Supabase publishable key is intentionally public and protected by RLS.
   Never place a secret/service-role key in this file. */
window.VCPC_CONFIG = {
  DEMO_MODE: false,
  BACKEND_READY: true,
  ALLOW_MOCK_GATEWAY: false,
  ENFORCE_AUTH_IN_DEMO: true,
  APP_URL: 'https://vietcapitalpartner.com',
  UAT_URL: '',
  PAYMENT_API_BASE: '/.netlify/functions',
  SUPABASE_URL: 'https://sfuoaafqefpygvzhvagq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_oL97b3GsTwCoCElayoKmcQ_34j-mc86',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_oL97b3GsTwCoCElayoKmcQ_34j-mc86'
};
window.VCPC_CONFIG.isProd = function(){ return !window.VCPC_CONFIG.DEMO_MODE; };

/* Load page-specific v2 controllers before the legacy inline handlers run.
   They use capture-phase submit interception, so no layout/CSS rewrite is needed. */
(function(){
  var path=window.location.pathname;
  var src='';
  if(/\/app\/signup\.html$/i.test(path)) src='../assets/signup-flow-v2.js';
  if(/\/app\/onboarding\.html$/i.test(path)) src='../assets/onboarding-flow-v2.js';
  if(src) document.write('<script src="'+src+'"><\/script>');
})();