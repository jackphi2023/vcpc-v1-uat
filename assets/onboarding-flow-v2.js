/* VCPC onboarding flow v2: no draft persistence; create/update org only on submit. */
(function(){
  'use strict';
  if(!/\/app\/onboarding\.html$/i.test(location.pathname)) return;
  var RULES={
    BIZHEALTH_STANDARD:{service:'BIZHEALTH',product:'bizhealth',term:1},
    BIZHEALTH_PREMIUM:{service:'BIZHEALTH',product:'bizhealth',term:1},
    OS_LITE:{service:'BIZOS',product:'strategy_os',term:3},
    OS_STANDARD:{service:'BIZOS',product:'strategy_os',term:6},
    OS_PARTNER:{service:'BIZOS',product:'strategy_os',term:12}
  };
  function pending(){try{return JSON.parse(localStorage.getItem('vcpc.pending.signup')||'{}')||{};}catch(e){return {};}}
  function selectedFromState(){
    var q=new URLSearchParams(location.search);var meta=pending();
    var code=String(q.get('plan')||meta.plan_code||'').trim().toUpperCase();
    return RULES[code]?code:null;
  }
  function showError(text){var el=document.getElementById('formError');if(el){el.textContent=text;el.style.display='block';}}
  function log(stage,error,extra){
    var item={at:new Date().toISOString(),stage:stage,message:String(error&&error.message||error||''),extra:extra||null};
    try{var rows=JSON.parse(localStorage.getItem('vcpc.onboarding.diagnostics.v1')||'[]');rows.push(item);localStorage.setItem('vcpc.onboarding.diagnostics.v1',JSON.stringify(rows.slice(-30)));}catch(e){}
    console.error('[VCPC onboarding]',item);
  }

  document.addEventListener('DOMContentLoaded',function(){
    var form=document.getElementById('orgForm');if(!form)return;
    var selected=selectedFromState();
    document.addEventListener('click',function(event){var btn=event.target.closest('[data-plan]');if(btn&&RULES[btn.getAttribute('data-plan')])selected=btn.getAttribute('data-plan');},true);

    form.addEventListener('submit',function(event){
      event.preventDefault();event.stopImmediatePropagation();
      var errorBox=document.getElementById('formError');if(errorBox){errorBox.textContent='';errorBox.style.display='none';}
      if(!form.checkValidity()){form.reportValidity();return;}
      if(!selected||!RULES[selected]){showError('Vui lòng chọn một gói dịch vụ trước khi tiếp tục.');return;}
      var user=VCPC_DB.currentUser();if(!user){window.location.replace('login.html');return;}
      var data=Object.fromEntries(new FormData(form).entries());
      var rule=RULES[selected];var meta=pending();
      var btn=document.getElementById('continueBtn');btn.disabled=true;btn.textContent='Đang lưu…';
      try{
        var completed=VCPC_DB.rpc('vcpc_complete_signup',{
          p_organization_name:data.trade_name||data.legal_name,
          p_tax_id:data.tax_id||'',
          p_service_code:rule.service,
          p_plan_code:selected,
          p_billing_term:rule.term,
          p_affiliate_code:String(meta.affiliate_code||'').trim().toUpperCase()||null
        });
        if(Array.isArray(completed))completed=completed[0];
        if(!completed||!completed.organization_id||!completed.engagement_id)throw new Error('SIGNUP_CONTEXT_MISSING');
        var org=VCPC_DB.select('organizations',{id:completed.organization_id})[0];
        var eng=VCPC_DB.select('engagements',{id:completed.engagement_id})[0];
        if(!org||!eng)throw new Error('CREATED_RECORD_NOT_FOUND');
        org=VCPC_DB.upsert('organizations',Object.assign({},org,{
          name:data.trade_name||data.legal_name||org.name,tax_id:data.tax_id||null,industry:data.industry||null,size:data.revenue_band||null,
          contact_name:data.contact_name||null,contact_email:data.contact_email||user.email,contact_phone:data.contact_phone||null,website:data.website||null
        }));
        var intake=Object.assign({},eng.intake||{});
        intake.organization_profile={legal_name:data.legal_name||'',trade_name:data.trade_name||'',revenue_band:data.revenue_band||'',branches:Number(data.branches||0),employees:Number(data.employees||0),regions:data.regions||''};
        eng=VCPC_DB.upsert('engagements',Object.assign({},eng,{state:eng.state==='DRAFT'?'INTAKE':eng.state,intake:intake}));
        VCPC_DB.setCurrentOrg(org);VCPC_DB.setCurrentEngagement(eng);
        localStorage.removeItem('vcpc.pending.signup');
        VCPC_DB.audit('ORG_ONBOARDING_COMPLETED',{organization_id:org.id,engagement_id:eng.id,plan_code:selected});
        window.location.replace('intake.html');
      }catch(error){
        log('organization_submit_failed',error,{plan:selected});
        var text=String(error&&error.message||'');
        if(text.indexOf('INVALID_PLAN')>=0)showError('Gói dịch vụ không hợp lệ hoặc đã ngừng áp dụng. Vui lòng chọn lại.');
        else if(text.indexOf('INVALID_TERM')>=0)showError('Kỳ hạn dịch vụ không hợp lệ. Vui lòng chọn lại gói.');
        else if(text.indexOf('PLAN_LOCKED')>=0)showError('Báo giá đã khóa nên không thể đổi gói. Vui lòng liên hệ VCPC.');
        else showError('Không thể lưu thông tin tổ chức. Lỗi đã được ghi log chẩn đoán; vui lòng thử lại hoặc liên hệ VCPC.');
        btn.disabled=false;btn.textContent='Lưu và tiếp tục';
      }
    },true);
  });
})();