import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'upload-intake-gate-data-gap-v1';

const uploadScript = String.raw`
if(!VCPC_DB.currentUser())window.location.href='login.html';
const eng=VCPC_DB.currentEngagement();if(!eng)window.location.href='onboarding.html';
const org=VCPC_DB.currentOrg();
const MAX_FILE_SIZE=25*1024*1024;
const DATA_GAP_PREFIX='DATA_GAP_';
let publishTarget=70,currentDataset=null;
function getUploads(){return VCPC_DB.select('data_uploads',{engagement_id:eng.id})||[];}
function getIssues(){return currentDataset?(VCPC_DB.select('validation_issues',{dataset_version_id:currentDataset.id})||[]):[];}
function ensureDataset(){
 const all=(VCPC_DB.select('dataset_versions',{engagement_id:eng.id})||[]).sort((a,b)=>(b.version||0)-(a.version||0));
 currentDataset=all.find(x=>['INTAKE','STAGING','VALIDATING','READY_FOR_REVIEW'].includes(String(x.status||'').toUpperCase()));
 if(!currentDataset){
  currentDataset=VCPC_DB.insert('dataset_versions',{engagement_id:eng.id,organization_id:eng.organization_id,version:(all[0]?Number(all[0].version)+1:1),status:'INTAKE',dqs_score:0,intake_coverage:0,row_count:0,summary:{intake_gate:true,data_gaps:[]},created_by:(VCPC_DB.currentUser()||{}).id});
 }
 return currentDataset;
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function tagText(t){
 const s=String(t||'').toLowerCase();const tags=[];
 if(/p&l|pnl|profit|lợi nhuận|loi nhuan|doanh thu|revenue|sales|historical|tổng hợp|tong hop|financial/.test(s))tags.push('finance');
 if(/channel|kênh|kenh|sku|product|sản phẩm|san pham|branch|chi nhánh|chi nhanh|customer|khách|khach|sales/.test(s))tags.push('sales_breakdown');
 if(/cost|chi phí|chi phi|cogs|gross margin|margin|lease|rent|thuê|thue|capex|marketing|payroll|lương|luong|nhân sự|nhan su/.test(s))tags.push('cost');
 if(/cash|dòng tiền|dong tien|ar\b|ap\b|receivable|payable|debt|nợ|no\b|loan|working capital/.test(s))tags.push('cash');
 if(/org|organization|headcount|role|kpi owner|nhân sự|nhan su|team|staff/.test(s))tags.push('org_people');
 if(/pos|crm|erp|accounting|misa|kiot|sap|system|hệ thống|he thong|api/.test(s))tags.push('systems');
 return Array.from(new Set(tags));
}
function mergeTags(){const set=new Set();Array.prototype.slice.call(arguments).forEach(a=>(a||[]).forEach(x=>set.add(x)));return Array.from(set);}
function loadXlsx(){return new Promise((resolve,reject)=>{if(window.XLSX)return resolve(window.XLSX);const s=document.createElement('script');s.src='../assets/xlsx.full.min.js';s.onload=()=>resolve(window.XLSX);s.onerror=()=>reject(new Error('XLSX_LIBRARY_LOAD_FAILED'));document.head.appendChild(s);});}
function readAsArrayBuffer(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsArrayBuffer(file);});}
function readAsText(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(r.error);r.readAsText(file);});}
function analyzeMatrix(rows){
 const nonempty=(rows||[]).filter(r=>Array.isArray(r)&&r.some(v=>String(v??'').trim()!==''));
 if(!nonempty.length)return {score:0,rows:0,cols:0,missing:100,duplicates:0,blocking:true,technical_blocker:true,issues:['Tệp không có dữ liệu đọc được.']};
 const cols=Math.max.apply(null,nonempty.map(r=>r.length));let empty=0,total=Math.max(1,nonempty.length*cols);const seen=new Set();let dup=0;
 nonempty.forEach((r,i)=>{for(let c=0;c<cols;c++)if(String(r[c]??'').trim()==='')empty++;if(i>0){const k=JSON.stringify(r);if(seen.has(k))dup++;seen.add(k);}});
 const missing=Math.round(empty/total*100),dupPct=Math.round(dup/Math.max(1,nonempty.length-1)*100);
 const completeness=Math.max(0,100-missing),consistency=Math.max(0,100-dupPct),granularity=Math.min(100,45+Math.log10(Math.max(10,nonempty.length))*18+Math.min(cols,20));
 const score=Math.round(completeness*.45+consistency*.25+granularity*.20+100*.10);const issues=[];
 if(cols<2)issues.push('Dữ liệu chỉ có một cột hoặc chưa tách cột đúng.');if(missing>30)issues.push('Tỷ lệ ô trống cao hơn 30%.');if(dupPct>20)issues.push('Tỷ lệ dòng trùng cao hơn 20%.');
 return {score,rows:Math.max(0,nonempty.length-1),cols,missing,duplicates:dup,blocking:cols<2||nonempty.length<2,technical_blocker:cols<2||nonempty.length<2,issues};
}
async function analyzeFile(file){
 const lower=file.name.toLowerCase();
 if(file.size>MAX_FILE_SIZE)return {score:0,rows:0,cols:0,missing:0,duplicates:0,blocking:true,technical_blocker:true,sheets:0,tags:[],issues:['File vượt 25MB/file. Vui lòng tách file hoặc gửi link Google Sheets/Drive.']};
 if(!/\.(xlsx|xls|csv)$/i.test(lower))return {score:0,rows:0,cols:0,missing:0,duplicates:0,blocking:true,technical_blocker:true,sheets:0,tags:[],issues:['Định dạng chưa hỗ trợ. Vui lòng dùng .xlsx, .xls hoặc .csv.']};
 if(lower.endsWith('.csv')){
  const text=await readAsText(file),lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);const delim=(lines[0]||'').split(';').length>(lines[0]||'').split(',').length?';':',';
  const rows=lines.map(l=>l.split(delim));const sample=lines.slice(0,40).join(' ');
  return Object.assign(analyzeMatrix(rows),{sheets:1,tags:mergeTags(tagText(file.name),tagText(sample))});
 }
 const XLSX=await loadXlsx(),buf=await readAsArrayBuffer(file),wb=XLSX.read(buf,{type:'array',cellDates:true});
 let matrices=wb.SheetNames.map(n=>({name:n,rows:XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''})}));
 const main=matrices.slice().sort((a,b)=>b.rows.length-a.rows.length)[0]||{rows:[]};
 const sample=matrices.map(m=>m.name+' '+m.rows.slice(0,20).map(r=>r.join(' ')).join(' ')).join(' ');
 return Object.assign(analyzeMatrix(main.rows),{sheets:wb.SheetNames.length,tags:mergeTags(tagText(file.name),tagText(sample))});
}
function inferCoverage(uploads){
 const tags=new Set();(uploads||[]).forEach(u=>{const s=u.summary||{};(s.data_tags||u.data_tags||[]).forEach(t=>tags.add(t));if(u.type==='sheet')tags.add('source_link');});
 const has=t=>tags.has(t);let coverage=0;const gaps=[];
 if(has('finance'))coverage+=28;else gaps.push({code:'DATA_GAP_FINANCE',severity:'MEDIUM',title:'Cần tổng quan doanh thu, lợi nhuận 6-12 tháng',detail:'Ưu tiên P&L hoặc báo cáo doanh thu/lợi nhuận theo tháng để VCPC dựng baseline BizHealth.'});
 if(has('sales_breakdown'))coverage+=18;else gaps.push({code:'DATA_GAP_SALES_BREAKDOWN',severity:'MEDIUM',title:'Cần doanh thu theo kênh bán / nhóm sản phẩm',detail:'Giúp phân tích kênh, nhóm sản phẩm, chi nhánh hoặc dịch vụ nào tạo doanh thu/lợi nhuận thật.'});
 if(has('cost'))coverage+=18;else gaps.push({code:'DATA_GAP_COST',severity:'MEDIUM',title:'Cần chi phí marketing, thuê mặt bằng, nhân sự và chi phí vận hành',detail:'Giúp xác định điểm rò rỉ lợi nhuận, cost driver và khu vực cần tối ưu.'});
 if(has('cash'))coverage+=14;else gaps.push({code:'DATA_GAP_CASH',severity:'LOW',title:'Nên bổ sung dòng tiền, công nợ, nợ vay',detail:'Không chặn intake, nhưng cần để phân tích sức khỏe dòng tiền và vốn lưu động.'});
 if(has('org_people'))coverage+=10;else gaps.push({code:'DATA_GAP_ORG_OWNER',severity:'LOW',title:'Nên bổ sung sơ đồ tổ chức / người phụ trách dữ liệu',detail:'Giúp VCPC xác định Data Owner và người xử lý từng nhóm dữ liệu.'});
 if(has('systems'))coverage+=7;else gaps.push({code:'DATA_GAP_SYSTEM_MAP',severity:'LOW',title:'Nên bổ sung hệ thống dữ liệu đang dùng',detail:'Ví dụ kế toán/POS/CRM/HRM/Google Sheets để xác định nguồn sự thật và cadence cập nhật.'});
 if(has('source_link'))coverage=Math.max(coverage,30);
 coverage=Math.min(100,coverage+5);
 const summary={tags:Array.from(tags),coverage,gaps};
 summary.ai_explanation=coverage>=60?'Dữ liệu ban đầu đủ để VCPC bắt đầu phân tích intake. Các mục còn thiếu sẽ được chuyển thành Data Gap để chuyên viên trao đổi bổ sung trước khi publish dashboard.':'Đã nhận nguồn dữ liệu nhưng coverage còn thấp. VCPC vẫn có thể tiếp nhận hồ sơ, sau đó cần ưu tiên bổ sung các nhóm dữ liệu trọng yếu trước khi dựng dashboard hoàn chỉnh.';
 return summary;
}
function upsertGapIssues(gapSummary){
 const ds=ensureDataset();const existing=getIssues();
 (gapSummary.gaps||[]).forEach(g=>{
  if(existing.some(i=>i.code===g.code&&i.status==='OPEN'))return;
  VCPC_DB.insert('validation_issues',{dataset_version_id:ds.id,organization_id:eng.organization_id,severity:g.severity||'LOW',code:g.code,title:g.title,detail:g.detail,status:'OPEN',source:'intake_ai_gap'});
 });
}
function ringFor(score){const len=427;return Math.max(0,len-(score/100)*len);}
function recompute(){
 const list=getUploads();const issues=getIssues();const gap=inferCoverage(list);const totalRows=list.reduce((s,x)=>s+Number(x.rows||0),0);
 document.getElementById('fileList').innerHTML=list.length?list.map(f=>{const s=f.summary||{};const status={received:'Đã nhận',uploaded:'Đã nhận',needs_review:'Cần review',access_pending:'Chờ xác minh quyền',validation_failed:'Lỗi kỹ thuật',received_admin:'Admin bổ sung'}[f.status]||f.status||'Đã nhận';return '<div style="display:flex;justify-content:space-between;gap:12px;background:#fff;border:1px solid rgba(7,31,61,.10);border-radius:10px;padding:10px 14px;"><div><b style="color:#071f3d;font-size:13.5px;">'+esc(f.file_name||f.name)+'</b><div style="font-size:12px;color:#5b6b80;margin-top:2px;">'+status+' · '+(f.rows||0)+' dòng · '+(f.sheets||1)+' sheet · Coverage '+(s.intake_coverage||gap.coverage||0)+'</div></div><button data-rm="'+f.id+'" style="background:transparent;border:0;color:#c7352b;font-weight:800;cursor:pointer;font-size:12px;">Xoá</button></div>';}).join(''):'<div style="color:#5b6b80;font-size:13px;padding:10px 0;">Chưa có nguồn dữ liệu nào.</div>';
 if(currentDataset){currentDataset=VCPC_DB.upsert('dataset_versions',Object.assign({},currentDataset,{status:'INTAKE',dqs_score:gap.coverage,intake_coverage:gap.coverage,row_count:totalRows,summary:{intake_gate:true,intake_coverage:gap.coverage,publish_target:publishTarget,upload_count:list.length,open_issues:issues.filter(x=>x.status==='OPEN').length,data_tags:gap.tags,data_gaps:gap.gaps,ai_explanation:gap.ai_explanation}}));}
 document.getElementById('dqsVal').textContent=gap.coverage;document.getElementById('dqsFill').setAttribute('stroke-dashoffset',ringFor(gap.coverage));
 const gauge=document.getElementById('dqsGauge');gauge.classList.remove('warn','bad');if(gap.coverage<40)gauge.classList.add('bad');else if(gap.coverage<60)gauge.classList.add('warn');
 const sub={finance:gap.tags.includes('finance')?100:0,sales:gap.tags.includes('sales_breakdown')?100:0,cost:gap.tags.includes('cost')?100:0,cash:gap.tags.includes('cash')?100:0,traceability:list.length?100:0};
 document.getElementById('dqsSub').innerHTML=[['Tài chính/P&L',sub.finance],['Doanh thu theo kênh/SP',sub.sales],['Chi phí chính',sub.cost],['Dòng tiền/công nợ',sub.cash],['Nguồn dữ liệu',sub.traceability]].map(x=>'<div style="display:flex;justify-content:space-between;align-items:center;"><span>'+x[0]+'</span><b style="color:'+(x[1]>=70?'#0d8a5d':x[1]>=40?'#c47a08':'#c7352b')+';">'+x[1]+'</b></div>').join('');
 const blockers=issues.filter(x=>x.status==='OPEN'&&x.severity==='CRITICAL');
 const gapHtml=(gap.gaps||[]).slice(0,4).map(g=>'· '+esc(g.title)).join('<br/>');
 document.getElementById('dqsIssues').innerHTML=gapHtml?'<div style="background:rgba(255,178,10,.07);border:1px solid rgba(255,178,10,.22);border-radius:10px;padding:10px 12px;font-size:12.5px;color:#7a5400;"><b>AI Data Gap sơ bộ</b><br/>'+gapHtml+'</div>':'';
 const verdict=document.getElementById('dqsVerdict'),btn=document.getElementById('continueBtn');
 if(!list.length){verdict.className='badge muted';verdict.textContent='Chưa có dữ liệu';btn.disabled=true;}
 else if(blockers.length){verdict.className='badge bad';verdict.textContent='CHẶN — lỗi kỹ thuật cần xử lý';btn.disabled=true;}
 else if(gap.coverage>=60){verdict.className='badge good';verdict.textContent='INTAKE PASS — VCPC sẽ review';btn.disabled=false;}
 else{verdict.className='badge warn';verdict.textContent='Đã nhận — cần bổ sung dữ liệu sau';btn.disabled=false;}
}
async function handleFiles(files){
 ensureDataset();const input=document.getElementById('fileInput');input.disabled=true;
 try{for(const file of Array.from(files)){
   const result=await analyzeFile(file);if(result.technical_blocker&&result.rows===0){alert(result.issues[0]||'File không hợp lệ.');continue;}
   const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=org.id+'/'+eng.id+'/'+currentDataset.id+'/'+Date.now()+'-'+safe;
   await VCPC_DB.uploadObject(path,file);
   const gapForFile=inferCoverage([{summary:{data_tags:result.tags||[]}}]);
   const up=VCPC_DB.insert('data_uploads',{engagement_id:eng.id,organization_id:eng.organization_id,dataset_version_id:currentDataset.id,name:file.name,file_name:file.name,storage_path:path,type:'file',mime_type:file.type||'',size_bytes:file.size,status:result.blocking?'needs_review':'received',dqs_score:result.score,intake_coverage:gapForFile.coverage,rows:result.rows,sheets:result.sheets,issues:result.issues.length,summary:{data_tags:result.tags||[],intake_coverage:gapForFile.coverage,ai_note:'Nguồn dữ liệu đã nhận. VCPC sẽ mapping, kiểm tra và yêu cầu bổ sung nếu cần trước khi publish dashboard.'},uploaded_by:(VCPC_DB.currentUser()||{}).email,uploaded_by_user:(VCPC_DB.currentUser()||{}).id});
   result.issues.forEach((title,i)=>VCPC_DB.insert('validation_issues',{dataset_version_id:currentDataset.id,organization_id:eng.organization_id,severity:result.technical_blocker&&i===0?'CRITICAL':'LOW',code:result.technical_blocker?'FILE_TECHNICAL_BLOCKER':'CLIENT_PRECHECK',title,detail:'Kiểm tra sơ bộ khi upload; không thay thế review của VCPC.',status:'OPEN'}));
   VCPC_DB.audit('UPLOAD_RECEIVED',{organization_id:eng.organization_id,engagement_id:eng.id,upload_id:up.id,file_name:file.name,intake_coverage:gapForFile.coverage});
 }}catch(e){alert('Không thể tải tệp: '+(e.message||e));}finally{try{upsertGapIssues(inferCoverage(getUploads()));}catch(_e){}input.disabled=false;input.value='';recompute();}
}
fetch('../assets/plans.json',{cache:'no-cache'}).then(r=>r.json()).then(plans=>{const p=[].concat(plans.bizhealth||[],plans.strategy_os||[]).find(x=>x.code===eng.plan_code);publishTarget=(p&&p.dqs_threshold)||70;document.getElementById('dqsThreshold').textContent=publishTarget+'%';ensureDataset();recompute();});
document.getElementById('dropzone').addEventListener('click',()=>document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change',e=>handleFiles(e.target.files));
document.getElementById('sheetBtn').addEventListener('click',function(){
 const url=document.getElementById('sheetUrl').value.trim();if(!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(url)){alert('Vui lòng nhập liên kết Google Sheets hợp lệ.');return;}
 ensureDataset();
 VCPC_DB.insert('data_uploads',{engagement_id:eng.id,organization_id:eng.organization_id,dataset_version_id:currentDataset.id,name:'Google Sheets',file_name:'Google Sheets',storage_path:url,type:'sheet',mime_type:'text/url',size_bytes:0,status:'access_pending',dqs_score:45,intake_coverage:30,rows:0,sheets:1,issues:1,summary:{data_tags:['source_link'],intake_coverage:30,ai_note:'Đã nhận link Google Sheets. VCPC cần xác minh quyền truy cập, sau đó mapping dữ liệu và yêu cầu bổ sung nếu cần.'},uploaded_by:(VCPC_DB.currentUser()||{}).email,uploaded_by_user:(VCPC_DB.currentUser()||{}).id});
 VCPC_DB.insert('validation_issues',{dataset_version_id:currentDataset.id,organization_id:eng.organization_id,severity:'MEDIUM',code:'GSHEET_ACCESS_PENDING',title:'Cần xác minh quyền truy cập Google Sheets',detail:'Đã nhận link. KH cần share Anyone with the link can view hoặc share Viewer cho email VCPC. Link: '+url,status:'OPEN',source:'intake'});
 try{upsertGapIssues(inferCoverage(getUploads()));}catch(_e){}
 document.getElementById('sheetUrl').value='';recompute();
});
document.getElementById('fileList').addEventListener('click',function(e){const b=e.target.closest('[data-rm]');if(!b)return;VCPC_DB.remove('data_uploads',{id:b.getAttribute('data-rm')});try{upsertGapIssues(inferCoverage(getUploads()));}catch(_e){}recompute();});
document.getElementById('continueBtn').addEventListener('click',function(){
 const list=getUploads(),issues=getIssues(),blockers=issues.filter(x=>x.status==='OPEN'&&x.severity==='CRITICAL');
 if(!list.length){alert('Vui lòng upload ít nhất một file hoặc dán link Google Sheets.');return;}
 if(blockers.length){alert('Có lỗi kỹ thuật nghiêm trọng cần xử lý trước khi tiếp tục.');return;}
 const gap=inferCoverage(list);upsertGapIssues(gap);
 currentDataset=VCPC_DB.upsert('dataset_versions',Object.assign({},currentDataset,{status:'READY_FOR_REVIEW',dqs_score:gap.coverage,intake_coverage:gap.coverage,row_count:list.reduce((s,x)=>s+Number(x.rows||0),0),summary:{intake_gate:true,intake_gate_pass:true,intake_coverage:gap.coverage,publish_target:publishTarget,upload_count:list.length,data_tags:gap.tags,data_gaps:gap.gaps,ai_explanation:gap.ai_explanation}}));
 VCPC_DB.audit('INTAKE_GATE_PASSED',{organization_id:eng.organization_id,engagement_id:eng.id,dataset_version_id:currentDataset.id,intake_coverage:gap.coverage,data_gaps:(gap.gaps||[]).map(g=>g.code)});
 window.location.href='scope.html';
});
ensureDataset();recompute();
`;

