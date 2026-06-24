/* VCPC V1 UAT data/auth adapter.
   Keeps the existing synchronous VCPC_DB interface so the current HTML UI can
   be tested against Supabase without changing page layout or CSS.
   Production refactor should move pages to async services; this compatibility
   adapter is intentionally scoped to UAT. */
(function(){
  'use strict';
  var C=window.VCPC_CONFIG||{};
  var URL=C.SUPABASE_URL||'https://sfuoaafqefpygvzhvagq.supabase.co';
  var KEY=C.SUPABASE_ANON_KEY||C.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_oL97b3GsTwCoCElayoKmcQ_34j-mc86';
  var BACKEND=!!C.BACKEND_READY;
  var DEMO=!BACKEND;
  var SESSION_KEY='vcpc.supabase.session.v1';
  var CONTEXT_KEY='vcpc.context.v1';
  var LOCAL_KEY='vcpc.mock.v1';

  function parse(s,f){try{return JSON.parse(s);}catch(e){return f;}}
  function getSession(){return parse(localStorage.getItem(SESSION_KEY)||'null',null);}
  function setSession(s){if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);}
  function getContext(){return parse(localStorage.getItem(CONTEXT_KEY)||'{}',{});}
  function setContext(v){localStorage.setItem(CONTEXT_KEY,JSON.stringify(v||{}));}
  function enc(v){return encodeURIComponent(String(v));}
  function now(){return Date.now();}
  function uuid(){return (crypto&&crypto.randomUUID)?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});}

  function syncRequest(method,url,body,headers,allowError){
    var x=new XMLHttpRequest();
    try{
      x.open(method,url,false);
      x.setRequestHeader('apikey',KEY);
      x.setRequestHeader('Content-Type','application/json');
      Object.keys(headers||{}).forEach(function(k){x.setRequestHeader(k,headers[k]);});
      x.send(body==null?null:JSON.stringify(body));
    }catch(e){ if(allowError)return {status:0,error:e}; throw e; }
    var data=parse(x.responseText,x.responseText||null);
    if(x.status<200||x.status>=300){
      var msg=(data&&data.message)||(data&&data.error_description)||(data&&data.error)||('HTTP_'+x.status);
      var err=new Error(msg); err.status=x.status; err.data=data;
      if(allowError)return {status:x.status,error:err,data:data};
      throw err;
    }
    return {status:x.status,data:data,headers:x.getAllResponseHeaders()};
  }
  function authHeaders(){
    var s=getSession();
    return s&&s.access_token?{'Authorization':'Bearer '+s.access_token}:{};
  }
  function rest(method,path,body,prefer,allowError){
    var h=authHeaders();
    if(prefer)h.Prefer=prefer;
    return syncRequest(method,URL+'/rest/v1/'+path,body,h,allowError);
  }
  function auth(method,path,body,allowError){
    return syncRequest(method,URL+'/auth/v1/'+path,body,{},allowError);
  }
  function fn(name,body,allowError){
    var h=authHeaders();
    return syncRequest('POST','/.netlify/functions/'+name,body||{},h,allowError);
  }
  function rpc(name,args,allowError){
    return rest('POST','rpc/'+name,args||{},'return=representation',allowError);
  }
  function normalizeUser(user){
    if(!user)return null;
    var u=Object.assign({},user);
    var prof=rest('GET','profiles?select=*&id=eq.'+enc(user.id),null,null,true);
    if(prof.data&&prof.data[0])u=Object.assign(u,prof.data[0]);
    var role=rest('GET','platform_user_roles?select=role&user_id=eq.'+enc(user.id),null,null,true);
    var r=role.data&&role.data[0]&&role.data[0].role;
    if(r){u.role=r;u.roles=[r];}
    return u;
  }
  function storeAuthResponse(data){
    if(!data)return null;
    var s=data.session||((data.access_token&&data.user)?data:null);
    if(s){
      if(!s.expires_at&&s.expires_in)s.expires_at=Math.floor(Date.now()/1000)+s.expires_in;
      setSession(s);
      return s;
    }
    return null;
  }
  function refreshIfNeeded(){
    var s=getSession();
    if(!s||!s.refresh_token)return s;
    if(!s.expires_at||s.expires_at*1000>Date.now()+60000)return s;
    var r=auth('POST','token?grant_type=refresh_token',{refresh_token:s.refresh_token},true);
    if(r.data&&r.data.access_token){storeAuthResponse(r.data);return getSession();}
    setSession(null);return null;
  }

  /* ---------------- Local demo fallback ---------------- */
  function loadLocal(){return parse(localStorage.getItem(LOCAL_KEY)||'{}',{});}
  function saveLocal(s){localStorage.setItem(LOCAL_KEY,JSON.stringify(s));}
  var TABLES=['profiles','platform_user_roles','organizations','organization_members','engagements','dashboard_instances','dashboard_versions','dashboard_user_access','data_uploads','dataset_versions','validation_issues','payments','invoice_requests','promo_codes','coupon_redemptions','affiliate_applications','affiliates','affiliate_referrals','affiliate_commissions','affiliate_payouts','tenant_domains','audit_logs','review_tasks','recommendations','alert_events','mi_items'];
  function localDb(){var s=loadLocal();TABLES.forEach(function(t){if(!s[t])s[t]=[];});return s;}
  function localSelect(table,filter){var s=localDb(),rows=s[table]||[];if(!filter)return rows.slice();return rows.filter(function(r){return Object.keys(filter).every(function(k){return r[k]===filter[k];});});}
  function localInsert(table,row){var s=localDb();row=Object.assign({},row);row.id=row.id||uuid();row.created_at=row.created_at||now();s[table].push(row);saveLocal(s);return row;}
  function localUpsert(table,row,pk){pk=pk||'id';var s=localDb(),a=s[table]||[];row=Object.assign({},row);var i=a.findIndex(function(r){return r[pk]===row[pk];});if(i>=0)a[i]=Object.assign({},a[i],row,{updated_at:now()});else{row.id=row.id||uuid();row.created_at=row.created_at||now();a.push(row);}s[table]=a;saveLocal(s);return i>=0?a[i]:row;}

  var DB={
    isBackend:function(){return BACKEND;},
    callFunction:function(name,body){return fn(name,body).data;},
    rpc:function(name,args){return rpc(name,args).data;},
    currentSession:function(){if(DEMO){return localDb().session||null;}return refreshIfNeeded();},
    currentUser:function(){
      if(DEMO){var s=localDb();return s.session?(s.profiles||[]).find(function(u){return u.id===s.session.user_id;})||null:null;}
      var s=refreshIfNeeded();return s&&s.user?normalizeUser(s.user):null;
    },
    signinPassword:function(email,password){
      if(DEMO){var s=localDb();var u=(s.profiles||[]).find(function(x){return String(x.email).toLowerCase()===String(email).toLowerCase();});if(!u)return null;s.session={user_id:u.id,email:u.email,at:now()};saveLocal(s);return {user:u};}
      var r=auth('POST','token?grant_type=password',{email:email,password:password},true);
      if(!r.data||!r.data.access_token)return {error:(r.data&&r.data.error_description)||'invalid_credentials'};
      storeAuthResponse(r.data);return {user:normalizeUser(r.data.user),session:getSession()};
    },
    signinMagic:function(email){
      if(DEMO){var s=localDb();var u=(s.profiles||[]).find(function(x){return x.email===email;});if(!u)u=localInsert('profiles',{email:email,name:email.split('@')[0]});s=localDb();s.session={user_id:u.id,email:u.email,at:now()};saveLocal(s);return u;}
      var otpRedirect=location.origin+'/app/auth-callback.html';var r=auth('POST','otp?redirect_to='+encodeURIComponent(otpRedirect),{email:email,create_user:true},true);return r.error?{error:r.error.message}:{email:email};
    },
    signupWithPassword:function(data){
      if(DEMO){
        var s=localDb();if((s.profiles||[]).some(function(u){return u.email===data.email;}))return {error:'email_exists'};
        var user=localInsert('profiles',{email:data.email,full_name:data.full_name,name:data.full_name,phone:data.phone});
        s=localDb();s.session={user_id:user.id,email:user.email,at:now()};saveLocal(s);
        var org=localInsert('organizations',{name:data.organization_name,tax_id:data.tax_id,owner_id:user.id});
        localInsert('organization_members',{organization_id:org.id,user_id:user.id,email:user.email,name:user.full_name,role:'owner',status:'active'});
        var product=(data.service_code||'').toUpperCase()==='BIZOS'?'strategy_os':'bizhealth';
        var eng=localInsert('engagements',{organization_id:org.id,owner_id:user.id,product:product,plan_code:data.plan_code,billing_term:Number(data.billing_term_months)||3,state:'DRAFT'});
        setContext({organization_id:org.id,engagement_id:eng.id});return {user:user,org:org,engagement:eng};
      }
      var meta={full_name:data.full_name||data.name||'',phone:data.phone||'',organization_name:data.organization_name||'',tax_id:data.tax_id||'',service_code:data.service_code||'',plan_code:data.plan_code||'',billing_term_months:Number(data.billing_term_months)||3,affiliate_code:data.affiliate_code||data.ref||''};
      localStorage.setItem('vcpc.pending.signup',JSON.stringify(meta));
      var signupRedirect=location.origin+'/app/auth-callback.html';
      var r=auth('POST','signup?redirect_to='+encodeURIComponent(signupRedirect),{email:data.email,password:data.password,data:meta},true);
      if(r.error)return {error:(r.data&&r.data.msg)||(r.data&&r.data.error_description)||r.error.message};
      var session=storeAuthResponse(r.data);
      if(session){
        var complete=rpc('vcpc_complete_signup',{p_organization_name:meta.organization_name,p_tax_id:meta.tax_id,p_service_code:meta.service_code,p_plan_code:meta.plan_code,p_billing_term:meta.billing_term_months,p_affiliate_code:meta.affiliate_code||null},true);
        if(complete.error)return {error:complete.error.message};
        var payload=complete.data;
        if(Array.isArray(payload))payload=payload[0];
        if(payload&&payload.organization_id)setContext({organization_id:payload.organization_id,engagement_id:payload.engagement_id});
        localStorage.removeItem('vcpc.pending.signup');
        return {user:normalizeUser(r.data.user),session:session,completed:true,context:payload};
      }
      return {user:r.data&&r.data.user,needs_confirmation:true};
    },
    completePendingSignup:function(){
      if(DEMO)return {ok:true};
      var meta=parse(localStorage.getItem('vcpc.pending.signup')||'{}',{});
      var r=rpc('vcpc_complete_signup',{p_organization_name:meta.organization_name||'Tổ chức của tôi',p_tax_id:meta.tax_id||'',p_service_code:meta.service_code||'BIZHEALTH',p_plan_code:meta.plan_code||'BIZHEALTH_STANDARD',p_billing_term:Number(meta.billing_term_months)||3,p_affiliate_code:meta.affiliate_code||null},true);
      if(r.error)return {error:r.error.message};
      var d=Array.isArray(r.data)?r.data[0]:r.data;
      if(d&&d.organization_id)setContext({organization_id:d.organization_id,engagement_id:d.engagement_id});
      localStorage.removeItem('vcpc.pending.signup');return d||{ok:true};
    },
    consumeAuthCallback:function(){
      if(DEMO)return {session:this.currentSession()};
      var hash=new URLSearchParams((location.hash||'').replace(/^#/,''));
      var access=hash.get('access_token'),refresh=hash.get('refresh_token'),type=hash.get('type');
      if(access){
        var userResp=syncRequest('GET',URL+'/auth/v1/user',null,{'Authorization':'Bearer '+access},true);
        if(userResp.data&&userResp.data.id){setSession({access_token:access,refresh_token:refresh,user:userResp.data,expires_in:Number(hash.get('expires_in')||3600),expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600),token_type:'bearer'});return {session:getSession(),type:type};}
      }
      return {error:'callback_session_missing'};
    },
    requestPasswordReset:function(email){
      if(DEMO)return {sent:true};
      var redirect=location.origin+'/app/reset-password.html';
      var r=auth('POST','recover?redirect_to='+encodeURIComponent(redirect),{email:email},true);return r.error?{error:r.error.message}:{sent:true};
    },
    resetPassword:function(email,newPassword){
      if(DEMO){var s=localDb(),u=(s.profiles||[]).find(function(x){return x.email===email;});if(!u)return {error:'not_found'};u.password_hash='demo';saveLocal(s);return {success:true};}
      this.consumeAuthCallback();
      var s=getSession();if(!s||!s.access_token)return {error:'recovery_session_missing'};
      var r=syncRequest('PUT',URL+'/auth/v1/user',{password:newPassword,data:{must_change_password:false}},{'Authorization':'Bearer '+s.access_token},true);
      return r.error?{error:r.error.message}:{success:true};
    },
    signout:function(){
      if(DEMO){var s=localDb();s.session=null;saveLocal(s);return;}
      var s=getSession();if(s&&s.access_token)syncRequest('POST',URL+'/auth/v1/logout',{},authHeaders(),true);setSession(null);setContext({});
    },
    select:function(table,filter){
      if(DEMO)return localSelect(table,filter);
      var path=table+'?select=*';Object.keys(filter||{}).forEach(function(k){path+='&'+enc(k)+'=eq.'+enc(filter[k]);});
      var r=rest('GET',path,null,null,true);if(r.error){console.error('[VCPC select]',table,r.error);return [];}return r.data||[];
    },
    insert:function(table,row){
      if(DEMO)return localInsert(table,row);
      var payload=Object.assign({},row);delete payload.password_hash;delete payload.default_pass;
      var r=rest('POST',table,payload,'return=representation',true);if(r.error){console.error('[VCPC insert]',table,r.error);throw r.error;}return Array.isArray(r.data)?r.data[0]:r.data;
    },
    upsert:function(table,row,pk){
      if(DEMO)return localUpsert(table,row,pk);
      pk=pk||'id';var payload=Object.assign({},row);delete payload.password_hash;delete payload.default_pass;
      var id=payload[pk];var r;
      if(id){r=rest('PATCH',table+'?'+enc(pk)+'=eq.'+enc(id),payload,'return=representation',true);}else{r=rest('POST',table,payload,'return=representation',true);}
      if(r.error){console.error('[VCPC upsert]',table,r.error);throw r.error;}
      return Array.isArray(r.data)?r.data[0]:r.data;
    },
    remove:function(table,filter){
      if(DEMO){var s=localDb();s[table]=(s[table]||[]).filter(function(r){return !Object.keys(filter||{}).every(function(k){return r[k]===filter[k];});});saveLocal(s);return;}
      var path=table+'?';Object.keys(filter||{}).forEach(function(k,i){path+=(i?'&':'')+enc(k)+'=eq.'+enc(filter[k]);});var r=rest('DELETE',path,null,'return=minimal',true);if(r.error)throw r.error;
    },
    audit:function(event,payload){
      if(DEMO)return localInsert('audit_logs',{event:event,payload:payload||{},organization_id:payload&&payload.organization_id,user_id:this.currentUser()&&this.currentUser().id,at:now()});
      if(event==='AFFILIATE_APPLIED'&&!this.currentUser())return fn('affiliate-register',payload||{},true).data;
      var u=this.currentUser();var row={event:event,payload:payload||{},organization_id:payload&&payload.organization_id||null,user_id:u&&u.id||null,at:now()};
      var r=rest('POST','audit_logs',row,'return=minimal',true);if(r.error)console.warn('[VCPC audit]',r.error);return row;
    },
    currentOrg:function(){
      if(DEMO){var c=getContext(),s=localDb(),u=this.currentUser();return c.organization_id?(s.organizations||[]).find(function(o){return o.id===c.organization_id;}):((s.organizations||[]).find(function(o){return u&&o.owner_id===u.id;})||null);}
      var c=getContext();if(c.organization_id){var a=this.select('organizations',{id:c.organization_id});if(a[0])return a[0];}
      var u=this.currentUser();if(!u)return null;var m=this.select('organization_members',{user_id:u.id}).filter(function(x){return x.status==='active';});if(!m.length)return null;var o=this.select('organizations',{id:m[0].organization_id})[0]||null;if(o){c.organization_id=o.id;setContext(c);}return o;
    },
    setCurrentOrg:function(org){var c=getContext();c.organization_id=org&&org.id;setContext(c);},
    currentEngagement:function(){
      var c=getContext();if(c.engagement_id){var a=this.select('engagements',{id:c.engagement_id});if(a[0])return a[0];}
      var o=this.currentOrg();if(!o)return null;var e=this.select('engagements',{organization_id:o.id});if(!e.length)return null;e.sort(function(a,b){return (b.created_at||0)-(a.created_at||0);});c.engagement_id=e[0].id;setContext(c);return e[0];
    },
    setCurrentEngagement:function(e){var c=getContext();c.engagement_id=e&&e.id;if(e&&e.organization_id)c.organization_id=e.organization_id;setContext(c);},
    uploadObject:function(path,file){
      if(DEMO)return Promise.resolve({path:path,size:file&&file.size||0});
      var s=getSession();if(!s||!s.access_token)return Promise.reject(new Error('AUTH_REQUIRED'));
      return fetch(URL+'/storage/v1/object/vcpc-data/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'x-upsert':'true','Content-Type':file.type||'application/octet-stream'},body:file}).then(function(r){return r.text().then(function(t){var d=parse(t,t);if(!r.ok)throw new Error((d&&d.message)||('UPLOAD_HTTP_'+r.status));return d;});});
    },
    resetAll:function(){localStorage.removeItem(LOCAL_KEY);localStorage.removeItem(SESSION_KEY);localStorage.removeItem(CONTEXT_KEY);localStorage.removeItem('vcpc.pending.signup');}
  };

  window.VCPC_DB=DB;
  window.VCPC_DB_SUPABASE=BACKEND?DB:null;
})();
