const { json, adminClient } = require('./_utils');
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return json(200,{});
  if(event.httpMethod!=='GET')return json(405,{error:'METHOD_NOT_ALLOWED'});
  const host=String(event.queryStringParameters?.hostname||'').toLowerCase().replace(/:\d+$/,'').replace(/^www\./,'');
  if(!host)return json(400,{error:'HOSTNAME_REQUIRED'});
  if(['localhost','127.0.0.1','vietcapitalpartner.com','vietcapitalpartners.com'].includes(host) || host.endsWith('.netlify.app')) return json(200,{vcpc_central:true,hostname:host},{'Cache-Control':'public,max-age=60'});
  try{
    const sb=adminClient();
    const {data,error}=await sb.from('tenant_domains').select('id,hostname,status,organization_id,dashboard_instance_id,login_title').eq('hostname',host).eq('status','ACTIVE').maybeSingle();
    if(error)throw error;if(!data)return json(404,{error:'TENANT_NOT_FOUND'});
    const [{data:org},{data:dash}]=await Promise.all([
      sb.from('organizations').select('name,logo_url,primary_color,login_title').eq('id',data.organization_id).single(),
      sb.from('dashboard_instances').select('name,service_code,plan_code,status').eq('id',data.dashboard_instance_id).single()
    ]);
    return json(200,{hostname:host,domain_status:data.status,organization_id:data.organization_id,dashboard_instance_id:data.dashboard_instance_id,organization_name:org?.name||'',logo_url:org?.logo_url||'',primary_color:org?.primary_color||'',login_title:data.login_title||org?.login_title||dash?.name||'Dashboard',service_code:dash?.service_code||'',dashboard_status:dash?.status||'',powered_by_vcpc:true},{'Cache-Control':'public,max-age=60'});
  }catch(e){return json(500,{error:e.message});}
};
