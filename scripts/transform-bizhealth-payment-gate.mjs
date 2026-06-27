import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'bizhealth-20-80-payment-gate-v2-report-ui';

function replaceOnce(source, search, replacement, label, required = true) {
  if (!source.includes(search)) {
    if (required) throw new Error(`Missing transform anchor: ${label}`);
    return source;
  }
  return source.replace(search, replacement);
}

const dashboardGateJs = String.raw`
// BizHealth commercial gate: after 20% payment + VCPC publish, customer sees Overview only.
// Full tabs and report download unlock only after final 80% payment.
const urlParams = new URLSearchParams(location.search);
const isVcpcPreview = urlParams.get('vcpc_preview') === '1';
function bizHealthPayments(){try{return VCPC_DB.select('payments',{engagement_id:eng.id})||[];}catch(e){return [];}}
function hasPaid(inst){return bizHealthPayments().some(function(p){return p.instalment===inst && p.status==='PAID';});}
function hasFullBizHealthAccess(){return isVcpcPreview || ['ACTIVE','ACTIVE_90D','READONLY'].includes(eng.state) || hasPaid('final') || eng.bizhealth_access==='FULL';}
function isOverviewOnlyPreview(){return !hasFullBizHealthAccess() && ['PREVIEW','PUBLISHED'].includes(eng.state);}
function updateBizHealthGateUI(){
 const limited=isOverviewOnlyPreview();
 const full=hasFullBizHealthAccess();
 const previewMark=document.getElementById('previewMark');
 const previewBanner=document.getElementById('bzPreviewBanner');
 const payGate=document.getElementById('bzPaymentGate');
 if(previewMark)previewMark.style.display=limited?'block':'none';
 if(previewBanner)previewBanner.style.display=limited?'flex':'none';
 if(payGate)payGate.style.display=limited?'flex':'none';
 document.body.classList.toggle('bizhealth-preview-limited', limited);
 document.body.classList.toggle('bizhealth-full-access', full);
 const reportBtn=document.getElementById('downloadReportBtn');
 if(reportBtn){reportBtn.disabled=limited;reportBtn.classList.toggle('locked',limited);reportBtn.textContent=limited?'🔒 Tải báo cáo':'⬇ Tải báo cáo';}
 if(limited){
   document.querySelectorAll('#bzNav a[data-tab]').forEach(function(a){
     const locked=a.getAttribute('data-tab')!=='overview';
     a.classList.toggle('locked',locked);
     if(locked&&!a.querySelector('.lock'))a.insertAdjacentHTML('beforeend','<small class="lock">🔒</small>');
   });
 }
}
function forceOverview(){
 document.querySelectorAll('.app-tabview').forEach(function(v){v.classList.toggle('active',v.getAttribute('data-tabview')==='overview');});
 document.querySelectorAll('#bzNav a').forEach(function(a){a.classList.toggle('active',a.getAttribute('data-tab')==='overview');});
 syncTitle();
}
`;

const diagnosticCss = String.raw`
  #bzNav a.locked{opacity:.55;cursor:not-allowed;position:relative;}
  #bzNav a.locked .lock{margin-left:auto;font-size:11px;color:#c7352b;}
  #downloadReportBtn.locked{opacity:.55;cursor:not-allowed;}
  .recs-diag-box{background:linear-gradient(135deg,#071f3d,#0d2d57);border-radius:16px;padding:22px 24px;margin-bottom:18px;color:#fff;border:1.5px solid rgba(255,178,10,.32);box-shadow:0 12px 36px rgba(7,31,61,.22);}
  .rdb-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
  .rdb-eyebrow{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#ffd36b;margin-bottom:4px;}
  .rdb-title{font-size:16px;font-weight:900;color:#fff;}
  .rdb-status{font-size:11.5px;font-weight:800;padding:5px 14px;border-radius:999px;white-space:nowrap;}
  .rdb-status.analyzing{background:rgba(255,178,10,.2);color:#ffd36b;}
  .rdb-status.limited{background:rgba(199,53,43,.28);color:#ffb0ac;}
  .rdb-status.full-access{background:rgba(13,138,93,.3);color:#6dffcb;}
  .rdb-impact{background:rgba(255,255,255,.08);border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
  .rdb-impact-num{font-size:26px;font-weight:900;color:#ffd36b;letter-spacing:-.5px;white-space:nowrap;}
  .rdb-impact-sub{font-size:12px;color:#c3d4e8;line-height:1.5;}
  .rdb-recs{display:grid;gap:6px;margin-bottom:16px;}
  .rdb-rec-item{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#dde8f6;padding:8px 12px;background:rgba(255,255,255,.06);border-radius:8px;line-height:1.4;}
  .rdb-rec-num{width:22px;height:22px;border-radius:6px;background:rgba(255,178,10,.22);color:#ffd36b;font-weight:900;font-size:11px;display:grid;place-items:center;flex:0 0 22px;margin-top:1px;}
  .rdb-actions{display:flex;gap:10px;flex-wrap:wrap;}
  .rdb-btn{padding:10px 18px;border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;border:0;transition:.15s;}
  .rdb-btn-gold{background:#ffb20a;color:#071f3d;}.rdb-btn-gold:hover{background:#ffc030;}
  .rdb-btn-ghost{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.18);}.rdb-btn-ghost:hover{background:rgba(255,255,255,.18);}
  .rdb-btn[disabled]{opacity:.45;cursor:not-allowed;pointer-events:none;}
  .rdb-disclaimer{font-size:11px;color:rgba(255,255,255,.58);margin-top:12px;line-height:1.5;font-style:italic;}
`;