const adminDataGapHtml = String.raw`

            <div class="app-card" id="dataGapPanel">
              <div class="app-card-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <b>AI Data Gap &amp; Supplement Upload</b>
                <span id="dataGapCoverage" class="badge" style="font-size:12px;">Coverage: —</span>
              </div>
              <p style="font-size:12.5px;color:#5b6b80;line-height:1.6;margin-bottom:10px;">
                AI phân tích sơ bộ nhóm dữ liệu đã nhận, chỉ ra phần còn thiếu để chuyên viên VCPC trao đổi KH bổ sung trước khi publish dashboard. Đây là hỗ trợ review, không thay thế phê duyệt chuyên viên.
              </p>
              <div id="dataGapAiSummary" style="font-size:13px;line-height:1.65;color:#071f3d;background:#fff8e8;border:1px solid rgba(255,178,10,.26);border-radius:10px;padding:12px;margin-bottom:12px;"></div>
              <div id="dataGapList" style="display:grid;gap:8px;font-size:13px;margin-bottom:12px;"></div>
              <div style="border-top:1px solid rgba(7,31,61,.08);padding-top:12px;display:grid;gap:10px;">
                <b style="font-size:13px;color:#071f3d;">Upload bổ sung bởi chuyên viên VCPC</b>
                <input id="adminSupFileInput" type="file" multiple accept=".xlsx,.xls,.csv" style="display:none;"/>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button id="adminSupFileBtn" class="app-btn app-btn-primary" style="font-size:12.5px;">+ Upload file bổ sung</button>
                  <input id="adminSupSheetUrl" placeholder="Dán link Google Sheets bổ sung" style="flex:1;min-width:220px;border:1px solid rgba(7,31,61,.18);border-radius:10px;padding:10px 12px;font-family:inherit;font-size:12.5px;"/>
                  <button id="adminSupSheetBtn" class="app-btn app-btn-ghost" style="font-size:12.5px;">Thêm link</button>
                </div>
                <div id="adminSupStatus" style="font-size:12.5px;color:#5b6b80;min-height:18px;"></div>
              </div>
            </div>`;

