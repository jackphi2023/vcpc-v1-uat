/* VCPC Auto — tiny i18n runtime. Replaces all data-i18n="key" textContents and
   data-i18n-attr="placeholder:key" attributes. Adds <html lang> + dispatches
   'vcpc:langchange' so other modules re-render. */
(function(){
  const STORE_KEY = 'vcpc.lang';
  const FALLBACK = 'vi';
  const dicts = {};
  let current = localStorage.getItem(STORE_KEY) || document.documentElement.lang || FALLBACK;
  const ASSETS_BASE = (function(){
    var s = document.querySelector('script[data-i18n-base]');
    if (s) return s.getAttribute('data-i18n-base');
    // fallback: assume /assets/i18n/loader.js
    var here = document.querySelector('script[src*="i18n/loader.js"]');
    if (here) return here.src.replace(/\/loader\.js.*/, '');
    return 'assets/i18n';
  })();
  async function loadLang(lang){
    if (dicts[lang]) return dicts[lang];
    const url = ASSETS_BASE + '/' + lang + '.json';
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('i18n: ' + url + ' ' + res.status);
    dicts[lang] = await res.json();
    return dicts[lang];
  }
  function t(key){ return (dicts[current] && dicts[current][key]) || (dicts[FALLBACK] && dicts[FALLBACK][key]) || key; }
  function applyTo(root){
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el){
      const k = el.getAttribute('data-i18n');
      el.textContent = t(k);
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function(el){
      const k = el.getAttribute('data-i18n-html');
      el.innerHTML = t(k);
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(function(el){
      // format: "placeholder:key, aria-label:key2"
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach(function(pair){
        const m = pair.trim().split(':');
        if (m.length === 2) el.setAttribute(m[0].trim(), t(m[1].trim()));
      });
    });
    // legacy data-vi / data-en pairs from existing landing pages
    root.querySelectorAll('[data-vi][data-en]').forEach(function(el){
      const v = el.getAttribute('data-' + current);
      if (v != null) {
        if (el.hasAttribute('data-i18n-html-fallback')) el.innerHTML = v; else el.textContent = v;
      }
    });
    document.documentElement.lang = current;
  }
  async function setLang(lang){
    current = lang;
    localStorage.setItem(STORE_KEY, lang);
    await loadLang(lang);
    applyTo();
    document.dispatchEvent(new CustomEvent('vcpc:langchange', { detail: { lang: lang } }));
  }
  async function boot(){
    try { await loadLang(FALLBACK); } catch(e){ console.warn(e); }
    if (current !== FALLBACK) { try { await loadLang(current); } catch(e){ console.warn(e); } }
    applyTo();
    document.addEventListener('click', function(e){
      const btn = e.target.closest('[data-lang]');
      if (!btn) return;
      e.preventDefault();
      const l = btn.getAttribute('data-lang');
      setLang(l);
      // toggle active style on language toggles within the same group
      const grp = btn.closest('.lang, .lang-toggle, [data-lang-group]');
      if (grp) grp.querySelectorAll('[data-lang]').forEach(function(b){ b.classList.toggle('active', b === btn); });
    });
  }
  window.VCPC_I18N = { setLang, t, get current(){ return current; }, applyTo, loadLang };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
