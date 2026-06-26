/* VCPC customer signup flow v2: account first, organization only after email confirmation. */
(function(){
  'use strict';
  var cleanPath=String(location.pathname||'').replace(/\/+$/,'');
  if(!/\/app\/signup(?:\.html)?$/i.test(cleanPath)) return;
  window.VCPC_SIGNUP_FLOW_V2_LOADED=true;

  var PLAN_RULES={
    BIZHEALTH_STANDARD:{service_code:'BIZHEALTH',plan_code:'BIZHEALTH_STANDARD',billing_term_months:1},
    BIZHEALTH_PREMIUM:{service_code:'BIZHEALTH',plan_code:'BIZHEALTH_PREMIUM',billing_term_months:1},
    OS_LITE:{service_code:'BIZOS',plan_code:'OS_LITE',billing_term_months:3},
    OS_STANDARD:{service_code:'BIZOS',plan_code:'OS_STANDARD',billing_term_months:6},
    OS_PARTNER:{service_code:'BIZOS',plan_code:'OS_PARTNER',billing_term_months:12}
  };
  var LOG_KEY='vcpc.signup.diagnostics.v1';

  function log(stage,error,extra){
    var item={
      at:new Date().toISOString(),
      stage:stage,
      message:String(error&&error.message||error||''),
      status:error&&error.status||null,
      code:error&&error.code||null,
      extra:extra||null
    };
    try{var rows=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');rows.push(item);localStorage.setItem(LOG_KEY,JSON.stringify(rows.slice(-30)));}catch(e){}
    console.error('[VCPC signup]',item);
  }
  function message(type,text){
    var el=document.getElementById('signupMessage');
    if(!el)return;
    el.style.display='block';el.textContent=text;
    el.style.color=type==='success'?'#0d8a5d':'#c7352b';
    el.style.background=type==='success'?'rgba(13,138,93,.10)':'rgba(199,53,43,.08)';
    el.style.border=type==='success'?'1px solid rgba(13,138,93,.20)':'1px solid rgba(199,53,43,.16)';
  }
  function required(form,name,label){var el=form.elements[name];var value=String(el&&el.value||'').trim();if(!value){message('error','Vui lòng nhập '+label+'.');if(el)el.focus();return null;}return value;}
  function selectedPlan(){var p=new URLSearchParams(location.search);var code=String(p.get('plan')||'').trim().toUpperCase();return PLAN_RULES[code]||null;}
  function resetButton(btn){btn.disabled=false;btn.textContent='Tạo tài khoản và xác thực email →';}

  document.addEventListener('DOMContentLoaded',function(){
    var form=document.getElementById('signupForm');
    if(!form)return;
    form.addEventListener('submit',async function(event){
      event.preventDefault();event.stopImmediatePropagation();
      var btn=document.getElementById('signupBtn');
      var fullName=required(form,'name','Họ và tên');if(fullName===null)return;
      var phone=required(form,'phone','Số điện thoại / Zalo');if(phone===null)return;
      var email=required(form,'email','Email');if(email===null)return;
      email=email.toLowerCase();
      var password=required(form,'password','Mật khẩu');if(password===null)return;
      var confirm=required(form,'confirm','Xác nhận mật khẩu');if(confirm===null)return;
      var orgName=required(form,'org_name','Tên doanh nghiệp');if(orgName===null)return;
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){message('error','Email chưa đúng định dạng. Vui lòng kiểm tra lại.');form.elements.email.focus();return;}
      if(phone.replace(/[^\d+]/g,'').length<9){message('error','Số điện thoại chưa hợp lệ. Vui lòng kiểm tra lại.');form.elements.phone.focus();return;}
      if(password.length<8){message('error','Mật khẩu phải có ít nhất 8 ký tự.');form.elements.password.focus();return;}
      if(password!==confirm){message('error','Mật khẩu xác nhận không khớp.');form.elements.confirm.focus();return;}

      var cfg=window.VCPC_CONFIG||{};
      if(!cfg.SUPABASE_URL||!(cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY)){
        message('error','Cấu hình kết nối Supabase chưa đầy đủ. Vui lòng liên hệ VCPC.');
        return;
      }
      var plan=selectedPlan();
      var meta={full_name:fullName,phone:phone,organization_name:orgName,tax_id:String(form.elements.tax_id&&form.elements.tax_id.value||'').trim(),affiliate_code:String(new URLSearchParams(location.search).get('ref')||new URLSearchParams(location.search).get('affiliate')||'').trim().toUpperCase()};
      if(plan)Object.assign(meta,plan);
      localStorage.setItem('vcpc.pending.signup',JSON.stringify(meta));
      var callback=new URL('/app/auth-callback.html',location.origin);
      if(plan){callback.searchParams.set('service',plan.service_code);callback.searchParams.set('plan',plan.plan_code);callback.searchParams.set('term',String(plan.billing_term_months));}

      btn.disabled=true;btn.textContent='Đang tạo tài khoản…';
      try{
        var response=await fetch(cfg.SUPABASE_URL+'/auth/v1/signup?redirect_to='+encodeURIComponent(callback.href),{
          method:'POST',
          headers:{apikey:cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
          body:JSON.stringify({email:email,password:password,data:meta})
        });
        var data=await response.json().catch(function(){return {};});
        if(!response.ok){
          var err=new Error(data.msg||data.error_description||data.message||data.error||('HTTP_'+response.status));
          err.status=response.status;
          err.code=data.error_code||data.code||null;
          throw err;
        }
        if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){
          localStorage.removeItem('vcpc.pending.signup');
          message('error','Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.');
          resetButton(btn);return;
        }
        if(data.access_token){
          log('unexpected_session','Supabase trả session trước khi xác thực email',{email:email});
          message('error','Cấu hình xác thực email đang chưa đúng. Tài khoản đã được tạo nhưng hệ thống cần quản trị viên kiểm tra Supabase.');
          resetButton(btn);return;
        }
        message('success','Đã tạo tài khoản. Vui lòng kiểm tra email để xác thực. Sau khi bấm link, bạn sẽ vào thẳng bước Tạo tổ chức.');
        form.querySelectorAll('input').forEach(function(el){el.disabled=true;});
        btn.textContent='Vui lòng kiểm tra email';
      }catch(error){
        log('signup_request_failed',error,{email:email,callback:callback.href});
        var text=String(error.message||'').toLowerCase();
        var code=String(error.code||'').toLowerCase();
        if(text.indexOf('already')>=0||text.indexOf('registered')>=0||text.indexOf('exists')>=0||code.indexOf('user_already_exists')>=0){
          message('error','Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.');
        }else if(text.indexOf('rate')>=0||error.status===429){
          message('error','Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
        }else if(text.indexOf('redirect')>=0||code.indexOf('redirect')>=0){
          message('error','URL xác thực email chưa được cho phép trong Supabase. Quản trị viên cần kiểm tra Authentication → URL Configuration.');
        }else if(error.status===401||error.status===403||text.indexOf('api key')>=0||text.indexOf('apikey')>=0){
          message('error','Không thể kết nối dự án Supabase. Quản trị viên cần kiểm tra Project URL và publishable key.');
        }else if(text.indexOf('signup is disabled')>=0||text.indexOf('provider is disabled')>=0){
          message('error','Chức năng đăng ký bằng email đang bị tắt trong Supabase.');
        }else if(text.indexOf('captcha')>=0){
          message('error','Supabase đang yêu cầu CAPTCHA nhưng form chưa được cấu hình CAPTCHA.');
        }else if(text.indexOf('database error')>=0||text.indexOf('saving new user')>=0){
          message('error','Supabase không thể lưu người dùng mới. Cần kiểm tra trigger trên auth.users và bảng profiles.');
        }else if(error.status===500||text.indexOf('smtp')>=0||text.indexOf('send email')>=0||text.indexOf('confirmation email')>=0){
          message('error','Không gửi được email xác thực. Cần kiểm tra Custom SMTP và Authentication logs trong Supabase.');
        }else{
          message('error','Có lỗi khi tạo tài khoản. Mã chẩn đoán đã được lưu trên trình duyệt; vui lòng thử lại hoặc liên hệ VCPC.');
        }
        resetButton(btn);
      }
    },true);
  });
})();
