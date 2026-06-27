import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'bizhealth-20-80-payment-gate-v1';

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

export default async function transformBizHealthPaymentGate(dist) {
  const paymentPath = path.join(dist, 'app', 'payment.html');
  let payment = await readFile(paymentPath, 'utf8');
  payment = payment.replace(
    '<p class="app-sub" data-vi="20% kích hoạt triển khai (BUILDING → AI QA → VCPC Review → Preview 48h). 80% còn lại kích hoạt dashboard đầy đủ sau preview." data-en="20% activates the build (BUILDING → AI QA → VCPC Review → 48h Preview). Remaining 80% fully activates the dashboard after preview.">20% kích hoạt triển khai → VCPC dựng → review → Preview 48h. 80% còn lại kích hoạt đầy đủ.</p>',
    '<p class="app-sub" data-vi="BizHealth: thanh toán 20% + upload data để VCPC review, bổ sung dữ liệu và dựng Dashboard. Sau khi VCPC public, KH xem trước tab Tổng quan. Thanh toán 80% còn lại để mở toàn bộ tab chi tiết và tải báo cáo. BizOS giữ nguyên logic hiện tại." data-en="BizHealth: pay 20% + upload data so VCPC can review, supplement data and build the dashboard. After VCPC publishes it, customers can preview the Overview tab. Pay the remaining 80% to unlock all detailed tabs and report download. BizOS keeps the current logic.">BizHealth: thanh toán 20% + upload data để VCPC review, bổ sung dữ liệu và dựng Dashboard. Sau khi VCPC public, KH xem trước tab Tổng quan. Thanh toán 80% còn lại để mở toàn bộ tab chi tiết và tải báo cáo. BizOS giữ nguyên logic hiện tại.</p>'
  );
  payment = payment.replace(
    "<div class=\"kpi\"><div class=\"lbl\" data-vi=\"Đợt 1 (20%)\" data-en=\"Instalment 1 (20%)\">Đợt 1 (20%)</div><div class=\"val\" style=\"font-size:22px;\" id=\"amt1\">—</div><div class=\"sub\" data-vi=\"Kích hoạt build &amp; VCPC review\" data-en=\"Activates build &amp; VCPC review\">Kích hoạt build &amp; VCPC review</div></div>",
    "<div class=\"kpi\"><div class=\"lbl\" data-vi=\"Đợt 1 (20%)\" data-en=\"Instalment 1 (20%)\">Đợt 1 (20%)</div><div class=\"val\" style=\"font-size:22px;\" id=\"amt1\">—</div><div class=\"sub\" data-vi=\"BizHealth: chờ VCPC review &amp; build\" data-en=\"BizHealth: VCPC review &amp; build\">BizHealth: chờ VCPC review &amp; build</div></div>"
  );
  payment = payment.replace(
    "<div class=\"kpi\"><div class=\"lbl\" data-vi=\"Đợt 2 (80%)\" data-en=\"Instalment 2 (80%)\">Đợt 2 (80%)</div><div class=\"val\" style=\"font-size:22px;\" id=\"amt2\">—</div><div class=\"sub\" data-vi=\"Kích hoạt dashboard đầy đủ\" data-en=\"Fully activates dashboard\">Kích hoạt dashboard đầy đủ</div></div>",
    "<div class=\"kpi\"><div class=\"lbl\" data-vi=\"Đợt 2 (80%)\" data-en=\"Instalment 2 (80%)\">Đợt 2 (80%)</div><div class=\"val\" style=\"font-size:22px;\" id=\"amt2\">—</div><div class=\"sub\" data-vi=\"Mở full tabs &amp; tải báo cáo\" data-en=\"Unlock full tabs &amp; report\">Mở full tabs &amp; tải báo cáo</div></div>"
  );
  payment = payment.replace(
    /function advance\(inst\)\{[\s\S]*?\n\}/,
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
}`
  );
  payment = payment.replace(
    "BUILDING:['⚙ VCPC đang dựng','⚙ VCPC building']",
    "BUILDING:[eng.product==='bizhealth'?'⚙ Chờ VCPC review & dựng Dashboard':'⚙ VCPC đang dựng',eng.product==='bizhealth'?'⚙ VCPC review & dashboard build':'⚙ VCPC building']"
  );
  await writeFile(paymentPath, payment, 'utf8');

  const dashPath = path.join(dist, 'app', 'dashboard-bizhealth.html');
  let dash = await readFile(dashPath, 'utf8');
  dash = dash.replace('data-need-state="PREVIEW,ACTIVE,ACTIVE_90D,READONLY"', 'data-need-state="PUBLISHED,PREVIEW,ACTIVE,ACTIVE_90D,READONLY"');
  dash = dash.replace(
    '.tier-switch button.active{background:var(--app-navy);color:#fff;}',
    `.tier-switch button.active{background:var(--app-navy);color:#fff;}
  #bzNav a.locked{opacity:.55;cursor:not-allowed;position:relative;}
  #bzNav a.locked .lock{margin-left:auto;font-size:11px;color:#c7352b;}
  #downloadReportBtn.locked{opacity:.55;cursor:not-allowed;}`
  );
  dash = dash.replace(
    '<button class="app-btn app-btn-ghost" id="refreshBtn" data-vi="↻ Làm mới" data-en="↻ Refresh">↻ Làm mới</button>',
    '<button class="app-btn app-btn-ghost" id="refreshBtn" data-vi="↻ Làm mới" data-en="↻ Refresh">↻ Làm mới</button><button class="app-btn app-btn-primary" id="downloadReportBtn" data-vi="⬇ Tải báo cáo" data-en="⬇ Download report">⬇ Tải báo cáo</button>'
  );
  dash = dash.replace(
    '<p data-vi="Đang ở chế độ <b>Preview 48h</b>. Số liệu đã VCPC review nhưng có watermark. Thanh toán đợt 2 để gỡ watermark và kích hoạt 90 ngày." data-en="You are in <b>48h Preview</b>. Numbers are VCPC-reviewed but watermarked. Pay instalment 2 to remove watermark and start the 90-day window."></p>',
    '<p data-vi="Đang ở chế độ <b>Preview giới hạn sau thanh toán 20%</b>. KH chỉ xem được tab Tổng quan Phân tích; các tab chi tiết và báo cáo tải xuống sẽ mở sau khi thanh toán 80% còn lại." data-en="You are in <b>limited preview after 20% payment</b>. Customers can view only the Overview tab; detailed tabs and report download unlock after the remaining 80% payment."></p>'
  );
  dash = dash.replace('href="billing.html" class="app-btn app-btn-primary"', 'href="payment.html" class="app-btn app-btn-primary"');
  dash = dash.replace(
    "const eng = VCPC_DB.currentEngagement() || { plan_code: 'BIZHEALTH_STANDARD', product: 'bizhealth', state: 'PREVIEW' };\nlet tier = (eng.plan_code === 'BIZHEALTH_PREMIUM') ? 'premium' : 'standard';",
    "const eng = VCPC_DB.currentEngagement() || { plan_code: 'BIZHEALTH_STANDARD', product: 'bizhealth', state: 'PREVIEW' };\nlet tier = (eng.plan_code === 'BIZHEALTH_PREMIUM') ? 'premium' : 'standard';\n" + dashboardGateJs
  );
  dash = dash.replace(
    /\/\/ Show preview watermark \+ banner if in PREVIEW state[\s\S]*?refreshPreviewUI\(\);/,
    `// Show commercial preview gate for BizHealth.
function refreshPreviewUI(){ updateBizHealthGateUI(); }
refreshPreviewUI();`
  );
  dash = dash.replace(
    "return '<a href=\"#\" data-tab=\"'+t.key+'\" class=\"'+(i===0?'active':'')+'\"><span>'+t[lang]+'</span></a>';",
    "return '<a href=\"#\" data-tab=\"'+t.key+'\" class=\"'+(i===0?'active':'')+(isOverviewOnlyPreview()&&t.key!=='overview'?' locked':'')+'\"><span>'+t[lang]+'</span>'+(isOverviewOnlyPreview()&&t.key!=='overview'?'<small class=\"lock\">🔒</small>':'')+'</a>';"
  );
  dash = dash.replace(
    "const key = a.getAttribute('data-tab');\n  document.querySelectorAll('.app-tabview').forEach(function(v){ v.classList.toggle('active', v.getAttribute('data-tabview') === key); });",
    "const key = a.getAttribute('data-tab');\n  if(isOverviewOnlyPreview() && key !== 'overview'){\n    document.getElementById('bzPaymentGate').style.display='flex';\n    forceOverview();\n    return;\n  }\n  document.querySelectorAll('.app-tabview').forEach(function(v){ v.classList.toggle('active', v.getAttribute('data-tabview') === key); });"
  );
  dash = dash.replace(
    "document.addEventListener('vcpc:langchange', function(){ buildNav(); syncTitle(); render(); });",
    "document.addEventListener('vcpc:langchange', function(){ buildNav(); syncTitle(); updateBizHealthGateUI(); render(); });\ndocument.getElementById('downloadReportBtn').addEventListener('click', function(){ if(isOverviewOnlyPreview()){document.getElementById('bzPaymentGate').style.display='flex';alert('Báo cáo chi tiết chỉ mở sau khi thanh toán 80% còn lại.');return;} window.print(); });"
  );
  dash = dash.replace(
    "function render(){\n  const lang = (VCPC_I18N && VCPC_I18N.current) || 'vi';",
    "function render(){\n  updateBizHealthGateUI();\n  const lang = (VCPC_I18N && VCPC_I18N.current) || 'vi';"
  );
  await writeFile(dashPath, dash, 'utf8');

  const adminPath = path.join(dist, 'admin', 'org-detail.html');
  let admin = await readFile(adminPath, 'utf8');
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
  await writeFile(adminPath, admin, 'utf8');

  if (!dash.includes('isOverviewOnlyPreview') || !payment.includes('bizhealth_access')) {
    throw new Error('BizHealth payment gate transform did not apply');
  }
  console.log(`[${FIX_VERSION}] transformed BizHealth payment gate`);
}
