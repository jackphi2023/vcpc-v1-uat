const { json, adminClient, requireRole, parseBody, randomPassword } = require('./_utils');
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return json(200,{});
 if(event.httpMethod!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 try{
  const {user:actor}=await requireRole(event,['admin','reviewer']);const b=parseBody(event);
  if(!b.organization_id||!b.email)throw new Error('ORGANIZATION_AND_EMAIL_REQUIRED');
  const sb=adminClient();const email=String(b.email).toLowerCase();let au=null;
  const listed=await sb.auth.admin.listUsers({page:1,perPage:1000});if(listed.data?.users)au=listed.data.users.find(u=>String(u.email).toLowerCase()===email);
  const tempPassword=randomPassword();
  if(!au){const c=await sb.auth.admin.createUser({email,password:tempPassword,email_confirm:true,user_metadata:{full_name:b.name||'',must_change_password:true}});if(c.error)throw c.error;au=c.data.user;}
  else {const u=await sb.auth.admin.updateUserById(au.id,{password:tempPassword,user_metadata:{...(au.user_metadata||{}),full_name:b.name||au.user_metadata?.full_name||'',must_change_password:true}});if(u.error)throw u.error;}
  await sb.from('profiles').upsert({id:au.id,email,full_name:b.name||'',name:b.name||''},{onConflict:'id'});
  const {data:member,error}=await sb.from('organization_members').upsert({organization_id:b.organization_id,user_id:au.id,name:b.name||'',email,role:b.role||'viewer',status:'active',activated_at:Date.now()},{onConflict:'organization_id,user_id'}).select().single();if(error)throw error;
  if(b.engagement_id){const {data:di}=await sb.from('dashboard_instances').select('id').eq('engagement_id',b.engagement_id).single();if(di)await sb.from('dashboard_user_access').upsert({dashboard_instance_id:di.id,organization_id:b.organization_id,user_id:au.id,role:b.role||'viewer',status:'active'},{onConflict:'dashboard_instance_id,user_id'});}
  await sb.from('audit_logs').insert({event:'DASHBOARD_USER_CREATED',payload:{email,role:b.role||'viewer'},user_id:actor.id,organization_id:b.organization_id,at:Date.now()});
  return json(200,{ok:true,user_id:au.id,member,temporary_password:tempPassword,login_email:email});
 }catch(e){return json(e.message==='FORBIDDEN'?403:400,{error:e.message});}
};
