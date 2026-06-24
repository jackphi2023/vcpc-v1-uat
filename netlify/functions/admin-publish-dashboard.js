const { json, requireRole, userClient, parseBody } = require('./_utils');
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return json(200,{});
 if(event.httpMethod!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 try{await requireRole(event,['admin','reviewer']);const b=parseBody(event);const sb=userClient(event);
  const {data,error}=await sb.rpc('vcpc_admin_publish_dashboard',{p_engagement_id:b.engagement_id,p_title:b.title||'Dashboard điều hành',p_config:b.config||{}});
  if(error)throw error;return json(200,{ok:true,dashboard_version_id:data});
 }catch(e){return json(e.message==='FORBIDDEN'?403:400,{error:e.message});}
};
