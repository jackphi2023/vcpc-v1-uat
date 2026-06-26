/* ============================================================================
   VCPC — Front-end guards (defense-in-depth + UX, KHÔNG phải bảo mật thật)
   Bảo mật thật phải ở server (Supabase RLS + backend).

   Public demo rules:
   - No demo account and no automatic sign-in.
   - /demo/bizhealth and /demo/bizos are read-only public routes.
   - A real user's Supabase session is never replaced or signed out.
   - Normal dashboard URLs still require the user's real account and entitlement.
   ============================================================================ */
(function(){
  'use strict';

  var C = window.VCPC_CONFIG || { DEMO_MODE:true, ENFORCE_AUTH_IN_DEMO:false };
  var G = window.VCPC_GUARD = {};

  function lang(){ return (window.VCPC_I18N && VCPC_I18N.current) || 'vi'; }
  function tr(vi,en){ return lang()==='en' ? en : vi; }
  function user(){ return (window.VCPC_DB && VCPC_DB.currentUser) ? VCPC_DB.currentUser() : null; }

  G.isDemo = function(){ return !!C.DEMO_MODE; };

  G.isPublicDemo = function(){
    if (window.VCPC_PUBLIC_DEMO && typeof window.VCPC_PUBLIC_DEMO.isActive === 'function') {
      return !!window.VCPC_PUBLIC_DEMO.isActive();
    }
    try {
      var b = document.body;
      var allowed = !!b && b.getAttribute('data-allow-public-demo') === 'true';
      var requested = new URLSearchParams(window.location.search).get('demo') === '1';
      return allowed && requested;
    } catch(e) { return false; }
  };

  G.publicDemoContext = function(){
    return window.VCPC_PUBLIC_DEMO && typeof window.VCPC_PUBLIC_DEMO.getContext === 'function'
      ? window.VCPC_PUBLIC_DEMO.getContext()
      : null;
  };

  G.publicDemoBadge = function(){
    if (!G.isPublicDemo() || document.getElementById('vcpc-public-demo-badge')) return;
    var d = document.createElement('div');
    d.id = 'vcpc-public-demo-badge';
    d.textContent = tr('● DASHBOARD DEMO — Dữ liệu minh họa',
                       '● DASHBOARD DEMO — Illustrative data');
    d.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;background:#071f3d;color:#fff;'
      + 'font:800 11.5px/1.2 Montserrat,Arial,sans-serif;padding:8px 13px;border:1px solid rgba(255,211,107,.55);'
      + 'border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.22);letter-spacing:.02em;';
    document.body.appendChild(d);
  };

  G.badge = function(){
    if (!C.DEMO_MODE || document.getElementById('vcpc-demo-badge')) return;
    var d = document.createElement('div');
    d.id = 'vcpc-demo-badge';
    d.textContent = tr('● DEMO — dữ liệu giả lập, không dùng cho khách thật',
                       '● DEMO — simulated data, not for real clients');
    d.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;background:#9E3B2E;color:#fff;'
      + 'font:700 11.5px/1.2 Montserrat,Arial,sans-serif;padding:7px 12px;border-radius:999px;'
      + 'box-shadow:0 6px 18px rgba(0,0,0,.25);letter-spacing:.02em;';
    document.body.appendChild(d);
  };

  G.requireAuth = function(redirect){
    if (G.isPublicDemo()) return true;
    if (user()) return true;
    if (!C.DEMO_MODE || C.ENFORCE_AUTH_IN_DEMO){
      location.href = redirect || 'login.html';
      return false;
    }
    return true;
  };

  G.requireRole = function(role, redirect){
    if (G.isPublicDemo()) return false;
    var u = user();
    var ok = !!u && (u.role === role || (u.roles && u.roles.indexOf(role) >= 0));
    if (ok) return true;
    if (!C.DEMO_MODE){ location.href = redirect || '../app/login.html'; return false; }
    return true;
  };

  G.requireState = function(states){
    if (G.isPublicDemo()) return true;
    var eng = (window.VCPC_DB && VCPC_DB.currentEngagement) ? VCPC_DB.currentEngagement() : null;
    if (C.DEMO_MODE) return true;
    if (!eng || states.indexOf(eng.state) < 0){ location.href = 'onboarding.html'; return false; }
    return true;
  };

  G.assertGatewayAllowed = function(provider){
    if (provider === 'mock' && !(C.DEMO_MODE && C.ALLOW_MOCK_GATEWAY)){
      throw new Error('MOCK_GATEWAY_DISABLED_IN_PRODUCTION');
    }
    if (!C.DEMO_MODE && !C.BACKEND_READY){
      throw new Error('PAYMENT_BACKEND_NOT_READY');
    }
    return true;
  };

  document.addEventListener('DOMContentLoaded', function(){
    var b = document.body;

    if (G.isPublicDemo()){
      document.documentElement.classList.add('vcpc-public-demo');
      G.publicDemoBadge();
      document.dispatchEvent(new CustomEvent('vcpc:publicdemo', { detail: G.publicDemoContext() }));
      return;
    }

    G.badge();
    var req = b.getAttribute('data-require');
    if (req === 'auth')  G.requireAuth();
    if (req === 'admin') G.requireRole('admin');
    var need = b.getAttribute('data-need-state');
    if (need) G.requireState(need.split(',').map(function(s){return s.trim();}));
  });
})();
