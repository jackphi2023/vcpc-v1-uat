/* ============================================================================
   VCPC — Supabase client wrapper  (v2.0 · tháng 6/2026)
   Drop-in replacement for mock-backend.js khi BACKEND_READY = true.

   API shape mirrors 100% mock-backend.js — không cần đổi code khác.

   *** Cách bật ***
   1. Vào Netlify UI → Site settings → Environment variables → thêm:
        SUPABASE_URL       = https://xxxx.supabase.co
        SUPABASE_ANON_KEY  = eyJ...
   2. Thêm snippet "Before </head>" trong Netlify UI:
        <script>
          window.ENV_SUPABASE_URL      = "{{ SUPABASE_URL }}";
          window.ENV_SUPABASE_ANON_KEY = "{{ SUPABASE_ANON_KEY }}";
        </script>
   3. Trong app-config.js đặt:
        BACKEND_READY: true,
        DEMO_MODE: false
   4. Thêm vào mọi trang app/admin SAU app-config.js:
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
        <script src="/assets/supabase-client.js"></script>
   ============================================================================ */
(function () {
  'use strict';
  var C = window.VCPC_CONFIG || {};
  var url = C.SUPABASE_URL || window.ENV_SUPABASE_URL || '';
  var key = C.SUPABASE_ANON_KEY || window.ENV_SUPABASE_ANON_KEY || '';

  if (!url || !key || typeof window.supabase === 'undefined') {
    console.warn('[VCPC Supabase] Credentials missing or SDK not loaded — mock backend stays active.');
    return;
  }

  var sb = window.supabase.createClient(url, key);
  var SK = {
    SESSION:    'vcpc.sb.session',
    ORG:        'vcpc.sb.org',
    ENGAGEMENT: 'vcpc.sb.engagement'
  };

  /* ---- helpers ---- */
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k)      { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function rid(p)        { return p + '_' + Math.random().toString(36).slice(2, 10); }

  /* ---- auth listener ---- */
  sb.auth.onAuthStateChange(function (event, session) {
    if (session) store(SK.SESSION, session);
    else         localStorage.removeItem(SK.SESSION);
  });

  /* ============================================================
     VCPC_DB_SUPABASE — mirrors mock-backend.js API
     Note: select/insert/upsert/remove are async when Supabase is
     active. The calling code uses .then() or await where needed;
     the mock counterparts return synchronously but we match shape.
  ============================================================ */
  var VCPC_DB_SUPABASE = {

    /* ---- auth ---- */
    signinMagic: async function (email) {
      var res = await sb.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + '/app/login.html' }
      });
      if (res.error) throw res.error;
      return { email: email };
    },

    currentSession: function () { return load(SK.SESSION); },

    currentUser: function () {
      var sess = load(SK.SESSION);
      return (sess && sess.user) ? sess.user : null;
    },

    signout: async function () {
      await sb.auth.signOut();
      [SK.SESSION, SK.ORG, SK.ENGAGEMENT].forEach(function (k) { localStorage.removeItem(k); });
    },

    /* ---- generic table ops ---- */
    select: async function (table, filter) {
      var q = sb.from(table).select('*');
      if (filter) {
        Object.keys(filter).forEach(function (k) { q = q.eq(k, filter[k]); });
      }
      var res = await q;
      if (res.error) { console.error('[VCPC SB select]', table, res.error); return []; }
      return res.data || [];
    },

    insert: async function (table, row) {
      if (!row.id) row.id = rid(table.slice(0, 2));
      if (!row.created_at) row.created_at = new Date().toISOString();
      var res = await sb.from(table).insert(row).select().single();
      if (res.error) { console.error('[VCPC SB insert]', table, res.error); throw res.error; }
      return res.data;
    },

    upsert: async function (table, row, pk) {
      pk = pk || 'id';
      row.updated_at = new Date().toISOString();
      var res = await sb.from(table).upsert(row, { onConflict: pk }).select().single();
      if (res.error) { console.error('[VCPC SB upsert]', table, res.error); throw res.error; }
      // keep local cache in sync
      if (table === 'engagements') store(SK.ENGAGEMENT, res.data);
      if (table === 'organizations') store(SK.ORG, res.data);
      return res.data;
    },

    remove: async function (table, filter) {
      var q = sb.from(table).delete();
      if (filter) Object.keys(filter).forEach(function (k) { q = q.eq(k, filter[k]); });
      var res = await q;
      if (res.error) console.error('[VCPC SB remove]', table, res.error);
    },

    /* ---- audit ---- */
    audit: async function (event, payload) {
      var u = this.currentUser();
      try {
        await sb.from('audit_logs').insert({
          id:              rid('a'),
          event:           event,
          payload:         payload || {},
          user_id:         u ? u.id : null,
          organization_id: (payload && payload.organization_id) || null,
          created_at:      new Date().toISOString()
        });
      } catch (e) { console.warn('[VCPC] audit log failed:', e); }
    },

    /* ---- org / engagement convenience ---- */
    currentOrg: function () { return load(SK.ORG); },

    setCurrentOrg: function (org) { store(SK.ORG, org); },

    currentEngagement: function () { return load(SK.ENGAGEMENT); },

    setCurrentEngagement: function (e) { store(SK.ENGAGEMENT, e); },

    /* ---- reset ---- */
    resetAll: function () {
      Object.values(SK).forEach(function (k) { localStorage.removeItem(k); });
    }
  };

  /* ---- activate ---- */
  if (C.BACKEND_READY) {
    window.VCPC_DB = VCPC_DB_SUPABASE;
    console.info('[VCPC] Supabase client ACTIVE — mock backend replaced.');
  } else {
    window.VCPC_DB_SUPABASE = VCPC_DB_SUPABASE;
    console.info('[VCPC] Supabase client READY (BACKEND_READY=false → mock still active).');
  }
})();
