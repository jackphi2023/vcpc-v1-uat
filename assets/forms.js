/* VCPC Auto — gửi dữ liệu form về Google Sheet qua Apps Script Web App.
   Cấu hình URL ở assets/integrations.json (google_sheet_webapp_url).
   Dùng mode:'no-cors' nên không đọc được response — coi như gửi thành công nếu không throw.
   Apps Script mẫu (deploy: Web app, execute as Me, access Anyone):
     function doPost(e){
       var sheet = SpreadsheetApp.openById('1tSRtFam68cXK4eGHsKBzZodQXQv5sAeGa-gG4wmQv7Y');
       var data = JSON.parse(e.postData.contents);
       var tab = sheet.getSheetByName(data.form || 'Sheet1') || sheet.insertSheet(data.form || 'Sheet1');
       tab.appendRow([new Date(), JSON.stringify(data)]);
       return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
     }
*/
(function(){
  var cfgPromise = null;
  function loadCfg(base){
    if (!cfgPromise) cfgPromise = fetch((base||'assets') + '/integrations.json', {cache:'no-cache'}).then(function(r){return r.json();}).catch(function(){return {};});
    return cfgPromise;
  }
  // submitForm(formName, payload, opts) → {ok:boolean, queued:boolean}
  async function submitForm(formName, payload, opts){
    opts = opts || {};
    var cfg = await loadCfg(opts.assetsBase);
    var url = cfg.google_sheet_webapp_url;
    var body = Object.assign({ form: formName, ts: new Date().toISOString(), page: location.pathname }, payload);
    // always mirror to local audit so nothing is lost in demo / if webhook unset
    if (window.VCPC_DB) VCPC_DB.audit('FORM_SUBMIT', { form: formName, payload: payload });
    if (!url){
      // queue locally so a later sync can flush
      try { var q = JSON.parse(localStorage.getItem('vcpc.formqueue')||'[]'); q.push(body); localStorage.setItem('vcpc.formqueue', JSON.stringify(q)); } catch(e){}
      return { ok:true, queued:true };
    }
    try {
      await fetch(url, { method:'POST', mode:'no-cors', headers:{'content-type':'text/plain;charset=utf-8'}, body: JSON.stringify(body) });
      return { ok:true, queued:false };
    } catch(e){
      try { var q2 = JSON.parse(localStorage.getItem('vcpc.formqueue')||'[]'); q2.push(body); localStorage.setItem('vcpc.formqueue', JSON.stringify(q2)); } catch(_){}
      return { ok:true, queued:true };
    }
  }
  window.VCPC_FORMS = { submitForm: submitForm, loadCfg: loadCfg };
})();
