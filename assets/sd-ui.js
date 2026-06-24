/* ============================================================
   VCPC Dashboard — UI (render + charts + interactions)
   ============================================================ */
(function(){
const D=VCPC.DATA, I=VCPC.I18N, CFG=VCPC.CONFIG, EN=VCPC.ENGINE, OW=VCPC.OWNERS;
let lang=localStorage.getItem('vcpc_lang')||'vi';
let cur=localStorage.getItem('vcpc_sdtab')||'overview';
const TABS=['overview','strategy','finance','branches','online','product','people','alerts','recommend','valuation'];
let ALERTS=EN.buildAlerts(), RECS=EN.buildRecommendations(), SV=EN.buildScoreValuation();
let recStatus={};
let bSort={key:'health',dir:1}, bFilter={region:'All',status:'All',format:'All',cohort:'All'}, heatMetric='health', rankBy='health';

/* ---------- helpers ---------- */
const C={navy:'#071f3d',navy3:'#0e2e4d',gold:'#d5a94f',gold2:'#e8c87f',blue:'#2c76d2',green:'#22a06b',orange:'#f59e0b',red:'#d94b4b',purple:'#6b5bb0',cyan:'#2898b8',grid:'#e7edf4',axis:'#7c8aa0'};
const SC={good:C.green,watch:C.blue,orange:C.orange,red:C.red};
const STAT={good:{vi:'Tốt',en:'Good'},watch:{vi:'Theo dõi',en:'Watch'},orange:{vi:'Cảnh báo',en:'At risk'},red:{vi:'Nguy cấp',en:'Critical'}};
const REG={South:{vi:'Miền Nam',en:'South'},North:{vi:'Miền Bắc',en:'North'},Central:{vi:'Miền Trung',en:'Central'}};
const FMT={Flagship:{vi:'Lớn',en:'Flagship'},Standard:{vi:'Tiêu chuẩn',en:'Standard'},Compact:{vi:'Nhỏ gọn',en:'Compact'}};
const COH={new:{vi:'Mới',en:'New'},ramp:{vi:'Đang ổn định',en:'Stabilising'},mature:{vi:'Trưởng thành',en:'Mature'}};
const LIFEK={new:'lifeNew',ack:'lifeAck',progress:'lifeProgress',closed:'lifeClosed',overdue:'lifeOverdue'};
const FEAS={high:'fHigh',medium:'fMedium',low:'fLow'};
const t=k=>(I.t[k]&&I.t[k][lang])||k;
const tt=o=>o==null?'':(typeof o==='string'?o:(o[lang]!==undefined?o[lang]:(o.vi!==undefined?o.vi:'')));
function n(v,d=1){ if(v==null||isNaN(v)) return '—'; let s=(Math.round(v*Math.pow(10,d))/Math.pow(10,d)).toFixed(d); if(lang==='vi') s=s.replace('.',','); return s; }
function ni(v){ let s=Math.round(v).toLocaleString('en-US'); if(lang==='vi') s=s.replace(/,/g,'.'); return s; }
const ty=v=>n(v,1), pc=v=>n(v,1)+'%';
function delta(v,inv){ const up=inv?v<0:v>=0; return `<span class="delta ${up?'up':'down'}">${v>=0?'▲':'▼'} ${n(Math.abs(v),1)}%</span>`; }
function ctxLine(parts){ return `<div class="ctx">${parts.join('<span class="sep">·</span>')}</div>`; }
function spark(vals,color){ const w=86,h=26,mn=Math.min(...vals),mx=Math.max(...vals),rg=(mx-mn)||1; const pts=vals.map((v,i)=>`${(i/(vals.length-1)*(w-2)+1).toFixed(1)},${(h-3-((v-mn)/rg)*(h-6)).toFixed(1)}`).join(' '); const up=vals[vals.length-1]>=vals[0]; return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color||(up?C.green:C.red)}" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>`; }
function kpiCard(label,val,unit,ctx){ return `<div class="kpi"><div class="label">${label}</div><div class="value">${val}${unit?`<span class="unit">${unit}</span>`:''}</div>${ctx}</div>`; }
function head(title,sub){ return `<div class="card-header"><h2 class="headline">${title}</h2>${sub?`<div class="sub">${sub}</div>`:''}</div>`; }
function ownerName(role){ return OW[role]?OW[role][lang]:role; }
function alertName(a){ if(a.scope==='branch') return a.entity.id+' '+a.entity.street; if(a.scope==='product'||a.scope==='channel') return tt(a.entity.name); return lang==='vi'?'Toàn công ty':'Company-wide'; }

/* ---------- canvas charts ---------- */
const CF="600 11px Inter, system-ui, sans-serif";
function ctxOf(id){ const c=document.getElementById(id); if(!c) return null; const r=c.getBoundingClientRect(); if(!r.width) return null; const d=window.devicePixelRatio||1, h=+c.getAttribute('height')||280; c.width=r.width*d; c.height=h*d; const x=c.getContext('2d'); x.scale(d,d); return {x,w:r.width,h}; }
function rr(x,X,Y,W,H,r){ if(H<0){Y+=H;H=-H;} r=Math.min(r,H/2,W/2); x.beginPath(); x.moveTo(X+r,Y); x.arcTo(X+W,Y,X+W,Y+H,r); x.arcTo(X+W,Y+H,X,Y+H,r); x.arcTo(X,Y+H,X,Y,r); x.arcTo(X,Y,X+W,Y,r); x.closePath(); x.fill(); }
function gridL(x,w,h,p){ x.strokeStyle=C.grid; x.lineWidth=1; for(let i=0;i<5;i++){ const y=p+(h-p*1.7)*(i/4); x.beginPath(); x.moveTo(p,y); x.lineTo(w-p,y); x.stroke(); } x.fillStyle=C.axis; x.font=CF; }
function lineChart(id,labels,series){ const o=ctxOf(id); if(!o)return; const {x,w,h}=o,p=42; x.clearRect(0,0,w,h); gridL(x,w,h,p); const mx=Math.max(...series.flatMap(s=>s.data))*1.16; const sx=i=>p+(w-p*2)*(i/(labels.length-1)), sy=v=>h-p-(h-p*1.8)*(v/mx);
  series.forEach(s=>{ if(s.fill){ const g=x.createLinearGradient(0,p,0,h-p); g.addColorStop(0,s.color+'33'); g.addColorStop(1,s.color+'00'); x.fillStyle=g; x.beginPath(); s.data.forEach((v,i)=>i?x.lineTo(sx(i),sy(v)):x.moveTo(sx(i),sy(v))); x.lineTo(sx(labels.length-1),h-p); x.lineTo(sx(0),h-p); x.closePath(); x.fill(); }
    x.strokeStyle=s.color; x.lineWidth=s.w||3; x.setLineDash(s.dash||[]); x.lineJoin='round'; x.beginPath(); s.data.forEach((v,i)=>i?x.lineTo(sx(i),sy(v)):x.moveTo(sx(i),sy(v))); x.stroke(); x.setLineDash([]);
    s.data.forEach((v,i)=>{ x.fillStyle='#fff'; x.beginPath(); x.arc(sx(i),sy(v),3.6,0,7); x.fill(); x.strokeStyle=s.color; x.lineWidth=2; x.stroke(); }); });
  x.fillStyle=C.axis; x.font=CF; x.textAlign='center'; labels.forEach((l,i)=>x.fillText(l,sx(i),h-14)); x.textAlign='left'; }
function barH(id,labels,vals,colorFn){ const o=ctxOf(id); if(!o)return; const {x,w,h}=o,p=104; x.clearRect(0,0,w,h); const mx=Math.max(...vals)*1.16, row=(h-16)/labels.length; x.font=CF;
  labels.forEach((l,i)=>{ const y=i*row+row*0.18, bw=(w-p-44)*(vals[i]/mx), col=colorFn?colorFn(i):C.blue; x.fillStyle='#eef2f7'; rr(x,p,y,w-p-44,row*0.46,6); x.fillStyle=col; rr(x,p,y,Math.max(bw,2),row*0.46,6); x.fillStyle=C.navy; x.font="600 11.5px Inter,sans-serif"; x.textAlign='right'; x.fillText(l,p-8,y+row*0.34); x.textAlign='left'; x.fillStyle=C.axis; x.fillText(n(vals[i],1),p+bw+6,y+row*0.34); }); }
function barV(id,labels,vals,color){ const o=ctxOf(id); if(!o)return; const {x,w,h}=o,p=42; x.clearRect(0,0,w,h); gridL(x,w,h,p); const mx=Math.max(...vals)*1.18, slot=(w-p*2)/vals.length, bw=slot*0.5; vals.forEach((v,i)=>{ const X=p+slot*i+(slot-bw)/2, bh=(h-p*1.8)*(v/mx), Y=h-p-bh; const g=x.createLinearGradient(0,Y,0,h-p); g.addColorStop(0,color); g.addColorStop(1,color+'b0'); x.fillStyle=g; rr(x,X,Y,bw,bh,6); x.fillStyle=C.axis; x.font=CF; x.textAlign='center'; x.fillText(labels[i],X+bw/2,h-14); x.fillStyle=C.navy; x.font="700 11px Inter,sans-serif"; x.fillText(n(v,1),X+bw/2,Y-6); x.textAlign='left'; }); }
function grouped(id,labels,a,b,c1,c2){ const o=ctxOf(id); if(!o)return; const {x,w,h}=o,p=42; x.clearRect(0,0,w,h); gridL(x,w,h,p); const mx=Math.max(...a,...b)*1.18, slot=(w-p*2)/labels.length, bw=slot*0.26; labels.forEach((l,i)=>{ const X=p+slot*i+slot*0.16; const ah=(h-p*1.8)*(a[i]/mx), bh=(h-p*1.8)*(b[i]/mx); x.fillStyle=c1; rr(x,X,h-p-ah,bw,ah,5); x.fillStyle=c2; rr(x,X+bw+5,h-p-bh,bw,bh,5); x.fillStyle=C.axis; x.font=CF; x.textAlign='center'; x.fillText(l,X+bw+2,h-14); x.textAlign='left'; }); }
function donut(id,vals,cols,centerLabel,centerSub){ const o=ctxOf(id); if(!o)return; const {x,w,h}=o; x.clearRect(0,0,w,h); const cx=w/2,cy=h/2,r=Math.min(w,h)*0.36,th=r*0.42,tot=vals.reduce((a,c)=>a+c,0); let a=-Math.PI/2; vals.forEach((v,i)=>{ const arc=v/tot*Math.PI*2; x.beginPath(); x.strokeStyle=cols[i]; x.lineWidth=th; x.lineCap='butt'; x.arc(cx,cy,r,a+0.02,a+arc-0.02); x.stroke(); a+=arc; }); x.fillStyle=C.navy; x.font="800 22px Inter,sans-serif"; x.textAlign='center'; x.fillText(centerLabel,cx,cy-2); x.fillStyle=C.axis; x.font="600 10.5px Inter,sans-serif"; x.fillText(centerSub||'',cx,cy+15); x.textAlign='left'; }
function waterfall(id){ const o=ctxOf(id); if(!o)return; const {x,w,h}=o,p=42; x.clearRect(0,0,w,h); gridL(x,w,h,p); const f=D.company.finance; const rev=f.reduce((s,m)=>s+m.rev,0), cogs=f.reduce((s,m)=>s+m.cogs,0), gp=f.reduce((s,m)=>s+m.gp,0), opex=f.reduce((s,m)=>s+m.opex,0), eb=f.reduce((s,m)=>s+m.ebitda,0); const labels=lang==='vi'?['Doanh thu','Giá vốn','Lãi gộp','Chi phí VH','EBITDA']:['Revenue','COGS','Gross profit','OPEX','EBITDA']; const vals=[rev,-cogs,gp,-opex,eb]; const mx=rev*1.05, zero=h-p, slot=(w-p*2)/labels.length, bw=slot*0.5; let cum=0; labels.forEach((l,i)=>{ const X=p+slot*i+(slot-bw)/2, val=vals[i]; let base=(i===0||i===2||i===4)?0:cum; if(i===0)cum=val; else if(i===1)cum+=val; else if(i===2)cum=val; else if(i===3)cum+=val; else cum=val; const y1=zero-(Math.max(base,base+val)/mx)*(h-p*1.8), y2=zero-(Math.min(base,base+val)/mx)*(h-p*1.8); x.fillStyle=val<0?C.red:(i===4?C.green:C.blue); rr(x,X,y1,bw,Math.max(3,y2-y1),5); x.fillStyle=C.navy; x.font="700 11px Inter,sans-serif"; x.textAlign='center'; x.fillText(n(Math.abs(val),1),X+bw/2,y1-6); x.fillStyle=C.axis; x.font=CF; x.fillText(l,X+bw/2,h-14); x.textAlign='left'; }); }

/* ============================================================
   RENDER PER TAB
   ============================================================ */
const view=()=>document.getElementById('view');
function setHeader(){ const pg=I.pages[cur][lang]; document.getElementById('pageTitle').textContent=pg[0]; document.getElementById('pageSub').textContent=pg[1]; }

function render(){ setHeader(); document.getElementById('bannerWrap').style.display = cur==='overview'?'':'none'; ({overview:rOverview,strategy:rStrategy,finance:rFinance,branches:rBranches,online:rOnline,product:rProduct,people:rPeople,alerts:rAlerts,recommend:rRecommend,valuation:rValuation}[cur])(); }

/* ---- OVERVIEW ---- */
function rOverview(){
  const li=CFG.weeks-2, pi=li-1, B=D.branches, co=D.company;
  const revW=B.reduce((s,b)=>s+b.weeks[li].rev,0), revP=B.reduce((s,b)=>s+b.weeks[pi].rev,0), planW=B.reduce((s,b)=>s+b.weeks[li].plan,0);
  const wowW=(revW-revP)/revP*100, planAch=revW/planW*100;
  const roas=co? (D.online.channels.reduce((s,c)=>s+c.rev,0)/D.online.channels.reduce((s,c)=>s+c.cost,0)):0;
  const k=[
    kpiCard(t('kRevWeek'),ty(revW),lang==='vi'?'tỷ':'B',ctxLine([delta(wowW)+' '+t('wow'),`${n(planAch,0)}% ${t('vsPlan')}`])),
    kpiCard(t('kPlanWeek'),n(planAch,0),'%',ctxLine([delta(planAch-100)+' '+t('vsPlan'),`${t('ytd')} ${n(co.ytdRevTotal/B.reduce((s,b)=>s+b.ytdPlan,0)*100,0)}%`])),
    kpiCard(t('kEbitda'),n(co.ebitdaCompany,1),'%',ctxLine([delta(co.ebitdaCompany-CFG.targets.ebitdaPct)+' '+t('vsPlan'),`${lang==='vi'?'mục tiêu':'target'} ${CFG.targets.ebitdaPct}%`])),
    kpiCard(t('kRunway'),co.cashRunwayDays,lang==='vi'?'ngày':'days',ctxLine([`${lang==='vi'?'nếu PO lớn':'large PO'} → ${co.cashRunwayPO}`,`${t('ref')} 45`])),
    kpiCard(t('kBranchPlan'),co.branchesOnPlan,'%',ctxLine([`${B.filter(b=>b.planYtdPct>=95).length}/${B.length} ${lang==='vi'?'chi nhánh':'branches'}`,`${B.filter(b=>b.status==='red').length} ${lang==='vi'?'nguy cấp':'critical'}`])),
    kpiCard(t('kRoas'),n(roas,2),'x',ctxLine([delta((roas-CFG.benchmark.roas)/CFG.benchmark.roas*100)+' '+t('vsBench')+': '+CFG.benchmark.roas]))
  ].join('');
  const months=co.months[lang];
  const drops=B.slice().sort((a,b)=>a.wow-b.wow).slice(0,5);
  const attn=drops.map(b=>`<button class="attn" onclick="SD.openBranch('${b.id}')"><span class="status ${b.status}">${b.id}</span><span class="an">${b.street}</span><span class="aw">${delta(b.wow)}</span></button>`).join('');
  const exec=ALERTS.all.filter(a=>a.life!=='closed').sort((a,b)=>(a.severity===b.severity?a.remain-b.remain:(a.severity==='red'?-1:1))).slice(0,5)
    .map(a=>`<button class="alert ${a.severity} drill" onclick="SD.drill('${a.scope}','${a.entity.id||a.rule}','${a.rule}')"><span class="sev"></span><div class="alert-body"><strong>${tt(a.label)}</strong><p>${alertName(a)} · ${lang==='vi'?'thực tế':'actual'} ${n(a.actual,1)} (${a.operator}${a.threshold})</p></div><span class="owner">${ownerName(a.owner)}</span></button>`).join('');
  view().innerHTML=`
    <div class="grid kpi-grid six">${k}</div>
    <div class="grid two">
      <div class="card">${head(t('revVsPlanTitle'),t('revVsPlanSub'))}<div class="chart-wrap"><canvas id="ovRev" height="270"></canvas><div class="legend"><span><i class="dot" style="background:${C.blue}"></i>${t('actual')}</span><span><i class="dot" style="background:${C.gold}"></i>${t('plan')}</span><span><i class="dot" style="background:${C.green}"></i>${t('online')}</span></div></div></div>
      <div class="card pad"><h2 class="headline">${t('execAlerts')}</h2><div class="muted-tip">${t('clickToDrill')}</div><div class="alert-list mt">${exec}</div></div>
    </div>
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('needAttention')}</h2><div class="sub">${t('needAttentionSub')}</div><div class="attn-list mt">${attn}</div></div>
      <div class="card">${head(t('regionMix'),'')}<div class="chart-wrap"><canvas id="ovMix" height="180"></canvas>
          <div class="region-legend">${[['South',C.blue],['North',C.gold],['Central',C.green]].map(r=>`<div class="rl-row"><span class="rl-dot" style="background:${r[1]}"></span><span class="rl-name">${REG[r[0]][lang]}</span><b class="rl-pct">${co.regionMix[r[0]]}%</b></div>`).join('')}</div></div></div>
    </div>`;
  lineChart('ovRev',months,[{data:co.monthRev,color:C.blue,w:3,fill:true},{data:co.planMonth,color:C.gold,w:2,dash:[6,5]},{data:co.monthOnline,color:C.green,w:2}]);
  donut('ovMix',[co.regionMix.South,co.regionMix.North,co.regionMix.Central],[C.blue,C.gold,C.green],String(Math.round(co.ytdRevTotal)),lang==='vi'?'tỷ · luỹ kế':'B · YTD');
}

/* ---- STRATEGY ---- */
function rStrategy(){
  const L=I.lists;
  const cascade=L.cascade.map(c=>{const d=c[lang];return `<div class="cell"><h4>${d[0]}</h4><ul>${d[1].map(x=>`<li>${x}</li>`).join('')}</ul></div>`;}).join('');
  const q=L.questions.map((x,i)=>`<div class="rec"><div class="num">${i+1}</div><div><strong>${x[lang][0]}</strong><p>${x[lang][1]}</p></div></div>`).join('');
  const ue=L.unitEcon, sites=ue[0], rows=sites.map((s,i)=>`<tr><td><strong>${s}</strong></td><td>${ue[1][i]}</td><td>${ue[2][i]}%</td><td>${n(ue[3][i],1)}</td><td><span class="status ${ue[4][i]==='go'?'good':'orange'}">${ue[4][i]==='go'?(lang==='vi'?'Nên mở':'Go'):(lang==='vi'?'Cân nhắc':'Watch')}</span></td></tr>`).join('');
  view().innerHTML=`
    <div class="grid two-even">
      <div class="card pad"><h2 class="headline">${t('cascadeTitle')}</h2><div class="matrix mt">${cascade}</div></div>
      <div class="card">${head(t('profitPoolTitle'),t('profitPoolSub'))}<div class="chart-wrap"><canvas id="stPool" height="300"></canvas></div></div>
    </div>
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('questionsTitle')}</h2><div class="mt">${q}</div></div>
      <div class="card pad"><h2 class="headline">${t('unitEconTitle')}</h2><div class="sub">${t('unitEconSub')}</div><div class="table-wrap mt bord"><table><thead><tr><th>${t('ueSite')}</th><th>${t('uePayback')}</th><th>${t('ueRent')}</th><th>${t('ueBreak')}</th><th>${t('ueVerdict')}</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    </div>`;
  const pool=D.products.map(p=>({name:tt(p.name),v:Math.round(p.rev*p.gm/100*10)/10})).sort((a,b)=>b.v-a.v);
  barH('stPool',pool.map(p=>p.name),pool.map(p=>p.v),()=>C.purple);
}

/* ---- FINANCE ---- */
function rFinance(){
  const f=D.company.finance, co=D.company, months=co.months[lang];
  const rows=f.map(m=>`<tr><td><strong>${months[m.m]}</strong></td><td>${n(m.rev,1)}</td><td>${n(m.cogs,1)}</td><td>${n(m.gp,1)}</td><td>${n(m.opex,1)}</td><td>${n(m.ebitda,1)}</td><td><span class="status ${m.ebitdaPct>=12?'good':m.ebitdaPct>=10?'watch':'orange'}">${n(m.ebitdaPct,1)}%</span></td></tr>`).join('');
  const cash=[
    {vi:['Tiền mặt đủ dùng ~52 ngày','Theo chi phí vận hành & lịch nhập hàng hiện tại.'],en:['Cash runway ~52 days','At current OPEX and purchasing schedule.']},
    {vi:['Nếu đặt PO lớn tháng 6 → còn ~43 ngày','Nhập theo tỷ lệ bán hết, hạn chế hàng tồn > 75 ngày.'],en:['Large June PO → ~43 days','Purchase by sell-through; limit stock > 75 days.']},
    {vi:['Tách công nợ & trả trước theo kênh','Online, cửa hàng, đơn sỉ theo dõi riêng để không nhìn sai dòng tiền.'],en:['Split receivables by channel','Track online, store and wholesale separately to avoid cashflow distortion.']}
  ].map(c=>`<div class="rec"><div class="num gold">$</div><div><strong>${c[lang][0]}</strong><p>${c[lang][1]}</p></div></div>`).join('');
  view().innerHTML=`
    <div class="grid kpi-grid four">
      ${kpiCard(t('fcRev')+' '+t('ytd'),ty(co.ytdRevTotal),lang==='vi'?'tỷ':'B',ctxLine([`${lang==='vi'?'ước cả năm':'run-rate'} ${co.runRateRevenue}`,`${lang==='vi'?'mục tiêu':'target'} 450`]))}
      ${kpiCard(lang==='vi'?'Biên lãi gộp':'Gross margin',n(co.gmCompany,1),'%',ctxLine([delta(co.gmCompany-CFG.benchmark.gmPct)+' '+t('vsBench')]))}
      ${kpiCard(t('kEbitda'),n(co.ebitdaCompany,1),'%',ctxLine([delta(co.ebitdaCompany-CFG.targets.ebitdaPct)+' '+t('vsPlan'),`EBITDA ${n(co.runRateEbitda,0)} ${lang==='vi'?'tỷ/năm':'B/yr'}`]))}
      ${kpiCard(t('kRunway'),co.cashRunwayDays,lang==='vi'?'ngày':'days',ctxLine([`PO → ${co.cashRunwayPO}`,`${t('ref')} 45`]))}
    </div>
    <div class="grid two">
      <div class="card">${head(t('plTitle'),t('plSub'))}<div class="chart-wrap"><canvas id="fnWf" height="290"></canvas></div></div>
      <div class="card pad"><h2 class="headline">${t('cashTitle')}</h2><div class="mt">${cash}</div></div>
    </div>
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('financeTable')}</h2><div class="table-wrap mt bord"><table><thead><tr><th>${t('fcMonth')}</th><th>${t('fcRev')}</th><th>${t('fcCogs')}</th><th>${t('fcGp')}</th><th>${t('fcOpex')}</th><th>${t('fcEbitda')}</th><th>${t('fcMargin')}</th></tr></thead><tbody>${rows}</tbody></table></div></div>
      <div class="card">${head(t('marginTrend'),t('marginSub'))}<div class="chart-wrap"><canvas id="fnMargin" height="280"></canvas><div class="legend"><span><i class="dot" style="background:${C.green}"></i>${lang==='vi'?'Biên gộp':'Gross'}</span><span><i class="dot" style="background:${C.orange}"></i>${lang==='vi'?'Chi phí VH/DT':'OPEX/rev'}</span><span><i class="dot" style="background:${C.blue}"></i>EBITDA</span></div></div></div>
    </div>`;
  waterfall('fnWf');
  lineChart('fnMargin',months,[{data:f.map(m=>m.gmPct),color:C.green,w:3},{data:f.map(m=>Math.round(m.opex/m.rev*1000)/10),color:C.orange,w:2},{data:f.map(m=>m.ebitdaPct),color:C.blue,w:2}]);
}

/* ---- BRANCHES ---- */
function filtered(){ return D.branches.filter(b=>(bFilter.region==='All'||b.region===bFilter.region)&&(bFilter.status==='All'||b.status===bFilter.status)&&(bFilter.format==='All'||b.format===bFilter.format)&&(bFilter.cohort==='All'||b.cohort===bFilter.cohort)); }
function rBranches(){
  const sel=(id,opts,val)=>`<select class="select" id="${id}" onchange="SD.filterBranch()">${opts.map(o=>`<option value="${o[0]}" ${o[0]===val?'selected':''}>${o[1]}</option>`).join('')}</select>`;
  const rankSel=`<select class="select" id="rankBy" onchange="SD.setRank()">${[['health',t('colHealth')],['ytdRev',t('colYtd')],['planYtdPct',t('colPlan')],['gmPct',t('colGm')]].map(o=>`<option value="${o[0]}" ${o[0]===rankBy?'selected':''}>${o[1]}</option>`).join('')}</select>`;
  view().innerHTML=`
    <div class="filterbar">
      ${sel('fRegion',[['All',t('filterRegion')],['South',REG.South[lang]],['North',REG.North[lang]],['Central',REG.Central[lang]]],bFilter.region)}
      ${sel('fStatus',[['All',t('filterStatus')],['red',STAT.red[lang]],['orange',STAT.orange[lang]],['watch',STAT.watch[lang]],['good',STAT.good[lang]]],bFilter.status)}
      ${sel('fFormat',[['All',t('filterFormat')],['Flagship',FMT.Flagship[lang]],['Standard',FMT.Standard[lang]],['Compact',FMT.Compact[lang]]],bFilter.format)}
      ${sel('fCohort',[['All',t('filterCohort')],['new',COH.new[lang]],['ramp',COH.ramp[lang]],['mature',COH.mature[lang]]],bFilter.cohort)}
      <span class="grow"></span><span class="rank-lbl">${t('rankBy')}</span>${rankSel}
    </div>
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('heatTitle')}</h2><div class="sub">${t('heatSub')}</div><div id="heatGrid" class="heat-grid mt"></div>
        <div class="heat-legend"><span><i style="background:${C.red}"></i>&lt;40</span><span><i style="background:${C.orange}"></i>40–54</span><span><i style="background:${C.blue}"></i>55–69</span><span><i style="background:${C.green}"></i>≥70</span></div></div>
      <div class="card">${head(lang==='vi'?'Xếp hạng chi nhánh':'Branch ranking','')}<div class="chart-wrap"><canvas id="brRank" height="430"></canvas></div></div>
    </div>
    <div class="card"><div class="table-wrap tall"><table class="sortable" id="brTable"></table></div></div>
    <div id="branchPanel" class="branch-panel"></div>`;
  renderHeat(); renderRank(); renderBranchTable();
}
function renderHeat(){ const g=document.getElementById('heatGrid'); if(!g)return; const list=filtered();
  g.innerHTML=D.branches.map(b=>{ const dim=list.includes(b)?'':'dim'; const v=b[heatMetric]; const col=b.health>=70?C.green:b.health>=55?C.blue:b.health>=40?C.orange:C.red; return `<button class="heat-cell ${dim}" style="--c:${col}" title="${b.id} ${b.street} · ${t('colHealth')} ${b.health}" onclick="SD.openBranch('${b.id}')"><span class="hid">${b.id}</span><span class="hv">${heatMetric==='ytdRev'?n(v,0):v}</span></button>`; }).join(''); }
function renderRank(){ const list=filtered().slice().sort((a,b)=>b[rankBy]-a[rankBy]).slice(0,12); barH('brRank',list.map(b=>b.id),list.map(b=>rankBy==='ytdRev'?b.ytdRev:b[rankBy]),i=>SC[list[i].status]); }
const COLS=[['id','colBranch','l'],['region','colRegion','l'],['ytdRev','colYtd','r'],['planYtdPct','colPlan','r'],['wow','colWow','r'],['spark','colTrend','c'],['gmPct','colGm','r'],['inventoryDays','colInv','r'],['convPct','colConv','r'],['pickupPct','colPickup','r'],['revPerM2','colM2','r'],['health','colHealth','r'],['status','colStatus','c'],['manager','colOwner','l']];
function renderBranchTable(){ const tb=document.getElementById('brTable'); if(!tb)return; let list=filtered(); const k=bSort.key;
  list=list.slice().sort((a,b)=>{ let va=a[k],vb=b[k]; if(k==='id'||k==='manager'){return va<vb?-1*bSort.dir:va>vb?bSort.dir:0;} if(k==='region'){va=a.region+a.format;vb=b.region+b.format;return va<vb?-1*bSort.dir:bSort.dir;} if(k==='spark'){va=a.wow;vb=b.wow;} if(k==='status'){const ord={red:0,orange:1,watch:2,good:3};va=ord[a.status];vb=ord[b.status];} return (vb-va)*bSort.dir; });
  const thh=COLS.map(c=>`<th class="${c[2]==='r'?'ar':c[2]==='c'?'ac':''} ${bSort.key===c[0]?'sorted':''}" onclick="SD.sortBranch('${c[0]}')">${t(c[1])}${bSort.key===c[0]?`<i class="sa">${bSort.dir>0?'▼':'▲'}</i>`:''}</th>`).join('');
  const rows=list.map(b=>`<tr onclick="SD.openBranch('${b.id}')"><td><strong>${b.id}</strong><span class="td-sub">${b.street}</span></td><td>${REG[b.region][lang]}<span class="td-sub">${FMT[b.format][lang]} · ${COH[b.cohort][lang]}</span></td><td class="ar">${n(b.ytdRev,1)}</td><td class="ar"><div class="progress ${b.planYtdPct<82?'red':b.planYtdPct>=98?'green':'blue'}"><i style="width:${Math.min(b.planYtdPct,120)}%"></i></div><span class="td-sub">${n(b.planYtdPct,0)}%</span></td><td class="ar">${delta(b.wow)}</td><td class="ac">${spark(b.spark)}</td><td class="ar">${n(b.gmPct,1)}%</td><td class="ar ${b.inventoryDays>75?'warn':''}">${b.inventoryDays}</td><td class="ar">${n(b.convPct,1)}%</td><td class="ar">${n(b.pickupPct,1)}%</td><td class="ar">${b.revPerM2}</td><td class="ar"><b class="hscore" style="color:${SC[b.status]}">${b.health}</b></td><td class="ac"><span class="status ${b.status}">${STAT[b.status][lang]}</span></td><td>${b.manager}</td></tr>`).join('');
  tb.innerHTML=`<thead><tr>${thh}</tr></thead><tbody>${rows}</tbody>`;
}
function openBranch(id){ const b=D.branches.find(x=>x.id===id); if(!b)return; const p=document.getElementById('branchPanel')||(()=>{const d=document.createElement('div');d.id='branchPanel';d.className='branch-panel';view().appendChild(d);return d;})();
  const weak=[['planYtdPct',t('colPlan'),n(b.planYtdPct,0)+'%',b.planYtdPct<90],['gmPct',t('colGm'),n(b.gmPct,1)+'%',b.gmPct<42],['inventoryDays',t('colInv'),b.inventoryDays,b.inventoryDays>70],['convPct',t('colConv'),n(b.convPct,1)+'%',b.convPct<22],['turnoverPct',lang==='vi'?'Nghỉ việc':'Turnover',b.turnoverPct+'%',b.turnoverPct>24]].filter(x=>x[3]).slice(0,3);
  const oa=ALERTS.all.filter(a=>a.scope==='branch'&&a.entity.id===id&&a.life!=='closed');
  const oaH=oa.length?oa.map(a=>`<div class="alert ${a.severity} sm"><span class="sev"></span><div class="alert-body"><strong>${tt(a.label)}</strong><p>${t('cause')}: ${a.causes.map(tt).join(', ')}</p></div><span class="life ${a.life}">${t(LIFEK[a.life])}</span></div>`).join(''):`<p class="muted">${t('bpNoAlert')}</p>`;
  const sug=oa.length?tt(oa[0].suggest):(b.status==='good'?(lang==='vi'?'Duy trì đà tăng, nhân rộng cách làm tốt.':'Sustain momentum; replicate best practices.'):(lang==='vi'?'Rà lượt khách, cơ cấu hàng & lịch nhân sự.':'Review traffic, SKU mix & staffing.'));
  p.innerHTML=`<div class="bp-card"><button class="bp-x" onclick="SD.closeBranch()">✕</button>
    <div class="bp-h"><span class="status ${b.status}">${STAT[b.status][lang]}</span><h3>${b.id} · ${b.street}</h3><div class="bp-meta">${b.city} · ${REG[b.region][lang]} · ${FMT[b.format][lang]} · ${COH[b.cohort][lang]} · ${b.area}m² · ${b.staff} ${lang==='vi'?'nhân sự':'staff'} · ${b.manager}</div></div>
    <div class="bp-kpis"><div><small>${t('colYtd')}</small><b>${n(b.ytdRev,1)} ${lang==='vi'?'tỷ':'B'}</b></div><div><small>${t('colPlan')}</small><b>${n(b.planYtdPct,0)}%</b></div><div><small>WoW</small><b>${delta(b.wow)}</b></div><div><small>${t('colHealth')}</small><b style="color:${SC[b.status]}">${b.health}</b></div><div><small>${t('colM2')}</small><b>${b.revPerM2}</b></div><div><small>${lang==='vi'?'DT/người':'Rev/staff'}</small><b>${b.revPerStaff}</b></div></div>
    <div class="bp-grid"><div><h4>${t('bpWeekly')}</h4><canvas id="bpChart" height="150"></canvas></div>
      <div><h4>${t('bpWeak')}</h4>${weak.map(w=>`<div class="bp-weak"><span>${w[1]}</span><b class="warn">${w[2]}</b></div>`).join('')||`<p class="muted">—</p>`}<h4 class="mt">${t('bpAction')}</h4><p class="bp-action">${sug}</p></div></div>
    <h4>${t('bpAlerts')}</h4><div class="bp-alerts">${oaH}</div></div>`;
  p.classList.add('open');
  const o=ctxOf('bpChart'); if(o){ const {x,w,h}=o,p2=8; const vals=b.weeks.slice(-12).map(z=>z.rev),pl=b.weeks.slice(-12).map(z=>z.plan); x.clearRect(0,0,w,h); const mx=Math.max(...vals,...pl)*1.15,slot=(w-16)/vals.length; vals.forEach((v,i)=>{ const bw=slot*0.5,X=8+slot*i+slot*0.25,bh=(h-24)*(v/mx); x.fillStyle=SC[b.status]; rr(x,X,h-16-bh,bw,bh,3); }); x.strokeStyle=C.gold; x.lineWidth=2; x.setLineDash([4,3]); x.beginPath(); pl.forEach((v,i)=>{ const X=8+slot*i+slot*0.5, Y=h-16-(h-24)*(v/mx); i?x.lineTo(X,Y):x.moveTo(X,Y); }); x.stroke(); x.setLineDash([]); }
}

/* ---- ONLINE ---- */
function rOnline(){ const o=D.online;
  view().innerHTML=`
    <div class="grid kpi-grid four">
      ${kpiCard(lang==='vi'?'Mục tiêu online năm':'Annual online target',o.onlineTarget,lang==='vi'?'tỷ':'B',ctxLine([`${t('ytd')} ${n(D.company.ytdOnlineTotal,1)}`,`${n(D.company.ytdOnlineTotal/o.onlineTarget*100,0)}% ${t('vsPlan')}`]))}
      ${kpiCard(t('convWeb'),n(o.convWebsite,2),'%',ctxLine([delta((o.convWebsite-o.convTarget)/o.convTarget*100)+' '+t('vsPlan'),`${lang==='vi'?'mục tiêu':'target'} ${o.convTarget}%`]))}
      ${kpiCard(t('cac'),o.cac,lang==='vi'?'nghìn':'k',ctxLine([delta((o.cac-o.cacPlan)/o.cacPlan*100,true)+' '+t('vsPlan')]))}
      ${kpiCard(t('repeat'),o.repeatRate,'%',ctxLine([`${lang==='vi'?'mục tiêu':'target'} ${o.repeatTarget}%`,delta(o.repeatRate-o.repeatTarget)]))}
    </div>
    <div class="grid two">
      <div class="card">${head(t('funnelTitle'),'')}<div class="chart-wrap"><canvas id="onFun" height="300"></canvas></div></div>
      <div class="card">${head(t('channelTitle'),'')}<div class="chart-wrap"><canvas id="onCh" height="300"></canvas><div class="legend"><span><i class="dot" style="background:${C.blue}"></i>${t('mRev')}</span><span><i class="dot" style="background:${C.gold}"></i>${t('mCost')}</span></div></div></div>
    </div>
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('o2sTitle')}</h2><div class="o2s mt"><div class="o2s-big">${ni(o.onlineToStore)}</div><p>${lang==='vi'?'lượt khách bắt nguồn từ online đã đến mua tại cửa hàng (luỹ kế) — đóng vòng online → cửa hàng.':'store visits originated online and purchased in-store (YTD) — closing the online → store loop.'}</p></div>
        <div class="ch-table mt">${o.channels.map(c=>`<div class="ch-row ${c.cut?'cut':''}"><span class="ch-n">${tt(c.name)}</span><span class="ch-roas">ROAS ${n(c.roas,2)}</span>${c.cut?`<span class="status orange">${lang==='vi'?'Cần cắt':'Cut'}</span>`:`<span class="status good">${lang==='vi'?'Giữ':'Keep'}</span>`}</div>`).join('')}</div></div>
      <div class="card pad"><h2 class="headline">${t('crmTitle')}</h2><div class="mt">
        ${[[t('convWeb'),o.convWebsite+'%',o.convTarget+'%'],[t('cac'),o.cac+'k',o.cacPlan+'k'],[t('repeat'),o.repeatRate+'%',o.repeatTarget+'%'],[t('o2s'),ni(o.onlineToStore),'—']].map(r=>`<div class="kv"><span>${r[0]}</span><b>${r[1]}</b><small>${lang==='vi'?'mục tiêu':'target'} ${r[2]}</small></div>`).join('')}
      </div></div>
    </div>`;
  barV('onFun',o.funnel.map(f=>tt(f[1])),o.funnel.map(f=>Math.round(f[2]/1000)),C.gold);
  grouped('onCh',o.channels.map(c=>tt(c.name)),o.channels.map(c=>c.rev),o.channels.map(c=>c.cost),C.blue,C.gold);
}

/* ---- PRODUCT ---- */
function rProduct(){ const P=D.products;
  const rows=P.map(p=>`<tr><td><strong>${tt(p.name)}</strong></td><td class="ar">${n(p.rev,1)}</td><td class="ar">${p.gm}%</td><td class="ar">${p.sellThrough}%</td><td class="ar ${p.inventoryDays>75?'warn':''}">${p.inventoryDays}</td><td class="ar">${n(p.gmroi,1)}x</td><td class="ac"><span class="status ${p.action==='markdown'?'red':p.action==='transfer'?'orange':p.action==='replenish'?'good':'watch'}">${({markdown:lang==='vi'?'Giảm giá xả':'Markdown',transfer:lang==='vi'?'Điều chuyển':'Transfer',replenish:lang==='vi'?'Tăng nhập':'Replenish',hold:lang==='vi'?'Giữ nguyên':'Hold'})[p.action]}</span></td></tr>`).join('');
  const merch=P.filter(p=>p.action==='markdown'||p.action==='transfer'||p.action==='replenish').map(p=>({p,imp:p.action==='replenish'?'+':''})).map((o,i)=>{const p=o.p;const txt=p.action==='markdown'?{vi:`Markdown ${tt(p.name)} — tồn ${p.inventoryDays} ngày, sell-through ${p.sellThrough}%.`,en:`Markdown ${tt(p.name)} — ${p.inventoryDays} inv days, ${p.sellThrough}% sell-through.`}:p.action==='transfer'?{vi:`Điều chuyển ${tt(p.name)} sang vùng bán nhanh.`,en:`Transfer ${tt(p.name)} to faster-selling regions.`}:{vi:`Tăng nhập ${tt(p.name)} — bán hết ${p.sellThrough}%, biên ${p.gm}%.`,en:`Replenish ${tt(p.name)} — ${p.sellThrough}% sell-through, ${p.gm}% margin.`};return `<div class="rec"><div class="num ${p.action==='replenish'?'gold':''}">${i+1}</div><div><strong>${tt(p.name)}</strong><p>${txt[lang]}</p></div></div>`;}).join('');
  view().innerHTML=`
    <div class="grid kpi-grid four">
      ${kpiCard(lang==='vi'?'Mã hàng đang bán':'Active SKUs',ni(P.reduce((s,p)=>s+p.sku,0)),'',ctxLine([`${lang==='vi'?'cắt 8–12% hàng chậm':'cut 8–12% slow'}`]))}
      ${kpiCard(lang==='vi'?'Bán hết 60 ngày':'60-day sell-through',n(P.reduce((s,p)=>s+p.sellThrough,0)/P.length,0),'%',ctxLine([`${lang==='vi'?'tốt ở áo thun & polo':'strong in tees & polo'}`]))}
      ${kpiCard(lang==='vi'?'Tồn kho bình quân':'Avg inventory',n(P.reduce((s,p)=>s+p.inventoryDays,0)/P.length,0),lang==='vi'?'ngày':'days',ctxLine([delta((P.reduce((s,p)=>s+p.inventoryDays,0)/P.length-CFG.benchmark.inventoryDays)/CFG.benchmark.inventoryDays*100,true)+' '+t('vsBench')]))}
      ${kpiCard('GMROI',n(P.reduce((s,p)=>s+p.gmroi,0)/P.length,1),'x',ctxLine([`${P.filter(p=>p.markdown).length} ${lang==='vi'?'nhóm cần xả':'groups to markdown'}`]))}
    </div>
    <div class="grid two">
      <div class="card">${head(t('catRevTitle'),'')}<div class="chart-wrap"><canvas id="pdRev" height="300"></canvas></div></div>
      <div class="card">${head(t('invTitle'),'')}<div class="chart-wrap"><canvas id="pdInv" height="300"></canvas></div></div>
    </div>
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('prodTableTitle')}</h2><div class="table-wrap mt bord"><table><thead><tr><th>${t('pCat')}</th><th class="ar">${t('pRev')}</th><th class="ar">${t('pGm')}</th><th class="ar">${t('pSell')}</th><th class="ar">${t('pInv')}</th><th class="ar">${t('pGmroi')}</th><th class="ac">${t('pAction')}</th></tr></thead><tbody>${rows}</tbody></table></div></div>
      <div class="card pad"><h2 class="headline">${t('merchTitle')}</h2><div class="mt">${merch}</div></div>
    </div>`;
  barH('pdRev',P.map(p=>tt(p.name)),P.map(p=>p.rev),()=>C.cyan);
  barH('pdInv',P.map(p=>tt(p.name)),P.map(p=>p.inventoryDays),i=>P[i].inventoryDays>75?C.red:P[i].inventoryDays>60?C.orange:C.green);
}

/* ---- PEOPLE ---- */
function rPeople(){ const ch=D.online.channels, hr=D.hr;
  view().innerHTML=`
    <div class="grid kpi-grid four">
      ${kpiCard(lang==='vi'?'Nhân sự bán hàng':'Sales staff',hr.totalStaff,lang==='vi'?'người':'people',ctxLine([`${n(hr.totalStaff/40,1)} ${lang==='vi'?'/chi nhánh':'/branch'}`]))}
      ${kpiCard(lang==='vi'?'DT/nhân sự':'Rev/staff',hr.regions[0][1],lang==='vi'?'tr/tháng':'M/mo',ctxLine([`${lang==='vi'?'Miền Nam cao nhất':'South leads'}`]))}
      ${kpiCard(lang==='vi'?'Nghỉ việc bình quân':'Avg turnover',hr.avgTurnover,'%',ctxLine([`${lang==='vi'?'cao ở chi nhánh mới':'high at new stores'}`]))}
      ${kpiCard(lang==='vi'?'Marketing/DT':'Marketing/rev',n(hr.mktToRevPct,1),'%',ctxLine([delta((hr.mktToRevPct-CFG.benchmark.mktToRevPct)/CFG.benchmark.mktToRevPct*100,true)+' '+t('vsBench')]))}
    </div>
    <div class="grid two">
      <div class="card">${head(t('roasTitle'),'')}<div class="chart-wrap"><canvas id="ppRoas" height="300"></canvas><div class="legend"><span><i class="dot" style="background:${C.blue}"></i>${t('mRev')}</span><span><i class="dot" style="background:${C.gold}"></i>${t('mCost')}</span></div></div>
        <div class="ch-table" style="padding:0 18px 16px">${ch.filter(c=>c.cut).map(c=>`<div class="ch-row cut"><span class="ch-n">${tt(c.name)}</span><span class="ch-roas">ROAS ${n(c.roas,2)} · ${lang==='vi'?'chi phí/DT':'cost/rev'} ${n(c.costToRevPct,0)}%</span><span class="status orange">${lang==='vi'?'Cần cắt':'Cut'}</span></div>`).join('')}</div></div>
      <div class="card">${head(t('prodTitle'),t('prodSub'))}<div class="chart-wrap"><canvas id="ppProd" height="300"></canvas><div class="legend"><span><i class="dot" style="background:${C.blue}"></i>${lang==='vi'?'DT/nhân sự (tr)':'Rev/staff (M)'}</span><span><i class="dot" style="background:${C.orange}"></i>${lang==='vi'?'Nghỉ việc %':'Turnover %'}</span></div></div></div>
    </div>
    <div class="card pad"><h2 class="headline">${t('cadenceTitle')}</h2><div class="flow mt">${I.lists.cadence.map((c,i)=>`<div class="fbox"><div class="fstep">${i+1}</div><strong>${c[lang][0]}</strong><span>${c[lang][1]}</span></div>`).join('')}</div></div>`;
  grouped('ppRoas',ch.map(c=>tt(c.name)),ch.map(c=>c.rev),ch.map(c=>c.cost),C.blue,C.gold);
  grouped('ppProd',hr.regions.map(r=>REG[r[0]][lang]),hr.regions.map(r=>r[1]),hr.regions.map(r=>r[2]),C.blue,C.orange);
}

/* ---- ALERTS ---- */
let openGroups={};
function rAlerts(){ const k=ALERTS.kpi;
  const groups=ALERTS.groups.map(g=>{ const sev=g.rule.severity, items=g.items, op=openGroups[g.rule.id];
    const rollup=`<button class="rollup ${sev}" onclick="SD.toggleGroup('${g.rule.id}')"><span class="sev"></span><div class="alert-body"><strong>${items.length} ${t('expand')} · ${tt(g.rule.label)}</strong><p>${lang==='vi'?'ngưỡng':'threshold'} ${g.rule.operator}${g.rule.threshold} · ${ownerName(g.rule.owner)} · SLA ${g.rule.sla}h</p></div><span class="chev">${op?'▾':'▸'}</span></button>`;
    const rows=op?`<div class="rollup-items">${items.sort((a,b)=>a.remain-b.remain).map(a=>`<div class="alert-row ${a.severity}"><span class="ar-name">${alertName(a)}</span><span class="ar-val">${n(a.actual,1)}</span><span class="life ${a.life}">${t(LIFEK[a.life])}</span><span class="ar-sla ${a.remain<0?'over':''}">${a.remain<0?`${t('lifeOverdue')} ${Math.abs(a.remain)}h`:`${a.remain}h`}</span><span class="ar-cause">${a.causes.map(tt).join(', ')}</span></div>`).join('')}</div>`:'';
    return rollup+rows; }).join('');
  const cfg=VCPC.CONFIG_ALERT.map(r=>`<tr><td><code>${r.metric}</code></td><td>${r.scope}</td><td class="ac">${r.operator}${r.threshold}</td><td class="ac"><span class="status ${r.severity==='red'?'red':'orange'}">${r.severity==='red'?(lang==='vi'?'Đỏ':'Red'):(lang==='vi'?'Cam':'Orange')}</span></td><td>${ownerName(r.owner)}</td><td class="ac">${r.sla}h</td></tr>`).join('');
  view().innerHTML=`
    <div class="grid kpi-grid four">
      ${kpiCard(t('aRed'),k.red,'',ctxLine([lang==='vi'?'xử lý ≤24h':'resolve ≤24h']))}
      ${kpiCard(t('aOrange'),k.orange,'',ctxLine([lang==='vi'?'xử lý ≤48h':'resolve ≤48h']))}
      ${kpiCard(t('aClosed'),k.closed,'',ctxLine([lang==='vi'?'tuần này':'this week']))}
      ${kpiCard(t('aOverdue'),k.overdue,'',ctxLine([lang==='vi'?'cần chuyển cấp':'escalate']))}
    </div>
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('alertListTitle')}</h2><div class="alert-list mt">${groups}</div></div>
      <div class="card pad"><h2 class="headline">${t('configTitle')}</h2><div class="note mt">${t('configNote')}</div><div class="table-wrap mt bord"><table><thead><tr><th>${t('cfgMetric')}</th><th>${t('cfgScope')}</th><th class="ac">${t('cfgRule')}</th><th class="ac">${t('cfgSev')}</th><th>${t('cfgOwner')}</th><th class="ac">${t('cfgSla')}</th></tr></thead><tbody>${cfg}</tbody></table></div></div>
    </div>`;
}

/* ---- RECOMMEND ---- */
function rRecommend(){ const R=RECS.recs;
  const cards=R.map(r=>{ const st=recStatus[r.id]||r.status; const targets=r.targets.map(tt).join(', ');
    return `<div class="rec-card st-${st}"><div class="rc-top"><strong>${tt(r.title)}</strong><span class="feas ${r.feasibility}">${t(FEAS[r.feasibility])}</span></div>
      <p>${tt(r.detail)}</p><div class="rc-tags">${r.targets.slice(0,5).map(x=>`<span class="chip sm">${tt(x)}</span>`).join('')}</div>
      <div class="rc-foot"><div class="rc-impact">${r.impact>0?`<small>${t('impact')}</small><b>~${n(r.impact,1)} ${lang==='vi'?'tỷ':'B'}</b>`:`<small>${t('impact')}</small><b>${lang==='vi'?'Bảo vệ dòng tiền':'Cash protection'}</b>`}</div><div class="rc-owner">${ownerName(r.owner)}</div>
        <div class="rc-status"><button class="${st==='propose'?'on':''}" onclick="SD.setRec('${r.id}','propose')">${t('stProposeL')}</button><button class="${st==='progress'?'on':''}" onclick="SD.setRec('${r.id}','progress')">${t('stProgressL')}</button><button class="${st==='done'?'on':''}" onclick="SD.setRec('${r.id}','done')">${t('stDoneL')}</button></div></div></div>`; }).join('');
  view().innerHTML=`
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('recListTitle')}</h2><div class="rec-grid mt">${cards}</div></div>
      <div class="side-col">
        <div class="card pad value-card"><div class="vc-num">~${n(RECS.totalImpact,1)} <span class="vc-unit">${lang==='vi'?'tỷ/vnđ':'B VND'}</span></div><div class="vc-lbl">${t('totalImpact')}</div><div class="vc-bar"><i style="width:${Math.min(RECS.totalImpact/30*100,100)}%"></i></div><p class="muted mt">${lang==='vi'?'Tổng tác động ước tính từ các kiến nghị có lượng hoá được (chưa gồm phần bảo vệ dòng tiền).':'Total estimated impact from quantifiable recommendations (excluding cash-protection items).'}</p></div>
        <div class="card pad"><h2 class="headline">${t('roadmapTitle')}</h2><div class="mt">${I.lists.roadmap.map((r,i)=>`<div class="rec"><div class="num gold">${i+1}</div><div><strong>${r[lang][0]}</strong><p>${r[lang][1]}</p></div></div>`).join('')}</div></div>
      </div>
    </div>`;
}

/* ---- VALUATION ---- */
function rValuation(){ const s=SV, L=I.lists; const tierKey=s.tiers[s.tier];
  const gauge=svGauge(s.score);
  const range=svRange(s.val);
  const crsChips=L.crsInputs.map(c=>`<span class="chip">${tt(c)}</span>`).join('');
  const valChips=L.valInputs.map(c=>`<span class="chip">${tt(c)}</span>`).join('');
  const adj=L.adjFactors.map(c=>`<span class="chip ghost">${tt(c)}</span>`).join('');
  const lifts=s.lifts.map((k,i)=>`<div class="rec"><div class="num gold">${i+1}</div><div><strong>${tt(L.liftDict[k])}</strong></div></div>`).join('');
  const meaning=L.tierMeaning[tierKey]?tt(L.tierMeaning[tierKey]):'';
  const bridge=L.bridgeCards.map(c=>`<div class="bridge-card">${tt(c)}</div>`).join('');
  view().innerHTML=`
    <div class="grid two">
      <div class="card pad"><h2 class="headline">${t('crsTitle')}</h2>
        <div class="gauge-wrap">${gauge}<div class="gauge-score"><b>${s.score}</b><span>/100</span></div><div class="tier-row">${s.tiers.map((tk,i)=>`<span class="tier ${i===s.tier?'on':''}">${tt(L.tiers[tk])}</span>`).join('')}</div></div>
        <p class="vdesc">${t('crsDesc')} <b>${meaning}</b></p>
        <h4 class="chips-h">${t('crsInputs')}</h4><div class="chips">${crsChips}</div>
        <div class="lift-box"><h4>${t('liftTitle')}</h4>${lifts}<p class="muted sm">${t('liftNote')}</p></div>
      </div>
      <div class="card pad"><div class="val-head"><h2 class="headline">${t('valTitle')}</h2></div>
        ${range}
        <p class="vdesc">${t('valDesc')}</p>
        <h4 class="chips-h">${t('valInputs')}</h4><div class="chips">${valChips}</div>
        <h4 class="chips-h">${t('adjTitle')}</h4><div class="chips">${adj}</div>
      </div>
    </div>
    <div class="card pad bridge"><h2 class="headline">${t('bridgeTitle')}</h2><p class="mt">${t('bridgeLead')}</p><div class="bridge-grid mt">${bridge}</div>
      <a class="btn-cta" href="https://vietcapitalpartners.com/capital" target="_blank" rel="noopener">${t('bridgeCta')} →</a></div>
    <div class="card pad disc-card"><span class="estimate">${t('estimate')}</span><p class="disc">${t('valDisclaimer')}</p></div>`;
}
function svGauge(score){ const cx=160,cy=150,r=120,sw=22; const a0=Math.PI,a1=0; const segs=[[0,30,C.red],[30,50,C.orange],[50,68,C.gold],[68,85,C.blue],[85,100,C.green]];
  const arc=(p0,p1,col)=>{ const A=Math.PI-(p0/100)*Math.PI, B=Math.PI-(p1/100)*Math.PI; const x0=cx+r*Math.cos(A),y0=cy-r*Math.sin(A),x1=cx+r*Math.cos(B),y1=cy-r*Math.sin(B); return `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="butt"/>`; };
  const na=Math.PI-(score/100)*Math.PI; const nx=cx+(r-6)*Math.cos(na), ny=cy-(r-6)*Math.sin(na);
  return `<svg class="gauge" viewBox="0 0 320 168" width="100%">${segs.map(s=>arc(s[0],s[1],s[2])).join('')}
    <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${C.navy}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="7" fill="${C.navy}"/></svg>`;
}
function svRange(v){ const lo=v.low,hi=v.high,ba=v.base; const span=hi-lo; const bp=((ba-lo)/span)*100;
  return `<div class="range-wrap"><div class="range-vals"><div class="rv lo"><small>Low</small><b>${ni(lo)}</b></div><div class="rv base"><small>Base</small><b>${ni(ba)}</b></div><div class="rv hi"><small>High</small><b>${ni(hi)}</b></div></div>
    <div class="range-bar"><div class="rb-fill"></div><div class="rb-base" style="left:${bp}%"></div></div>
    <div class="range-unit">${t('valUnit')} · <span class="rnote">${t('valRangeNote')}</span></div></div>`;
}

/* ============================================================
   INTERACTIONS
   ============================================================ */
function go(tab){ if(!TABS.includes(tab))return; cur=tab; localStorage.setItem('vcpc_sdtab',tab); document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); document.querySelector('main').scrollTop=0; render(); }
function setLang(l){ lang=l; localStorage.setItem('vcpc_lang',l); document.documentElement.lang=l; document.getElementById('viBtn').classList.toggle('active',l==='vi'); document.getElementById('enBtn').classList.toggle('active',l==='en'); buildChrome(); render(); }
function buildChrome(){
  document.getElementById('brandSub').textContent=t('brandSub');
  document.getElementById('navTitle').textContent=t('navTitle');
  document.getElementById('unitPill').textContent=t('unitPill');
  document.getElementById('periodPill').textContent=t('periodPill');
  document.getElementById('logoutTxt').textContent=(lang==='vi'?'Đăng xuất':'Sign out');
  document.getElementById('bannerText').textContent=t('banner');
  document.getElementById('refreshTxt').textContent=t('liveBtn');
  document.getElementById('footerNote').textContent=t('footerNote');
  document.querySelectorAll('.tab-btn').forEach(b=>{ const k=b.dataset.tab; b.querySelector('.tab-label span').textContent=I.nav[k][lang]; });
}
function buildNav(){ const nav=document.getElementById('sdNav'); nav.innerHTML=TABS.map(k=>`<button class="tab-btn ${k===cur?'active':''}" data-tab="${k}" onclick="SD.go('${k}')"><span class="ico">${ICON[I.pages[k].icon]}</span><span class="tab-label"><span>${I.nav[k][lang]}</span></span></button>`).join(''); }
const ICON={ grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>',
  trend:'<svg viewBox="0 0 24 24"><path d="M4 18l5-5 4 3 7-8"/><path d="M16 8h4v4"/></svg>',
  store:'<svg viewBox="0 0 24 24"><path d="M4 9h16l-1.2-4.2H5.2L4 9z"/><path d="M5 9v10h14V9"/><rect x="9.5" y="13" width="5" height="6"/></svg>',
  cart:'<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M3 4h2l2.2 11h11l1.8-8H6"/></svg>',
  box:'<svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3.5 19c0-3 2.2-5 5-5s5 2 5 5M14.5 19c0-2.4 1.4-4 3.5-4s3.5 1.6 3.5 4"/></svg>',
  alert:'<svg viewBox="0 0 24 24"><path d="M12 4l9 15.5H3L12 4z"/><path d="M12 10v4.5M12 17.5v.5"/></svg>',
  check:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12l2.3 2.3L16 9.5"/></svg>',
  gauge:'<svg viewBox="0 0 24 24"><path d="M4 19a8 8 0 1 1 16 0"/><path d="M12 19l4-6"/><circle cx="12" cy="19" r="1.4"/></svg>' };

window.SD={
  go, setLang,
  filterBranch(){ bFilter={region:val('fRegion'),status:val('fStatus'),format:val('fFormat'),cohort:val('fCohort')}; renderHeat(); renderRank(); renderBranchTable(); },
  setRank(){ rankBy=val('rankBy'); renderRank(); },
  sortBranch(k){ if(bSort.key===k) bSort.dir*=-1; else { bSort.key=k; bSort.dir=1; } renderBranchTable(); },
  openBranch(id){ go('branches'); setTimeout(()=>openBranch(id),cur==='branches'?0:40); },
  closeBranch(){ const p=document.getElementById('branchPanel'); if(p) p.classList.remove('open'); },
  drill(scope,id,rule){ if(scope==='branch'){ SD.openBranch(id); } else if(scope==='product'){ go('product'); } else if(scope==='channel'){ go('people'); } else { go(rule==='R7'?'finance':'online'); } },
  toggleGroup(id){ openGroups[id]=!openGroups[id]; rAlerts(); },
  setRec(id,st){ recStatus[id]=st; rRecommend(); },
  refresh(){ ALERTS=EN.buildAlerts(); RECS=EN.buildRecommendations(); SV=EN.buildScoreValuation(); render(); toast(lang==='vi'?'Đã làm mới dữ liệu':'Data refreshed'); },
  toggleBanner(){ document.getElementById('bannerWrap').classList.toggle('collapsed'); },
  logout(){ try{sessionStorage.removeItem('vcpc_auth');localStorage.removeItem('vcpc_auth');}catch(e){} location.href='strategy-login.html'; }
};
function val(id){ const e=document.getElementById(id); return e?e.value:'All'; }
function toast(msg){ let el=document.getElementById('toast'); if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el); } el.textContent=msg; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),1800); }

function init(){
  buildNav(); buildChrome();
  document.getElementById('collapseBtn').addEventListener('click',()=>{ document.body.classList.toggle('sidebar-collapsed'); localStorage.setItem('vcpc_sdcollapse',document.body.classList.contains('sidebar-collapsed')?'1':'0'); setTimeout(render,210); });
  if(localStorage.getItem('vcpc_sdcollapse')==='1') document.body.classList.add('sidebar-collapsed');
  document.getElementById('viBtn').classList.toggle('active',lang==='vi'); document.getElementById('enBtn').classList.toggle('active',lang==='en');
  document.documentElement.lang=lang;
  window.addEventListener('resize',()=>{ clearTimeout(window._rz); window._rz=setTimeout(render,150); });
  if(!TABS.includes(cur)) cur='overview';
  go(cur);
  // Live CSV (nếu cấu hình) — demo dùng dataset mô phỏng
  if(CFG.SHEET_CSV_URL){ setInterval(()=>SD.refresh(), CFG.refreshMinutes*60000); }
}
if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded',init);
})();
