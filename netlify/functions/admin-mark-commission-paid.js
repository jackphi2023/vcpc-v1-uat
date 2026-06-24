const { json, requireRole, userClient, parseBody } = require('./_utils');
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return json(200,{});
 if(event.httpMethod!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 try{await requireRole(event,['admin']);const b=parseBody(event);const sb=userClient(event);
  const {data,error}=await sb.rpc('vcpc_admin_mark_commission_paid',{p_commission_id:b.commission_id,p_reference:b.reference||null});
  if(error)throw error;return json(200,{ok:true,result:data});
 }catch(e){return json(e.message==='FORBIDDEN'?403:400,{error:e.message});}
};
