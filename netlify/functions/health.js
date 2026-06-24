const { json, adminClient } = require('./_utils');
exports.handler=async()=>{
 try{const sb=adminClient();const {error}=await sb.from('service_plans').select('code').limit(1);if(error)throw error;return json(200,{ok:true,service:'vcpc-v1-uat',time:new Date().toISOString()},{'Cache-Control':'no-store'});}catch(e){return json(503,{ok:false,error:e.message},{'Cache-Control':'no-store'});}
};
