const { json, adminClient } = require('./_utils');
exports.handler=async(event)=>{
 try{
  if(event.httpMethod!=='POST'&&event.httpMethod!=='GET')return json(405,{error:'METHOD_NOT_ALLOWED'});
  if(event.headers['x-nf-scheduled-event']!=='true' && process.env.CRON_SECRET && event.headers['x-cron-secret']!==process.env.CRON_SECRET) return json(403,{error:'FORBIDDEN'});
  const sb=adminClient();const {data,error}=await sb.rpc('vcpc_run_lifecycle_maintenance');if(error)throw error;
  return json(200,{ok:true,result:data});
 }catch(e){return json(500,{error:e.message});}
};
