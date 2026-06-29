import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'google-sheet-forms-v1';

const PAGES = [
  'index.html',
  'bizhealth.html',
  'biz-os.html',
  'biz-deal.html',
  'affiliate.html'
];

const BINDING_SCRIPT = String.raw`<script id="vcpc-google-sheet-form-bindings">
(function(){
  'use strict';
  if (window.__VCPC_GOOGLE_SHEET_FORM_BINDINGS__) return;
  window.__VCPC_GOOGLE_SHEET_FORM_BINDINGS__ = true;

  var FORM_CONFIG = {
    'contactForm': {
      formNameByPath: {
        '/': 'contact_home',
        '/index.html': 'contact_home',
        '/bizhealth': 'bizhealth_contact',
        '/bizhealth.html': 'bizhealth_contact',
        '/biz-os': 'bizos_contact',
        '/biz-os.html': 'bizos_contact',
        '/biz-deal': 'bizdeal_contact',
        '/biz-deal.html': 'bizdeal_contact'
      }
    },
    'affForm': { formName: 'affiliate_application' }
  };

  function normalizePath(){
    var p = (location.pathname || '/').replace(/\/+$/, '');
    return p || '/';
  }
  function currentLang(){
    return (window.VCPC_I18N && VCPC_I18N.current) || document.documentElement.lang || 'vi';
  }
  function t(vi, en){
    return String(currentLang()).toLowerCase().indexOf('en') === 0 ? en : vi;
  }
  function getFormName(formId){
    var cfg = FORM_CONFIG[formId] || {};
    if (cfg.formName) return cfg.formName;
    var p = normalizePath();
    return (cfg.formNameByPath && (cfg.formNameByPath[p] || cfg.formNameByPath[p + '.html'])) || formId || 'lead_form';
  }
  function val(form, name){
    var fd = new FormData(form);
    return String(fd.get(name) || '').trim();
  }
  function payloadFromForm(form, formName){
    var fd = new FormData(form);
    var obj = {};
    fd.forEach(function(value, key){ obj[key] = String(value || '').trim(); });
    obj.form_context = formName;
    obj.source_path = normalizePath();
    obj.page_title = document.title || '';
    obj.page_url = location.href;
    obj.referrer = document.referrer || '';
    obj.language = currentLang();
    obj.utm_source = new URLSearchParams(location.search).get('utm_source') || '';
    obj.utm_medium = new URLSearchParams(location.search).get('utm_medium') || '';
    obj.utm_campaign = new URLSearchParams(location.search).get('utm_campaign') || '';
    obj.user_agent = navigator.userAgent || '';
    return obj;
  }
  function setMsg(form, text, ok){
    var id = form.id === 'affForm' ? 'affMsg' : form.id + 'Msg';
    var box = document.getElementById(id);
    if (!box) {
      box = document.createElement('div');
      box.id = id;
      form.appendChild(box);
    }
    box.style.cssText = 'margin-top:12px;padding:12px 14px;border-radius:10px;font-weight:800;font-size:13px;line-height:1.45;background:' + (ok ? 'rgba(13,138,93,.12)' : 'rgba(199,53,43,.10)') + ';color:' + (ok ? '#0d6b4e' : '#c7352b') + ';';
    box.textContent = text;
  }
  function setBusy(form, busy){
    var btn = form.querySelector('button[type="submit"],button:not([type])');
    if (!btn) return;
    if (busy) {
      btn.dataset.originalText = btn.textContent || '';
      btn.disabled = true;
      btn.textContent = t('Đang gửi...', 'Sending...');
    } else {
      btn.disabled = false;
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
  }
  async function submitToSheet(formName, payload){
    if (!window.VCPC_FORMS || typeof VCPC_FORMS.submitForm !== 'function') throw new Error('FORM_LIBRARY_MISSING');
    return VCPC_FORMS.submitForm(formName, payload, { assetsBase: 'assets' });
  }
  async function mirrorAffiliateToBackend(payload){
    try {
      if (window.VCPC_DB && typeof VCPC_DB.callFunction === 'function') {
        await VCPC_DB.callFunction('affiliate-register', payload);
      }
    } catch (_) {}
  }
  function bind(formId){
    var form = document.getElementById(formId);
    if (!form || form.dataset.googleSheetBound === '1') return;
    form.dataset.googleSheetBound = '1';
    form.addEventListener('submit', function(event){
      event.preventDefault();
      event.stopImmediatePropagation();
      var formName = getFormName(formId);
      var payload = payloadFromForm(form, formName);
      setBusy(form, true);
      submitToSheet(formName, payload).then(async function(result){
        if (formId === 'affForm') await mirrorAffiliateToBackend(payload);
        if (result && result.queued) {
          setMsg(form, t('Đã ghi tạm yêu cầu. Cần cấu hình Google Apps Script Web App URL để tự động đổ vào Google Sheet.', 'Your request was queued locally. Configure the Google Apps Script Web App URL to send it to Google Sheet.'), false);
        } else {
          setMsg(form, t('Cảm ơn anh/chị — thông tin đã được gửi tới VCPC.', 'Thank you — your information has been sent to VCPC.'), true);
          form.reset();
        }
      }).catch(function(error){
        console.error('[VCPC forms]', error);
        setMsg(form, t('Không thể gửi form. Vui lòng thử lại hoặc liên hệ VCPC qua Zalo/điện thoại.', 'Cannot submit the form. Please try again or contact VCPC directly.'), false);
      }).finally(function(){ setBusy(form, false); });
    }, true);
  }
  bind('contactForm');
  bind('affForm');
})();
</script>`;

function ensureFormsScript(html) {
  if (html.includes('assets/forms.js')) return html;
  if (html.includes('<script src="assets/vcpc.js"></script>')) {
    return html.replace('<script src="assets/vcpc.js"></script>', '<script src="assets/forms.js"></script>\n<script src="assets/vcpc.js"></script>');
  }
  return html.replace('</body>', '<script src="assets/forms.js"></script>\n</body>');
}

function ensureBinding(html) {
  if (html.includes('vcpc-google-sheet-form-bindings')) return html;
  return html.replace('</body>', BINDING_SCRIPT + '\n</body>');
}

export default async function transformGoogleSheetForms(dist) {
  for (const page of PAGES) {
    const file = path.join(dist, page);
    let html = await readFile(file, 'utf8');
    const before = html;
    html = ensureFormsScript(html);
    html = ensureBinding(html);
    if (html === before) console.warn(`[${FIX_VERSION}] no changes for ${page}`);
    await writeFile(file, html, 'utf8');
  }
  console.log(`[${FIX_VERSION}] bound public forms to VCPC_FORMS / Google Sheet pipeline`);
}
