/* VCPC Auto — app shell core: auth shim, breadcrumb, lang sync. Uses mock backend. */
(function(){
  window.VCPC_APP = window.VCPC_APP || {};
  const A = window.VCPC_APP;

  // Sign-out
  document.addEventListener('click', function(e){
    const b = e.target.closest('[data-action="signout"]');
    if (!b) return;
    e.preventDefault();
    if (window.VCPC_DB) VCPC_DB.signout();
    window.location.href = (window.location.pathname.indexOf('/admin/')>=0 ? '../dashboard.html' : (window.location.pathname.indexOf('/app/')>=0 ? '../dashboard.html' : 'dashboard.html'));
  });

  // Tabs (generic)
  document.addEventListener('click', function(e){
    const t = e.target.closest('[data-tab]');
    if (!t) return;
    const group = t.closest('[data-tab-group]') || t.parentElement;
    const key = t.getAttribute('data-tab');
    group.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === t));
    const scope = t.closest('[data-tab-scope]') || document;
    scope.querySelectorAll('[data-tabview]').forEach(v => v.classList.toggle('active', v.getAttribute('data-tabview') === key));
  });

  // Currency / region detection (rough; user can override in settings)
  A.detectCurrency = function(){
    const stored = localStorage.getItem('vcpc.currency');
    if (stored) return stored;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.includes('Ho_Chi_Minh') || tz.includes('Hanoi') || tz.includes('Asia/Saigon')) return 'VND';
      if (tz.startsWith('America/') || tz === 'UTC') return 'USD';
      if (tz.startsWith('Europe/')) return 'EUR';
    } catch (e) {}
    return 'VND';
  };
  A.preferredGateway = function(){
    const c = A.detectCurrency();
    return c === 'VND' ? 'baokim' : 'stripe';
  };
  A.fmtMoney = function(v, ccy){
    if (v == null) return '—';
    ccy = ccy || A.detectCurrency();
    if (ccy === 'VND') return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
    return new Intl.NumberFormat(ccy === 'EUR' ? 'de-DE' : 'en-US', { style:'currency', currency:ccy }).format(v);
  };

  // Require auth (call on app pages)
  A.requireAuth = function(){
    if (!window.VCPC_DB || !VCPC_DB.currentSession()) { window.location.href = 'login.html'; return false; }
    return true;
  };
})();
