const { json, requireRole, userClient, parseBody } = require('./_utils');
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return json(200,{});
 if(event.httpMethod!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 try{await requireRole(event,['admin','reviewer']);const b=parseBody(event);const sb=userClient(event);
  const {data,error}=await sb.rpc('vcpc_admin_transition_engagement',{p_engagement_id:b.engagement_id,p_state:b.state,p_note:b.note||null});
  if(error)throw error;return json(200,{ok:true,result:data});
 }catch(e){return json(e.message==='FORBIDDEN'?403:400,{error:e.message});}
};