const adminDataGapJs = String.raw`

/* ========== AI DATA GAP & SUPPLEMENT UPLOAD ========== */
function _gapTagsFromUploads(){const tags=new Set();UPLOADS.forEach(u=>{const s=u.summary||{};(s.data_tags||u.data_tags||[]).forEach(t=>tags.add(t));const n=String((u.name||'')+' '+(u.file_name||'')+' '+(u.type||'')).toLowerCase();if(/pnl|p&l|doanh thu|revenue|profit|financial|tài chính/.test(n))tags.add('finance');if(/channel|kênh|sku|product|sản phẩm|sales|chi nhánh|branch/.test(n))tags.add('sales_breakdown');if(/cost|chi phí|cogs|lease|rent|capex|marketing|payroll|nhân sự/.test(n))tags.add('cost');if(/cash|dòng tiền|ar\b|ap\b|debt|công nợ|nợ vay/.test(n))tags.add('cash');if(/org|headcount|role|team|nhân sự|hr/.test(n))tags.add('org_people');if(/sheet|google/.test(n)||u.type==='sheet')tags.add('source_link');});return Array.from(tags);}
function _gapCoverage(tags){let c=5;if(tags.includes('finance'))c+=28;if(tags.includes('sales_breakdown'))c+=18;if(tags.includes('cost'))c+=18;if(tags.includes('cash'))c+=14;if(tags.includes('org_people'))c+=10;if(tags.includes('systems'))c+=7;if(tags.includes('source_link'))c=Math.max(c,30);return Math.min(100,c);}
function _gapCatalog(tags){const g=[];if(!tags.includes('finance'))g.push(['DATA_GAP_FINANCE','MEDIUM','Cần tổng quan doanh thu, lợi nhuận 6-12 tháng','Ưu tiên P&L hoặc báo cáo doanh thu/lợi nhuận theo tháng.']);if(!tags.includes('sales_breakdown'))g.push(['DATA_GAP_SALES_BREAKDOWN','MEDIUM','Cần doanh thu theo kênh bán / nhóm sản phẩm','Giúp phân tích kênh, sản phẩm, chi nhánh hoặc dịch vụ nào tạo giá trị.']);if(!tags.includes('cost'))g.push(['DATA_GAP_COST','MEDIUM','Cần chi phí marketing, thuê mặt bằng, nhân sự','Giúp xác định điểm rò rỉ lợi nhuận và cost driver.']);if(!tags.includes('cash'))g.push(['DATA_GAP_CASH','LOW','Nên bổ sung dòng tiền, công nợ, nợ vay','Cần cho phân tích vốn lưu động và sức khỏe dòng tiền.']);if(!tags.includes('org_people'))g.push(['DATA_GAP_ORG_OWNER','LOW','Nên bổ sung sơ đồ tổ chức / Data Owner','Giúp xác định người phụ trách bổ sung và xác minh dữ liệu.']);return g;}
function renderDataGap(){
 const panel=document.getElementById('dataGapPanel');if(!panel)return;
 const issues=VCPC_DB.select('validation_issues',{organization_id:ORG_ID})||[];
 const tags=_gapTagsFromUploads();const coverage=_gapCoverage(tags);const catalog=_gapCatalog(tags);
 const openGaps=issues.filter(i=>String(i.code||'').indexOf('DATA_GAP_')===0||i.code==='GSHEET_ACCESS_PENDING');
 document.getElementById('dataGapCoverage').innerHTML='Coverage: <b style="color:'+dqsColor(coverage)+'">'+coverage+'%</b>';
 document.getElementById('dataGapAiSummary').innerHTML=(coverage>=60?'✓ <b>Đủ để bắt đầu review intake.</b> ':'⚠ <b>Coverage còn thấp.</b> ')+'Nguồn hiện có: '+(UPLOADS.length||0)+' upload/link. Nhóm dữ liệu nhận diện: '+(tags.length?tags.join(', '):'chưa rõ')+'. Dashboard chỉ nên publish sau khi chuyên viên đóng/waive các gap trọng yếu.';
 const rows=(openGaps.length?openGaps:catalog.map(x=>({code:x[0],severity:x[1],title:x[2],detail:x[3],status:'SUGGESTED'})));
 document.getElementById('dataGapList').innerHTML=rows.length?rows.map(g=>'<div style="padding:10px 12px;border-radius:9px;border:1px solid rgba(7,31,61,.10);background:#fff;display:grid;gap:6px;"><div style="display:flex;justify-content:space-between;gap:10px;"><b style="color:#071f3d;">'+g.title+'</b><span class="badge '+(g.severity==='MEDIUM'?'':'muted')+'">'+(g.severity||'LOW')+'</span></div><div style="color:#5b6b80;font-size:12.5px;">'+(g.detail||'')+'</div><div style="display:flex;gap:6px;flex-wrap:wrap;">'+(g.id?'<button class="app-btn app-btn-ghost" style="font-size:11.5px;padding:7px 10px;" onclick="markDataGap(\''+g.id+'\',\'REQUESTED\')">Yêu cầu KH bổ sung</button><button class="app-btn app-btn-ghost" style="font-size:11.5px;padding:7px 10px;" onclick="markDataGap(\''+g.id+'\',\'WAIVED\')">Waive</button><button class="app-btn app-btn-ghost" style="font-size:11.5px;padding:7px 10px;" onclick="markDataGap(\''+g.id+'\',\'RESOLVED\')">Đã xử lý</button>':'<button class="app-btn app-btn-ghost" style="font-size:11.5px;padding:7px 10px;" onclick="createSuggestedGap(\''+g.code+'\')">Tạo request</button>')+'</div></div>').join(''):'<div style="color:#0d8a5d;font-weight:700;">✓ Chưa phát hiện gap trọng yếu.</div>';
}
window.createSuggestedGap=function(code){const tags=_gapTagsFromUploads();const row=_gapCatalog(tags).find(x=>x[0]===code);if(!row||!ENG)return;try{VCPC_DB.insert('validation_issues',{dataset_version_id:null,organization_id:ORG_ID,severity:row[1],code:row[0],title:row[2],detail:row[3],status:'OPEN',source:'admin_ai_gap'});VCPC_DB.audit('DATA_GAP_CREATED',{organization_id:ORG_ID,engagement_id:ENG.id,code:row[0]});reloadData();showAlert('✓ Đã tạo data gap request','good');}catch(ex){showAlert('Không thể tạo data gap: '+ex.message,'bad');}};
window.markDataGap=function(id,status){try{const issue=(VCPC_DB.select('validation_issues',{id:id})||[])[0];if(!issue)return;VCPC_DB.upsert('validation_issues',Object.assign({},issue,{status:status,updated_at:Date.now()}));VCPC_DB.audit('DATA_GAP_STATUS_CHANGED',{organization_id:ORG_ID,engagement_id:ENG&&ENG.id,issue_id:id,status:status});reloadData();showAlert('✓ Đã cập nhật Data Gap: '+status,'good');}catch(ex){showAlert('Không thể cập nhật Data Gap: '+ex.message,'bad');}};
function bindDataGapSupplement(){
 const fileBtn=document.getElementById('adminSupFileBtn'),fileInput=document.getElementById('adminSupFileInput'),sheetBtn=document.getElementById('adminSupSheetBtn');
 if(fileBtn&&fileInput&&!fileBtn.dataset.bound){fileBtn.dataset.bound='1';fileBtn.addEventListener('click',()=>fileInput.click());fileInput.addEventListener('change',async function(e){const files=Array.from(e.target.files||[]);if(!files.length||!ENG)return;const st=document.getElementById('adminSupStatus');st.textContent='Đang upload bổ sung...';try{for(const file of files){if(file.size>25*1024*1024)throw new Error(file.name+' vượt 25MB');const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=ORG_ID+'/'+ENG.id+'/admin-supplement/'+Date.now()+'-'+safe;await VCPC_DB.uploadObject(path,file);VCPC_DB.insert('data_uploads',{engagement_id:ENG.id,organization_id:ORG_ID,name:file.name,file_name:file.name,storage_path:path,type:'admin_supplement',mime_type:file.type||'',size_bytes:file.size,status:'received_admin',dqs_score:60,intake_coverage:60,rows:0,sheets:1,issues:0,summary:{admin_supplement:true,ai_note:'File bổ sung bởi chuyên viên VCPC để xử lý Data Gap.'},uploaded_by:'vcpc_admin',uploaded_by_user:(VCPC_DB.currentUser()||{}).id});}VCPC_DB.audit('ADMIN_SUPPLEMENT_UPLOADED',{organization_id:ORG_ID,engagement_id:ENG.id,count:files.length});st.textContent='✓ Đã upload bổ sung.';reloadData();}catch(ex){st.textContent='Không thể upload bổ sung: '+ex.message;}finally{fileInput.value='';}});}
 if(sheetBtn&&!sheetBtn.dataset.bound){sheetBtn.dataset.bound='1';sheetBtn.addEventListener('click',function(){const url=document.getElementById('adminSupSheetUrl').value.trim();if(!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(url)){showAlert('Link Google Sheets không hợp lệ.','bad');return;}try{VCPC_DB.insert('data_uploads',{engagement_id:ENG.id,organization_id:ORG_ID,name:'Google Sheets bổ sung',file_name:'Google Sheets bổ sung',storage_path:url,type:'sheet',mime_type:'text/url',size_bytes:0,status:'access_pending_admin',dqs_score:50,intake_coverage:50,rows:0,sheets:1,issues:1,summary:{admin_supplement:true,data_tags:['source_link'],ai_note:'Link bổ sung bởi VCPC, cần xác minh quyền truy cập.'},uploaded_by:'vcpc_admin'});VCPC_DB.insert('validation_issues',{organization_id:ORG_ID,severity:'MEDIUM',code:'GSHEET_ACCESS_PENDING',title:'Cần xác minh quyền truy cập Google Sheets bổ sung',detail:url,status:'OPEN',source:'admin_supplement'});VCPC_DB.audit('ADMIN_SUPPLEMENT_SHEET_ADDED',{organization_id:ORG_ID,engagement_id:ENG.id,url:url});document.getElementById('adminSupSheetUrl').value='';reloadData();showAlert('✓ Đã thêm link bổ sung.','good');}catch(ex){showAlert('Không thể thêm link: '+ex.message,'bad');}});}
}
`;