const diagnosticJs = String.raw`

/* ── Báo cáo Chẩn đoán & Kiến nghị box ─────────────────────── */
function renderDiagRecsBox(){
 const el=document.getElementById('diagRecsBox');
 if(!el||!S)return;
 const full=hasFullBizHealthAccess();
 const limited=isOverviewOnlyPreview();
 const lang=(VCPC_I18N&&VCPC_I18N.current)||'vi';
 const recs=S.recommendations_seed||[];
 const totalImpact=recs.reduce(function(s,r){return s+(Number(r.impact)||0);},0)||15.6;
 const impactHigh=totalImpact.toFixed(1);
 const impactLow=(totalImpact*.55).toFixed(1);
 let statusHtml,statusCls;
 if(full){statusHtml=lang==='en'?'✓ Full access':'✓ Truy cập đầy đủ';statusCls='full-access';}
 else if(limited){statusHtml=lang==='en'?'🔒 Limited access':'🔒 Truy cập giới hạn';statusCls='limited';}
 else{statusHtml=lang==='en'?'⏳ VCPC analyzing':'⏳ VCPC đang phân tích';statusCls='analyzing';}
 const recItems=recs.slice(0,6).map(function(r,i){
   const title=lang==='en'&&r.title_en?r.title_en:(r.title_vi||r.title_en||'');
   return '<div class="rdb-rec-item"><span class="rdb-rec-num">'+(i+1)+'</span><span>'+title+'</span></div>';
 }).join('');
 const dlHint=lang==='en'?'Report unlocks after the remaining 80% payment':'Báo cáo chi tiết sẽ mở sau khi thanh toán 80% còn lại';
 const detailBtn='<button class="rdb-btn rdb-btn-gold" onclick="bzDetailClick()">'+(full?'':'🔒 ')+(lang==='en'?'View details →':'Xem chi tiết →')+'</button>';
 const dlBtn=full?'<button class="rdb-btn rdb-btn-ghost" onclick="bzDownloadReport()">'+(lang==='en'?'⬇ Download detailed report':'⬇ Download Báo cáo Phân tích chi tiết')+'</button>':'<button class="rdb-btn rdb-btn-ghost" disabled title="'+dlHint+'">'+(lang==='en'?'⬇ Download detailed report':'⬇ Download Báo cáo Phân tích chi tiết')+' 🔒</button>';
 el.innerHTML='<div class="recs-diag-box"><div class="rdb-head"><div><div class="rdb-eyebrow">VCPC BizHealth · Báo cáo phân tích</div><div class="rdb-title">Báo cáo Chẩn đoán &amp; Kiến nghị</div></div><span class="rdb-status '+statusCls+'">'+statusHtml+'</span></div><div class="rdb-impact"><div class="rdb-impact-num">~'+impactLow+' – '+impactHigh+' tỷ VND</div><div><div style="font-size:13px;font-weight:800;color:#fff;">'+(lang==='en'?'Total estimated impact / year':'Tổng tác động ước tính / năm')+'</div><div class="rdb-impact-sub">'+(lang==='en'?'From quantified recommendations · preliminary estimate, subject to VCPC review':'Từ các kiến nghị có lượng hoá được · ước tính sơ bộ, cần VCPC review/confirm')+'</div></div></div>'+(recItems?'<div class="rdb-recs">'+recItems+'</div>':'')+'<div class="rdb-actions">'+detailBtn+dlBtn+'</div><div class="rdb-disclaimer">'+(lang==='en'?'* Preliminary estimate from AI-analyzed data. Final figures require VCPC expert confirmation after the review session.':'* Ước tính sơ bộ từ dữ liệu AI phân tích. Con số cuối cần được chuyên gia VCPC xác nhận sau buổi review chi tiết.')+'</div></div>';
}
window.bzDetailClick=function(){
 if(!hasFullBizHealthAccess()){
   const g=document.getElementById('bzPaymentGate');if(g){g.style.display='flex';g.scrollIntoView({behavior:'smooth',block:'center'});}return;
 }
 document.querySelectorAll('#bzNav a').forEach(function(a){a.classList.toggle('active',a.getAttribute('data-tab')==='recs');});
 document.querySelectorAll('.app-tabview').forEach(function(v){v.classList.toggle('active',v.getAttribute('data-tabview')==='recs');});
 syncTitle();
};
window.bzDownloadReport=function(){
 if(!hasFullBizHealthAccess()){
   const g=document.getElementById('bzPaymentGate');if(g){g.style.display='flex';g.scrollIntoView({behavior:'smooth',block:'center'});}alert('Báo cáo chi tiết chỉ mở sau khi thanh toán 80% còn lại.');return;
 }
 const toast=document.createElement('div');
 toast.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;background:#0d8a5d;color:#fff;padding:13px 22px;border-radius:12px;font-family:Montserrat,sans-serif;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.18);';
 toast.textContent='📥 Đang chuẩn bị báo cáo...';document.body.appendChild(toast);
 setTimeout(function(){if(toast.parentNode)toast.parentNode.removeChild(toast);},2500);
 if(window.print)setTimeout(function(){window.print();},300);
};
`;

