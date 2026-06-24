const { json, adminClient, parseBody } = require('./_utils');
exports.handler = async (event) => {
  if(event.httpMethod==='OPTIONS') return json(200,{});
  if(event.httpMethod!=='POST') return json(405,{error:'METHOD_NOT_ALLOWED'});
  try{
    const b=parseBody(event);
    const email=String(b.email||'').trim().toLowerCase();
    if(!b.name||!email||!b.phone||!b.network) return json(400,{error:'MISSING_REQUIRED_FIELDS'});
    const sb=adminClient();
    const { data:existing }=await sb.from('affiliate_applications').select('*').eq('email',email).maybeSingle();
    if(existing) return json(200,{ok:true,status:existing.status,id:existing.id,idempotent:true});
    const { data,error }=await sb.from('affiliate_applications').insert({name:b.name,email,phone:b.phone,type:b.type||'',network:b.network,status:'PENDING'}).select().single();
    if(error) throw error;
    await sb.from('audit_logs').insert({event:'AFFILIATE_APPLIED',payload:{application_id:data.id,email},at:Date.now()});
    return json(200,{ok:true,status:'PENDING',id:data.id});
  }catch(e){return json(400,{error:e.message});}
};
