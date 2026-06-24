const { json, adminClient, requireRole, parseBody, randomPassword, slugify } = require('./_utils');
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return json(200,{});
  if(event.httpMethod!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
  try{
    const {user:actor}=await requireRole(event,['admin']);
    const b=parseBody(event); if(!b.application_id)throw new Error('APPLICATION_ID_REQUIRED');
    const sb=adminClient();
    const {data:app,error:ae}=await sb.from('affiliate_applications').select('*').eq('id',b.application_id).single();
    if(ae||!app)throw new Error('APPLICATION_NOT_FOUND');
    if(app.status==='REJECTED')throw new Error('APPLICATION_REJECTED');
    const {data:existingAff}=await sb.from('affiliates').select('*').eq('application_id',app.id).maybeSingle();
    if(existingAff)return json(200,{ok:true,idempotent:true,affiliate:existingAff});
    let authUser=null;
    const list=await sb.auth.admin.listUsers({page:1,perPage:1000});
    if(list.data&&list.data.users)authUser=list.data.users.find(u=>String(u.email).toLowerCase()===app.email);
    const tempPassword=randomPassword();
    if(!authUser){
      const created=await sb.auth.admin.createUser({email:app.email,password:tempPassword,email_confirm:true,user_metadata:{full_name:app.name,phone:app.phone,must_change_password:true}});
      if(created.error)throw created.error; authUser=created.data.user;
    } else {
      const upd=await sb.auth.admin.updateUserById(authUser.id,{password:tempPassword,user_metadata:{...(authUser.user_metadata||{}),full_name:app.name,phone:app.phone,must_change_password:true}});
      if(upd.error)throw upd.error;
    }
    await sb.from('profiles').upsert({id:authUser.id,email:app.email,full_name:app.name,name:app.name,phone:app.phone},{onConflict:'id'});
    await sb.from('platform_user_roles').upsert({user_id:authUser.id,role:'affiliate'},{onConflict:'user_id'});
    let base=slugify(app.name),slug=base,code='';
    for(let i=0;i<6;i++){
      const suffix=Math.random().toString(36).slice(2,6).toUpperCase();
      code=`VCPC-${base.replace(/-/g,'').toUpperCase().slice(0,8)}-${suffix}`;
      const {data:c}=await sb.from('affiliates').select('id').eq('code',code).maybeSingle();
      if(!c)break;
    }
    const {data:slugExists}=await sb.from('affiliates').select('id').eq('slug',slug).maybeSingle();
    if(slugExists)slug=`${base}-${Math.random().toString(36).slice(2,6)}`;
    const rate=Number(b.commission_rate||35);
    const {data:aff,error}=await sb.from('affiliates').insert({application_id:app.id,user_id:authUser.id,email:app.email,name:app.name,code,slug,status:'ACTIVE',commission_rate:rate,rate_is_manual:rate!==35,customer_discount_percent:Number(b.customer_discount_percent||10)}).select().single();
    if(error)throw error;
    await sb.from('affiliate_applications').update({status:'APPROVED',reviewed_by:actor.id,reviewed_at:Date.now()}).eq('id',app.id);
    await sb.from('audit_logs').insert({event:'AFFILIATE_APPROVED',payload:{application_id:app.id,affiliate_id:aff.id,rate},user_id:actor.id,at:Date.now()});
    return json(200,{ok:true,affiliate:aff,temporary_password:tempPassword,login_email:app.email,portal_url:`/doitackinhdoanh/${aff.slug}`});
  }catch(e){return json(e.message==='FORBIDDEN'?403:400,{error:e.message});}
};