const adminCss = String.raw`
.data-gap-card{border:2px solid rgba(255,178,10,.22);background:linear-gradient(180deg,#fffdf8,#fff);}
.report-module{background:linear-gradient(135deg,#f8f9ff,#fff);border:2px solid rgba(255,178,10,.28);border-radius:14px;padding:20px 22px;}
.report-draft-area{background:#fff;border:1px solid rgba(7,31,61,.12);border-radius:12px;padding:18px;margin-top:14px;display:grid;gap:12px;}
.report-draft-area textarea{width:100%;min-height:110px;border:1px solid rgba(7,31,61,.15);border-radius:10px;padding:12px;font:inherit;font-size:13px;resize:vertical;line-height:1.6;box-sizing:border-box;}
.report-draft-area textarea:focus{outline:none;border-color:#ffb20a;box-shadow:0 0 0 3px rgba(255,178,10,.12);}
`;

const adminReportHtml = String.raw`

            <div class="report-module" id="bizHealthReportModule">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:4px;">
                <div>
                  <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7a5400;">Kết nối với Dashboard publish</div>
                  <div style="font-size:16px;font-weight:900;color:#071f3d;margin-top:3px;">📄 Báo cáo Phân tích Chi tiết</div>
                  <div style="font-size:12.5px;color:#5b6b80;margin-top:4px;line-height:1.5;">KH thanh toán 20%: VCPC có thể tạo/lưu nội bộ. KH thanh toán đủ 100% mới tải được.</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <span id="reportStatusBadge" class="badge" style="display:none;font-size:12px;"></span>
                  <button id="createReportBtn" class="app-btn app-btn-primary" type="button" style="font-size:12.5px;">✨ Tạo Báo cáo Phân tích Chi tiết</button>
                </div>
              </div>
              <div id="reportDraftArea" class="report-draft-area" style="display:none;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                  <div><b style="color:#071f3d;font-size:14px;">Draft Báo cáo</b><span id="reportVersionLabel" class="badge info" style="margin-left:8px;font-size:11px;"></span></div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button id="saveReportDraftBtn" class="app-btn app-btn-ghost" type="button" style="font-size:12px;">💾 Lưu nháp</button>
                    <button id="uploadReportDashboardBtn" class="app-btn app-btn-ghost" type="button" style="font-size:12px;">⬆ Upload lên Dashboard</button>
                    <button id="publicReportBtn" class="app-btn app-btn-primary" type="button" style="font-size:12px;">🌐 Public cho KH tải</button>
                  </div>
                </div>
                <div>
                  <label style="font-size:12.5px;font-weight:700;color:#5b6b80;display:block;margin-bottom:6px;">Executive Summary &amp; Ghi chú chuyên gia</label>
                  <textarea id="reportSummaryInput" placeholder="Nhập executive summary hoặc ghi chú cho báo cáo phân tích. Ví dụ: tổng tác động ước tính, 3 điểm cần ưu tiên xử lý, khuyến nghị về dòng tiền và timeline..."></textarea>
                  <div id="reportSaveStatus" style="font-size:12px;color:#5b6b80;min-height:16px;margin-top:4px;"></div>
                </div>
                <div id="reportPublicStatus" style="display:none;padding:10px 12px;border-radius:8px;background:#f0faf5;border:1px solid rgba(13,138,93,.2);font-size:13px;color:#0d8a5d;font-weight:700;"></div>
              </div>
            </div>`;

