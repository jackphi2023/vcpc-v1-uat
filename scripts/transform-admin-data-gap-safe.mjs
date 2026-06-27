import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'admin-data-gap-safe-fallback-v1';

const adminDataGapHtml = String.raw`

            <div class="app-card" id="dataGapPanel">
              <div class="app-card-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <b>🤖 AI Data Gap &amp; Supplement Upload</b>
                <span id="dataGapCoverage" class="badge" style="font-size:12px;">Coverage: —</span>
              </div>
              <p style="font-size:12.5px;color:#5b6b80;line-height:1.6;margin-bottom:10px;">
                AI Data Gap chỉ hỗ trợ chuyên viên rà soát dữ liệu còn thiếu. Dashboard chỉ public cho KH sau khi VCPC review và approve.
              </p>
              <div id="dataGapAiSummary" style="font-size:13px;line-height:1.65;color:#071f3d;background:#fff8e8;border:1px solid rgba(255,178,10,.26);border-radius:10px;padding:12px;margin-bottom:12px;"></div>
              <div id="dataGapList" style="display:grid;gap:8px;font-size:13px;margin-bottom:12px;"></div>
              <div style="border-top:1px solid rgba(7,31,61,.08);padding-top:12px;display:grid;gap:10px;">
                <b style="font-size:13px;color:#071f3d;">Upload bổ sung bởi chuyên viên VCPC</b>
                <input id="adminSupFileInput" type="file" multiple accept=".xlsx,.xls,.csv,.pdf" style="display:none;"/>
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
function renderDataGap(){const panel=document.getElementById('dataGapPanel');if(!panel)return;const issues=VCPC_DB.select('validation_issues',{organization_id:ORG_ID})||[];const tags=_gapTagsFromUploads();const coverage=_gapCoverage(tags);const catalog=_gapCatalog(tags);const openGaps=issues.filter(i=>String(i.code||'').indexOf('DATA_GAP_')===0||i.code==='GSHEET_ACCESS_PENDING');document.getElementById('dataGapCoverage').innerHTML='Coverage: <b style="color:'+dqsColor(coverage)+'">'+coverage+'%</b>';document.getElementById('dataGapAiSummary').innerHTML=(coverage>=60?'✓ <b>Đủ để bắt đầu review intake.</b> ':'⚠ <b>Coverage còn thấp.</b> ')+'Nguồn hiện có: '+(UPLOADS.length||0)+' upload/link. Nhóm dữ liệu nhận diện: '+(tags.length?tags.join(', '):'chưa rõ')+'. Dashboard chỉ nên publish sau khi chuyên viên đóng/waive các gap trọng yếu.';const rows=(openGaps.length?openGaps:catalog.map(x=>({code:x[0],severity:x[1],title:x[2],detail:x[3],status:'SUGGESTED'})));document.getElementById('dataGapList').innerHTML=rows.length?rows.map(g=>'<div style="padding:10px 12px;border-radius:9px;border:1px solid rgba(7,31,61,.10);background:#fff;display:grid;gap:6px;"><div style="display:flex;justify-content:space-between;gap:10px;"><b style="color:#071f3d;">'+g.title+'</b><span class="badge '+(g.severity==='MEDIUM'?'':'muted')+'">'+(g.severity||'LOW')+'</span></div><div style="color:#5b6b80;font-size:12.5px;">'+(g.detail||'')+'</div><div style="display:flex;gap:6px;flex-wrap:wrap;">'+(g.id?'<button class="app-btn app-btn-ghost" style="font-size:11.5px;padding:7px 10px;" onclick="markDataGap(\''+g.id+'\',\'REQUESTED\')">Yêu cầu KH bổ sung</button><button class="app-btn app-btn-ghost" style="font-size:11.5px;padding:7px 10px;" onclick="markDataGap(\''+g.id+'\',\'WAIVED\')">Waive</button><button class="app-btn app-btn-ghost" style="font-size:11.5px;padding:7px 10px;" onclick="markDataGap(\''+g.id+'\',\'RESOLVED\')">Đã xử lý</button>':'<button class="app-btn app-btn-ghost" style="font-size:11.5px;padding:7px 10px;" onclick="createSuggestedGap(\''+g.code+'\')">Tạo request</button>')+'</div></div>').join(''):'<div style="color:#0d8a5d;font-weight:700;">✓ Chưa phát hiện gap trọng yếu.</div>';}
window.createSuggestedGap=function(code){const tags=_gapTagsFromUploads();const row=_gapCatalog(tags).find(x=>x[0]===code);if(!row||!ENG)return;try{VCPC_DB.insert('validation_issues',{dataset_version_id:null,organization_id:ORG_ID,severity:row[1],code:row[0],title:row[2],detail:row[3],status:'OPEN',source:'admin_ai_gap'});VCPC_DB.audit('DATA_GAP_CREATED',{organization_id:ORG_ID,engagement_id:ENG.id,code:row[0]});reloadData();showAlert('✓ Đã tạo data gap request','good');}catch(ex){showAlert('Không thể tạo data gap: '+ex.message,'bad');}};
window.markDataGap=function(id,status){try{const issue=(VCPC_DB.select('validation_issues',{id:id})||[])[0];if(!issue)return;VCPC_DB.upsert('validation_issues',Object.assign({},issue,{status:status,updated_at:Date.now()}));VCPC_DB.audit('DATA_GAP_STATUS_CHANGED',{organization_id:ORG_ID,engagement_id:ENG&&ENG.id,issue_id:id,status:status});reloadData();showAlert('✓ Đã cập nhật Data Gap: '+status,'good');}catch(ex){showAlert('Không thể cập nhật Data Gap: '+ex.message,'bad');}};
function bindDataGapSupplement(){const fileBtn=document.getElementById('adminSupFileBtn'),fileInput=document.getElementById('adminSupFileInput'),sheetBtn=document.getElementById('adminSupSheetBtn');if(fileBtn&&fileInput&&!fileBtn.dataset.bound){fileBtn.dataset.bound='1';fileBtn.addEventListener('click',()=>fileInput.click());fileInput.addEventListener('change',async function(e){const files=Array.from(e.target.files||[]);if(!files.length||!ENG)return;const st=document.getElementById('adminSupStatus');st.textContent='Đang upload bổ sung...';try{for(const file of files){if(file.size>25*1024*1024)throw new Error(file.name+' vượt 25MB');const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const p=ORG_ID+'/'+ENG.id+'/admin-supplement/'+Date.now()+'-'+safe;await VCPC_DB.uploadObject(p,file);VCPC_DB.insert('data_uploads',{engagement_id:ENG.id,organization_id:ORG_ID,name:file.name,file_name:file.name,storage_path:p,type:'admin_supplement',mime_type:file.type||'',size_bytes:file.size,status:'received_admin',dqs_score:60,intake_coverage:60,rows:0,sheets:1,issues:0,summary:{admin_supplement:true,ai_note:'File bổ sung bởi chuyên viên VCPC để xử lý Data Gap.'},uploaded_by:'vcpc_admin',uploaded_by_user:(VCPC_DB.currentUser()||{}).id});}VCPC_DB.audit('ADMIN_SUPPLEMENT_UPLOADED',{organization_id:ORG_ID,engagement_id:ENG.id,count:files.length});st.textContent='✓ Đã upload bổ sung.';reloadData();}catch(ex){st.textContent='Không thể upload bổ sung: '+ex.message;}finally{fileInput.value='';}});}if(sheetBtn&&!sheetBtn.dataset.bound){sheetBtn.dataset.bound='1';sheetBtn.addEventListener('click',function(){const url=document.getElementById('adminSupSheetUrl').value.trim();if(!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(url)){showAlert('Link Google Sheets không hợp lệ.','bad');return;}try{VCPC_DB.insert('data_uploads',{engagement_id:ENG.id,organization_id:ORG_ID,name:'Google Sheets bổ sung',file_name:'Google Sheets bổ sung',storage_path:url,type:'sheet',mime_type:'text/url',size_bytes:0,status:'access_pending_admin',dqs_score:50,intake_coverage:50,rows:0,sheets:1,issues:1,summary:{admin_supplement:true,data_tags:['source_link'],ai_note:'Link bổ sung bởi VCPC, cần xác minh quyền truy cập.'},uploaded_by:'vcpc_admin'});VCPC_DB.insert('validation_issues',{organization_id:ORG_ID,severity:'MEDIUM',code:'GSHEET_ACCESS_PENDING',title:'Cần xác minh quyền truy cập Google Sheets bổ sung',detail:url,status:'OPEN',source:'admin_supplement'});VCPC_DB.audit('ADMIN_SUPPLEMENT_SHEET_ADDED',{organization_id:ORG_ID,engagement_id:ENG.id,url:url});document.getElementById('adminSupSheetUrl').value='';reloadData();showAlert('✓ Đã thêm link bổ sung.','good');}catch(ex){showAlert('Không thể thêm link: '+ex.message,'bad');}});}}
`;

