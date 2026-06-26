/* ============================================================================
   VCPC Public Demo Context
   - No demo account and no automatic sign-in.
   - Never writes to the real Supabase auth session or localStorage session keys.
   - One logical demo organization with two read-only demo dashboards.
   - Active only when the page explicitly allows public demo AND the request is
     /demo/bizhealth, /demo/bizos or has ?demo=1 for backward compatibility.
   ============================================================================ */
(function () {
  'use strict';

  var DEMO_ORG = Object.freeze({
    id: 'VCPC_DEMO_ORG',
    name: 'VCPC Demo Organization',
    is_demo: true
  });

  var DEMO_DASHBOARDS = Object.freeze({
    bizhealth: Object.freeze({
      id: 'VCPC_DEMO_BIZHEALTH',
      organization_id: DEMO_ORG.id,
      dashboard_code: 'DEMO_BIZHEALTH',
      product: 'bizhealth',
      service_code: 'BIZHEALTH',
      plan_code: 'BIZHEALTH_STANDARD',
      state: 'ACTIVE_90D',
      is_demo: true,
      is_public: true,
      read_only: true
    }),
    bizos: Object.freeze({
      id: 'VCPC_DEMO_BIZOS',
      organization_id: DEMO_ORG.id,
      dashboard_code: 'DEMO_BIZOS',
      product: 'strategy_os',
      service_code: 'BIZOS',
      plan_code: 'OS_STANDARD',
      state: 'ACTIVE',
      is_demo: true,
      is_public: true,
      read_only: true
    })
  });

  function normalizedPath() {
    return (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  function requestedService() {
    var body = document.body;
    var declared = body && body.getAttribute('data-demo-dashboard');
    var path = normalizedPath();

    if (path === '/demo/bizhealth') return 'bizhealth';
    if (path === '/demo/bizos') return 'bizos';
    if (declared === 'bizhealth' || declared === 'bizos') return declared;
    return null;
  }

  function requestedPublicDemo() {
    var body = document.body;
    var allowed = !!body && body.getAttribute('data-allow-public-demo') === 'true';
    if (!allowed) return false;

    var path = normalizedPath();
    if (path === '/demo/bizhealth' || path === '/demo/bizos') return true;

    try {
      return new URLSearchParams(window.location.search).get('demo') === '1';
    } catch (e) {
      return false;
    }
  }

  function currentContext() {
    if (!requestedPublicDemo()) return null;
    var service = requestedService();
    var dashboard = DEMO_DASHBOARDS[service];
    if (!dashboard) return null;
    return {
      active: true,
      read_only: true,
      service: service,
      organization: DEMO_ORG,
      dashboard: dashboard,
      engagement: dashboard
    };
  }

  function applyReadOnlyUi() {
    var ctx = currentContext();
    if (!ctx) return;

    document.documentElement.classList.add('vcpc-public-demo');
    document.body.classList.add('vcpc-public-demo-body');
    document.body.setAttribute('data-public-demo-active', 'true');
    document.body.setAttribute('data-public-demo-service', ctx.service);

    /* Defense-in-depth for the public demo. The dashboard remains interactive
       for tabs/filters, but account, billing, upload, membership and write
       operations are blocked. */
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('a,button') : null;
      if (!target) return;

      var href = target.getAttribute('href') || '';
      var action = target.getAttribute('data-action') || '';
      var blockedHref = /(?:^|\/)(?:data|team|billing|payment|upload|scope)\.html(?:$|[?#])/i.test(href);
      var blockedAction = /^(?:signout|save|publish|rollback|invite|pay|delete|update)$/i.test(action);
      var explicitlyBlocked = target.hasAttribute('data-demo-write') || target.classList.contains('public-demo-private');

      if (blockedHref || blockedAction || explicitlyBlocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (form && !form.hasAttribute('data-demo-allow-submit')) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  window.VCPC_PUBLIC_DEMO = Object.freeze({
    isActive: requestedPublicDemo,
    getContext: currentContext,
    getOrganization: function () { var c = currentContext(); return c ? c.organization : null; },
    getDashboard: function () { var c = currentContext(); return c ? c.dashboard : null; },
    getEngagement: function () { var c = currentContext(); return c ? c.engagement : null; }
  });

  document.addEventListener('DOMContentLoaded', applyReadOnlyUi);
})();