const adminReportJs = String.raw`

/* ========== BIZHEALTH REPORT MODULE ========== */
function _bizHealthReportKey(){return 'vcpc.bizhealth.report.'+(ORG_ID||'demo');}
function _loadBizHealthReport(){try{return JSON.parse(localStorage.getItem(_bizHealthReportKey())||'null');}catch(e){return null;}}
function _saveBizHealthReport(r){localStorage.setItem(_bizHealthReportKey(),JSON.stringify(r));return r;}
function renderReportModule(){
 const box=document.getElementById('bizHealthReportModule');if(!box)return;
 const isBizHealth=ENG&&ENG.product==='bizhealth';
 box.style.display=isBizHealth?'block':'none';
 if(!isBizHealth)return;
 const report=_loadBizHealthReport();
 const draft=document.getElementById('reportDraftArea'),badge=document.getElementById('reportStatusBadge'),btn=document.getElementById('createReportBtn');
 if(!draft||!badge||!btn)return;
 if(report){
  draft.style.display='grid';btn.textContent='+ Tạo phiên bản mới';btn.className='app-btn app-btn-ghost';badge.style.display='inline-flex';
  const stMap={draft:'Draft created',saved:'Đã lưu nháp',uploaded:'Đã upload Dashboard',published:'Đã public cho KH'};
  const clsMap={draft:'info',saved:'',uploaded:'info',published:'good'};
  badge.textContent=stMap[report.status]||report.status;badge.className='badge '+(clsMap[report.status]||'');
  const vl=document.getElementById('reportVersionLabel');if(vl)vl.textContent=report.version||'Draft';
  const ta=document.getElementById('reportSummaryInput');if(ta&&ta.value!==report.executive_summary)ta.value=report.executive_summary||'';
  const ps=document.getElementById('reportPublicStatus');if(ps){ps.style.display=report.status==='published'?'block':'none';ps.textContent='✓ Báo cáo đã public. KH thanh toán đủ 100% có thể tải từ Dashboard.';}
 }else{draft.style.display='none';badge.style.display='none';btn.textContent='✨ Tạo Báo cáo Phân tích Chi tiết';btn.className='app-btn app-btn-primary';}
}
function createBizHealthReport(){
 if(!ENG||ENG.product!=='bizhealth'){showAlert('Module báo cáo chỉ áp dụng BizHealth.','bad');return;}
 const d=new Date();
 const report={version:'Report v'+d.getDate()+'/'+(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2),status:'draft',executive_summary:'',created_by:'vcpc_admin',created_at:Date.now(),engagement_id:ENG.id,organization_id:ORG_ID};
 _saveBizHealthReport(report);VCPC_DB.audit('BIZHEALTH_REPORT_CREATED',{organization_id:ORG_ID,engagement_id:ENG.id,version:report.version});renderReportModule();showAlert('✓ Đã tạo draft báo cáo.','good');
}
function saveBizHealthReportDraft(nextStatus){
 const report=_loadBizHealthReport();if(!report){showAlert('Bấm Tạo Báo cáo trước.','bad');return null;}
 report.executive_summary=(document.getElementById('reportSummaryInput')||{}).value||'';report.status=nextStatus||'saved';report.saved_at=Date.now();_saveBizHealthReport(report);
 VCPC_DB.audit('BIZHEALTH_REPORT_SAVED',{organization_id:ORG_ID,engagement_id:ENG&&ENG.id,status:report.status});
 const ss=document.getElementById('reportSaveStatus');if(ss)ss.innerHTML='<span style="color:#0d8a5d;">💾 Đã lưu lúc '+new Date().toLocaleTimeString('vi-VN')+'</span>';
 renderReportModule();return report;
}
function uploadBizHealthReportToDashboard(){const r=saveBizHealthReportDraft('uploaded');if(r)showAlert('✓ Báo cáo đã gắn vào Dashboard nội bộ. KH chưa tải được trước khi thanh toán 100%.','good');}
function publicBizHealthReport(){const r=saveBizHealthReportDraft('published');if(r){r.published_at=Date.now();_saveBizHealthReport(r);VCPC_DB.audit('BIZHEALTH_REPORT_PUBLISHED',{organization_id:ORG_ID,engagement_id:ENG&&ENG.id,version:r.version});renderReportModule();showAlert('🌐 Báo cáo đã public. KH thanh toán đủ sẽ tải được.','good');}}
function bindReportModule(){
 const c=document.getElementById('createReportBtn');if(c&&!c.dataset.bound){c.dataset.bound='1';c.addEventListener('click',createBizHealthReport);}
 const s=document.getElementById('saveReportDraftBtn');if(s&&!s.dataset.bound){s.dataset.bound='1';s.addEventListener('click',function(){saveBizHealthReportDraft('saved');});}
 const u=document.getElementById('uploadReportDashboardBtn');if(u&&!u.dataset.bound){u.dataset.bound='1';u.addEventListener('click',uploadBizHealthReportToDashboard);}
 const p=document.getElementById('publicReportBtn');if(p&&!p.dataset.bound){p.dataset.bound='1';p.addEventListener('click',publicBizHealthReport);}
}
`;

