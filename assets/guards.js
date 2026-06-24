/* ============================================================================
   VCPC — Front-end guards (defense-in-depth + UX, KHÔNG phải bảo mật thật)
   Bảo mật thật phải ở server (Supabase RLS + backend). Guard này:
     • chặn truy cập "lịch sự" + chuyển hướng đăng nhập,
     • hiện badge DEMO,
     • cung cấp helper fail-closed cho thanh toán,
     • gate dashboard theo trạng thái engagement.

   Cách dùng (Claude Design áp):
     1) Thêm vào MỌI trang, ngay sau app-config.js & mock-backend.js:
          <script src="/assets/guards.js"></script>
     2) Trên <body> khai báo yêu cầu:
          app khách cần đăng nhập:   <body class="app" data-require="auth">
          dashboard cần đã thanh toán: <body class="app" data-require="auth" data-need-state="PREVIEW,ACTIVE,ACTIVE_90D">
          trang admin:               <body class="app" data-require="admin">
   ============================================================================ */
(function(){
  var C = window.VCPC_CONFIG || { DEMO_MODE:true, ENFORCE_AUTH_IN_DEMO:false };
  var G = window.VCPC_GUARD = {};
  function lang(){ return (window.VCPC_I18N && VCPC_I18N.current) || 'vi'; }
  function tr(vi,en){ return lang()==='en' ? en : vi; }
  function user(){ return (window.VCPC_DB && VCPC_DB.currentUser) ? VCPC_DB.currentUser() : null; }

  G.isDemo = function(){ return !!C.DEMO_MODE; };

  // Visible DEMO badge so nobody mistakes prototype data for real.
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

  // Auth gate. In production ALWAYS enforce; in demo only if configured.
  G.requireAuth = function(redirect){
    if (user()) return true;
    if (!C.DEMO_MODE || C.ENFORCE_AUTH_IN_DEMO){ location.href = redirect || 'login.html'; return false; }
    return true; // demo: allow, but badge makes it obvious
  };

  // Role gate for /admin. Real role lives server-side; here is just UX/defense.
  G.requireRole = function(role, redirect){
    var u = user();
    var ok = !!u && (u.role === role || (u.roles && u.roles.indexOf(role) >= 0));
    if (ok) return true;
    if (!C.DEMO_MODE){ location.href = redirect || '../app/login.html'; return false; }
    return true; // demo
  };

  // Dashboard state gate: require a real engagement in an allowed state (prod).
  G.requireState = function(states){
    var eng = (window.VCPC_DB && VCPC_DB.currentEngagement) ? VCPC_DB.currentEngagement() : null;
    if (C.DEMO_MODE) return true; // demo: seeded fallback allowed
    if (!eng || states.indexOf(eng.state) < 0){ location.href = 'onboarding.html'; return false; }
    return true;
  };

  // Fail-closed payment: throw in production instead of silently mocking.
  // Gateways should call this before any mock fallback.
  G.assertGatewayAllowed = function(provider){
    if (provider === 'mock' && !(C.DEMO_MODE && C.ALLOW_MOCK_GATEWAY)){
      throw new Error('MOCK_GATEWAY_DISABLED_IN_PRODUCTION');
    }
    if (!C.DEMO_MODE && !C.BACKEND_READY){
      throw new Error('PAYMENT_BACKEND_NOT_READY'); // fail-closed
    }
    return true;
  };

  document.addEventListener('DOMContentLoaded', function(){
    G.badge();
    var b = document.body, req = b.getAttribute('data-require');
    if (req === 'auth')  G.requireAuth();
    if (req === 'admin') G.requireRole('admin');
    var need = b.getAttribute('data-need-state');
    if (need) G.requireState(need.split(',').map(function(s){return s.trim();}));
  });
})();