export default async function transformUploadIntake(dist) {
  const uploadPath = path.join(dist, 'app', 'upload.html');
  let upload = await readFile(uploadPath, 'utf8');

  upload = upload.replace(
    /<p class="app-sub"[\s\S]*?<\/p>/,
    `<div class="app-sub" data-vi="Tải các file dữ liệu DN của bạn dạng .xlsx/.csv/.xls hoặc dán link Google Sheets, càng đầy đủ và chi tiết càng tốt để chúng tôi phân tích ban đầu. Sau có thể cập nhật và bổ sung." data-en="Upload company data files (.xlsx/.csv/.xls) or paste a Google Sheets link. The more complete and detailed, the better for initial analysis. You can update and supplement later.">Tải các file dữ liệu DN của bạn dạng .xlsx/.csv/.xls hoặc dán link Google Sheets, càng đầy đủ và chi tiết càng tốt để chúng tôi phân tích ban đầu. Sau có thể cập nhật và bổ sung.<div style="margin-top:12px;background:rgba(255,178,10,.08);border:1px solid rgba(255,178,10,.22);border-radius:12px;padding:12px 14px;color:#071f3d;font-size:13.5px;line-height:1.7;"><b>Thông tin ban đầu cần có:</b><br/>· Tổng quan doanh thu, lợi nhuận 6-12 tháng<br/>· Doanh thu theo kênh bán, nhóm sản phẩm<br/>· Chi phí: marketing, thuê mặt bằng, nhân sự...</div></div>`
  );
  upload = upload.replace('Upload & Data Gate · VCPC Auto', 'Upload Intake · VCPC Auto');
  upload = upload.replace('data-vi="Upload & Data Gate" data-en="Upload & Data Gate">Upload & Data Gate', 'data-vi="Upload & Intake Gate" data-en="Upload & Intake Gate">Upload & Intake Gate');
  upload = upload.replace('<div class="app-card-head"><b data-vi="Data Quality Score" data-en="Data Quality Score">Data Quality Score</b></div>', '<div class="app-card-head"><b data-vi="Intake Coverage" data-en="Intake Coverage">Intake Coverage</b></div>');
  upload = upload.replace(/<p style="color:#5b6b80;font-size:13\.5px;margin-bottom:14px;"[\s\S]*?<\/p>/, '<p style="color:#5b6b80;font-size:13.5px;margin-bottom:14px;" data-vi="Bước này chỉ cần dữ liệu ban đầu để VCPC bắt đầu kiểm tra. Nếu còn thiếu, hệ thống sẽ ghi nhận Data Gap để chuyên viên trao đổi và bổ sung trước khi publish dashboard." data-en="This step only needs initial data for VCPC review. Missing items will be captured as Data Gaps before dashboard publishing.">Bước này chỉ cần dữ liệu ban đầu để VCPC bắt đầu kiểm tra. Nếu còn thiếu, hệ thống sẽ ghi nhận Data Gap để chuyên viên trao đổi và bổ sung trước khi publish dashboard.</p>');
  upload = upload.replace('<span data-vi="Ngưỡng gói" data-en="Plan threshold">Ngưỡng gói</span>:', '<span data-vi="Mục tiêu publish" data-en="Publish target">Mục tiêu publish</span>:');
  upload = upload.replace(/<script>\s*if\(!VCPC_DB\.currentUser\(\)\)window\.location\.href='login\.html';[\s\S]*?<\/script>\s*<\/body>/, `<script>\n${uploadScript}\n</script>\n</body>`);
  if (!upload.includes('INTAKE PASS')) throw new Error('Upload intake script transform did not apply');
  await writeFile(uploadPath, upload, 'utf8');

  const adminPath = path.join(dist, 'admin', 'org-detail.html');
  let admin = await readFile(adminPath, 'utf8');
  if (!admin.includes('id="dataGapPanel"')) {
    admin = admin.replace(
      /(<div class="app-card">\s*<div class="app-card-head"><b>Phân tích lỗi dữ liệu<\/b><\/div>\s*<div id="issueList"[\s\S]*?<\/div>\s*<\/div>)/,
      `$1${adminDataGapHtml}`
    );
  }
  if (!admin.includes('AI DATA GAP & SUPPLEMENT UPLOAD')) {
    admin = admin.replace('/* ========== TAB: Dashboard ========== */', `${adminDataGapJs}\n\n/* ========== TAB: Dashboard ========== */`);
  }
  admin = admin.replace('renderData();\n   renderDashboard();', 'renderData();\n   renderDataGap();\n   bindDataGapSupplement();\n   renderDashboard();');
  if (!admin.includes('renderDataGap();')) throw new Error('Admin data gap render hook did not apply');
  await writeFile(adminPath, admin, 'utf8');

  console.log(`[${FIX_VERSION}] transformed upload intake gate and admin data gap workflow`);
}