function ensureReloadHook(admin) {
  if (admin.includes('renderDataGap();')) return admin;
  let next = admin.replace(/renderData\(\);\s*renderDashboard\(\);/, 'renderData();\n  renderDataGap();\n  bindDataGapSupplement();\n  renderDashboard();');
  if (next.includes('renderDataGap();')) return next;
  next = admin.replace('renderUsers();', 'renderDataGap();\n  bindDataGapSupplement();\n  renderUsers();');
  return next;
}

export default async function transformAdminDataGapSafe(dist) {
  const adminPath = path.join(dist, 'admin', 'org-detail.html');
  let admin = await readFile(adminPath, 'utf8');
  if (!admin.includes('id="dataGapPanel"')) {
    admin = admin.replace(/(<div class="app-card">\s*<div class="app-card-head"><b>Phân tích lỗi dữ liệu<\/b><\/div>\s*<div id="issueList"[\s\S]*?<\/div>\s*<\/div>)/, `$1${adminDataGapHtml}`);
  }
  if (!admin.includes('AI DATA GAP & SUPPLEMENT UPLOAD')) {
    admin = admin.replace('/* ========== TAB: Dashboard ========== */', `${adminDataGapJs}\n\n/* ========== TAB: Dashboard ========== */`);
  }
  admin = ensureReloadHook(admin);
  if (!admin.includes('renderDataGap();')) throw new Error('Admin data gap safe render hook did not apply');
  await writeFile(adminPath, admin, 'utf8');
  console.log(`[${FIX_VERSION}] ensured admin data gap workflow`);
}