export default async function transformBizHealthPaymentGate(dist) {
  const paymentPath = path.join(dist, 'app', 'payment.html');
  let payment = await readFile(paymentPath, 'utf8');
  payment = replaceOnce(payment,
    '<p class="app-sub" data-vi="20% kích hoạt triển khai (BUILDING → AI QA → VCPC Review → Preview 48h). 80% còn lại kích hoạt dashboard đầy đủ sau preview." data-en="20% activates the build (BUILDING → AI QA → VCPC Review → 48h Preview). Remaining 80% fully activates the dashboard after preview.">20% kích hoạt triển khai → VCPC dựng → review → Preview 48h. 80% còn lại kích hoạt đầy đủ.</p>',
    '<p class="app-sub" data-vi="BizHealth: thanh toán 20% + upload data để VCPC review, bổ sung dữ liệu và dựng Dashboard. Sau khi VCPC public, KH xem trước tab Tổng quan. Thanh toán 80% còn lại để mở toàn bộ tab chi tiết và tải báo cáo. BizOS giữ nguyên logic hiện tại." data-en="BizHealth: pay 20% + upload data so VCPC can review, supplement data and build the dashboard. After VCPC publishes it, customers can preview the Overview tab. Pay the remaining 80% to unlock all detailed tabs and report download. BizOS keeps the current logic.">BizHealth: thanh toán 20% + upload data để VCPC review, bổ sung dữ liệu và dựng Dashboard. Sau khi VCPC public, KH xem trước tab Tổng quan. Thanh toán 80% còn lại để mở toàn bộ tab chi tiết và tải báo cáo. BizOS giữ nguyên logic hiện tại.</p>',
    'payment intro', false
  );
  payment = replaceOnce(payment,
    '<div class="kpi"><div class="lbl" data-vi="Đợt 1 (20%)" data-en="Instalment 1 (20%)">Đợt 1 (20%)</div><div class="val" style="font-size:22px;" id="amt1">—</div><div class="sub" data-vi="Kích hoạt build &amp; VCPC review" data-en="Activates build &amp; VCPC review">Kích hoạt build &amp; VCPC review</div></div>',
    '<div class="kpi"><div class="lbl" data-vi="Đợt 1 (20%)" data-en="Instalment 1 (20%)">Đợt 1 (20%)</div><div class="val" style="font-size:22px;" id="amt1">—</div><div class="sub" data-vi="BizHealth: chờ VCPC review &amp; build" data-en="BizHealth: VCPC review &amp; build">BizHealth: chờ VCPC review &amp; build</div></div>',
    'deposit wording', false
  );
  payment = replaceOnce(payment,
    '<div class="kpi"><div class="lbl" data-vi="Đợt 2 (80%)" data-en="Instalment 2 (80%)">Đợt 2 (80%)</div><div class="val" style="font-size:22px;" id="amt2">—</div><div class="sub" data-vi="Kích hoạt dashboard đầy đủ" data-en="Fully activates dashboard">Kích hoạt dashboard đầy đủ</div></div>',
    '<div class="kpi"><div class="lbl" data-vi="Đợt 2 (80%)" data-en="Instalment 2 (80%)">Đợt 2 (80%)</div><div class="val" style="font-size:22px;" id="amt2">—</div><div class="sub" data-vi="Mở full tabs &amp; tải báo cáo" data-en="Unlock full tabs &amp; report">Mở full tabs &amp; tải báo cáo</div></div>',
    'final wording', false
  );
  payment = payment.replace(/function advance\(inst\)\{[\s\S]*?\n\}/,
`function advance(inst){
  if(window.VCPC_CONFIG&&VCPC_CONFIG.BACKEND_READY) return;
  const isBizHealth = eng.product === 'bizhealth';
  if(inst==='deposit'){
    const e2=Object.assign({},eng,{state:'BUILDING',deposit_paid_at:Date.now(),bizhealth_access:isBizHealth?'BUILDING_AFTER_DEPOSIT':eng.bizhealth_access});
    VCPC_DB.upsert('engagements',e2);Object.assign(eng,e2);
  }else{
    const fs=eng.product==='strategy_os'?'ACTIVE':'ACTIVE_90D';
    const e2=Object.assign({},eng,{state:fs,final_paid_at:Date.now(),bizhealth_access:isBizHealth?'FULL':eng.bizhealth_access});
    VCPC_DB.upsert('engagements',e2);Object.assign(eng,e2);
  }
}`);
  payment = payment.replace("BUILDING:['⚙ VCPC đang dựng','⚙ VCPC building']", "BUILDING:[eng.product==='bizhealth'?'⚙ Chờ VCPC review & dựng Dashboard':'⚙ VCPC đang dựng',eng.product==='bizhealth'?'⚙ VCPC review & dashboard build':'⚙ VCPC building']");
  await writeFile(paymentPath, payment, 'utf8');

  const dashPath = path.join(dist, 'app', 'dashboard-bizhealth.html');
  let dash = await readFile(dashPath, 'utf8');
  dash = dash.replace('data-need-state="PREVIEW,ACTIVE,ACTIVE_90D,READONLY"', 'data-need-state="PUBLISHED,PREVIEW,ACTIVE,ACTIVE_90D,READONLY"');
  dash = replaceOnce(dash, '.tier-switch button.active{background:var(--app-navy);color:#fff;}', `.tier-switch button.active{background:var(--app-navy);color:#fff;}
${diagnosticCss}`, 'dashboard css');
  dash = replaceOnce(dash,
    '<button class="app-btn app-btn-ghost" id="refreshBtn" data-vi="↻ Làm mới" data-en="↻ Refresh">↻ Làm mới</button>',
    '<button class="app-btn app-btn-ghost" id="refreshBtn" data-vi="↻ Làm mới" data-en="↻ Refresh">↻ Làm mới</button><button class="app-btn app-btn-primary" id="downloadReportBtn" data-vi="⬇ Tải báo cáo" data-en="⬇ Download report">⬇ Tải báo cáo</button>',
    'dashboard report button'
  );
  dash = replaceOnce(dash,
    '<p data-vi="Đang ở chế độ <b>Preview 48h</b>. Số liệu đã VCPC review nhưng có watermark. Thanh toán đợt 2 để gỡ watermark và kích hoạt 90 ngày." data-en="You are in <b>48h Preview</b>. Numbers are VCPC-reviewed but watermarked. Pay instalment 2 to remove watermark and start the 90-day window."></p>',
    '<p data-vi="Đang ở chế độ <b>Preview giới hạn sau thanh toán 20%</b>. KH chỉ xem được tab Tổng quan Phân tích; các tab chi tiết và báo cáo tải xuống sẽ mở sau khi thanh toán 80% còn lại." data-en="You are in <b>limited preview after 20% payment</b>. Customers can view only the Overview tab; detailed tabs and report download unlock after the remaining 80% payment."></p>',
    'dashboard preview banner', false
  );
  dash = dash.replace('href="billing.html" class="app-btn app-btn-primary"', 'href="payment.html" class="app-btn app-btn-primary"');
  dash = replaceOnce(dash,
    '<div class="app-row-2" style="gap:18px;">\n        <div class="app-card">\n          <div class="app-card-head"><b data-vi="Doanh thu theo tháng vs kế hoạch vs online" data-en="Monthly revenue vs plan vs online">Doanh thu theo tháng vs kế hoạch vs online</b><small>tỷ VND</small></div>',
    '<div id="diagRecsBox"></div>\n\n      <div class="app-row-2" style="gap:18px;">\n        <div class="app-card">\n          <div class="app-card-head"><b data-vi="Doanh thu theo tháng vs kế hoạch vs online" data-en="Monthly revenue vs plan vs online">Doanh thu theo tháng vs kế hoạch vs online</b><small>tỷ VND</small></div>',
    'diagnostic box anchor'
  );
  dash = replaceOnce(dash,
    "const eng = VCPC_DB.currentEngagement() || { plan_code: 'BIZHEALTH_STANDARD', product: 'bizhealth', state: 'PREVIEW' };\nlet tier = (eng.plan_code === 'BIZHEALTH_PREMIUM') ? 'premium' : 'standard';",
    "const eng = VCPC_DB.currentEngagement() || { plan_code: 'BIZHEALTH_STANDARD', product: 'bizhealth', state: 'PREVIEW' };\nlet tier = (eng.plan_code === 'BIZHEALTH_PREMIUM') ? 'premium' : 'standard';\n" + dashboardGateJs,
    'dashboard gate js'
  );
  dash = dash.replace(/\/\/ Show preview watermark \+ banner if in PREVIEW state[\s\S]*?refreshPreviewUI\(\);/, `// Show commercial preview gate for BizHealth.
function refreshPreviewUI(){ updateBizHealthGateUI(); }
refreshPreviewUI();`);
  dash = replaceOnce(dash,
    "return '<a href=\"#\" data-tab=\"'+t.key+'\" class=\"'+(i===0?'active':'')+'\"><span>'+t[lang]+'</span></a>';",
    "return '<a href=\"#\" data-tab=\"'+t.key+'\" class=\"'+(i===0?'active':'')+(isOverviewOnlyPreview()&&t.key!=='overview'?' locked':'')+'\"><span>'+t[lang]+'</span>'+(isOverviewOnlyPreview()&&t.key!=='overview'?'<small class=\"lock\">🔒</small>':'')+'</a>';",
    'dashboard nav lock'
  );
  dash = replaceOnce(dash,
    "const key = a.getAttribute('data-tab');\n  document.querySelectorAll('.app-tabview').forEach(function(v){ v.classList.toggle('active', v.getAttribute('data-tabview') === key); });",
    "const key = a.getAttribute('data-tab');\n  if(isOverviewOnlyPreview() && key !== 'overview'){\n    document.getElementById('bzPaymentGate').style.display='flex';\n    forceOverview();\n    return;\n  }\n  document.querySelectorAll('.app-tabview').forEach(function(v){ v.classList.toggle('active', v.getAttribute('data-tabview') === key); });",
    'dashboard nav click gate'
  );
  dash = replaceOnce(dash,
    "document.addEventListener('vcpc:langchange', function(){ buildNav(); syncTitle(); render(); });",
    "document.addEventListener('vcpc:langchange', function(){ buildNav(); syncTitle(); updateBizHealthGateUI(); render(); });\ndocument.getElementById('downloadReportBtn').addEventListener('click', function(){ bzDownloadReport(); });",
    'dashboard lang/download hook'
  );
  dash = replaceOnce(dash,
    "function render(){\n  const lang = (VCPC_I18N && VCPC_I18N.current) || 'vi';",
    "function render(){\n  updateBizHealthGateUI();\n  const lang = (VCPC_I18N && VCPC_I18N.current) || 'vi';",
    'dashboard render gate'
  );
  dash = replaceOnce(dash, '\nrender();\n', diagnosticJs + '\nrender();\n', 'diagnostic js insert');
  await writeFile(dashPath, dash, 'utf8');

  const adminPath = path.join(dist, 'admin', 'org-detail.html');
  let admin = await readFile(adminPath, 'utf8');
  admin = replaceOnce(admin, '</style>', `${adminCss}\n</style>`, 'admin css');
  admin = admin.replace('<div class="app-card" id="dataGapPanel">', '<div class="app-card data-gap-card" id="dataGapPanel">');
  admin = admin.replace('<b>AI Data Gap &amp; Supplement Upload</b>', '<b>🤖 AI Data Gap &amp; Supplement Upload</b>');
  admin = admin.replace('AI phân tích sơ bộ nhóm dữ liệu đã nhận, chỉ ra phần còn thiếu để chuyên viên VCPC trao đổi KH bổ sung trước khi publish dashboard. Đây là hỗ trợ review, không thay thế phê duyệt chuyên viên.', 'AI Data Gap chỉ hỗ trợ chuyên viên rà soát dữ liệu còn thiếu. Dashboard chỉ public cho KH sau khi VCPC review và approve.');
  admin = admin.replace('accept=".xlsx,.xls,.csv"', 'accept=".xlsx,.xls,.csv,.pdf"');
  admin = replaceOnce(admin,
    '<div id="promptStatus" style="margin-top:8px;font-size:12.5px;min-height:20px;"></div>\n            </div>',
    '<div id="promptStatus" style="margin-top:8px;font-size:12.5px;min-height:20px;"></div>\n            </div>' + adminReportHtml,
    'admin report module html'
  );
  admin = admin.replace(
    "html += btn('act-btn act-success','openPreviewBtn','👁 Mở Preview 48h cho KH');",
    "html += btn('act-btn act-success','openPreviewBtn', ENG && ENG.product==='bizhealth' ? '👁 Public Preview giới hạn cho KH' : '👁 Mở Preview 48h cho KH');"
  );
  admin = admin.replace(
    "html += '<div style=\"font-size:11.5px;color:#5b6b80;line-height:1.5;padding:0 2px;\">KH nhận email thông báo + tài khoản để truy cập dashboard trong 48 giờ.</div>';",
    "html += '<div style=\"font-size:11.5px;color:#5b6b80;line-height:1.5;padding:0 2px;\">' + (ENG && ENG.product==='bizhealth' ? 'BizHealth: KH chỉ xem tab Tổng quan Phân tích; khóa tab chi tiết và tải báo cáo cho đến khi thanh toán 80%.' : 'KH nhận email thông báo + tài khoản để truy cập dashboard trong 48 giờ.') + '</div>';"
  );
  admin = admin.replace(
    "try{const current=VERSIONS.find(v=>v.status==='current'||v.status==='draft')||{};const r=VCPC_DB.callFunction('admin-publish-dashboard',{engagement_id:ENG.id,title:'Dashboard điều hành',config:{source_version_id:current.id||null,note:current.note||''}});if(!r||r.error)throw new Error(r&&r.error||'PUBLISH_FAILED');reloadData();showAlert('✅ Preview 48h đã mở.','good');}",
    "try{const current=VERSIONS.find(v=>v.status==='current'||v.status==='draft')||{};const r=VCPC_DB.callFunction('admin-publish-dashboard',{engagement_id:ENG.id,title:'Dashboard điều hành',config:{source_version_id:current.id||null,note:current.note||'',access_mode:ENG.product==='bizhealth'?'overview_only_until_final_payment':'standard_preview'}});if(!r||r.error)throw new Error(r&&r.error||'PUBLISH_FAILED');if(ENG.product==='bizhealth'){const fresh=(VCPC_DB.select('engagements',{id:ENG.id})||[])[0]||ENG;VCPC_DB.upsert('engagements',Object.assign({},fresh,{state:'PREVIEW',bizhealth_access:'OVERVIEW_ONLY'}));}reloadData();showAlert(ENG.product==='bizhealth'?'✅ BizHealth Preview giới hạn đã public.':'✅ Preview 48h đã mở.','good');}"
  );
  admin = replaceOnce(admin, '/* ========== RELOAD & INIT ========== */', adminReportJs + '\n\n/* ========== RELOAD & INIT ========== */', 'admin report js');
  admin = replaceOnce(admin,
    'renderDashboard();\n   renderDataGap();\n   bindDataGapSupplement();',
    'renderDashboard();\n   renderDataGap();\n   bindDataGapSupplement();\n   renderReportModule();\n   bindReportModule();',
    'admin reload transformed hook', false
  );
  if (!admin.includes('renderReportModule();')) {
    admin = replaceOnce(admin,
      'renderDashboard();\n  renderUsers();',
      'renderDashboard();\n  renderReportModule();\n  bindReportModule();\n  renderUsers();',
      'admin reload source hook'
    );
  }
  await writeFile(adminPath, admin, 'utf8');

  if (!dash.includes('renderDiagRecsBox') || !dash.includes('diagRecsBox') || !admin.includes('bizHealthReportModule') || !payment.includes('bizhealth_access')) {
    throw new Error('BizHealth report UI transform did not apply');
  }
  console.log(`[${FIX_VERSION}] transformed BizHealth payment gate, overview report box, and admin report module`);
}
