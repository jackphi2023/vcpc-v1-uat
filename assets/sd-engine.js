/* ============================================================
   VCPC Dashboard — ENGINE
   1) Alert engine: tính lại từ CONFIG_ALERT × dữ liệu, rollup,
      vòng đời, SLA đếm ngược, gợi ý nguyên nhân.
   2) Recommendation engine: quét pattern -> kiến nghị có tên +
      tác động VNĐ + owner + trạng thái.
   3) Score & Valuation: suy từ dữ liệu (không lộ công thức).
   ============================================================ */
(function(){
const CFG=VCPC.CONFIG, RULES=VCPC.CONFIG_ALERT, D=VCPC.DATA;
const NOW=new Date(CFG.asOf+'T18:00:00');
function rng(seed){ let a=seed>>>0; return function(){ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const LIFE=['new','ack','progress','closed','overdue'];
const LIFE_W=[0.34,0.20,0.24,0.14,0.08];
function pickLife(r){ let x=r,s=0; for(let i=0;i<LIFE_W.length;i++){ s+=LIFE_W[i]; if(x<s) return LIFE[i]; } return 'progress'; }

/* ---- đọc giá trị metric của 1 thực thể ---- */
function val(entity,metric){ return entity[metric]; }
function cmp(v,op,th){ return op==='<'? v<th : v>th; }
function ruleHit(rule,e){
  if(!rule.enabled) return false;
  if(rule.cohortExempt && e.cohort==='new') return false;
  let ok=cmp(val(e,rule.metric),rule.operator,rule.threshold);
  if(ok && rule.and){ for(const c of rule.and){ if(!cmp(val(e,c.metric),c.operator,c.threshold)){ ok=false; break; } } }
  return ok;
}

/* ---- gợi ý nguyên nhân tính từ dữ liệu ---- */
function branchCauses(b){
  const c=[]; const w=b.weeks, n=w.length, li=n-2;
  const tr=Math.round((w[li].traffic-w[li-2].traffic)/w[li-2].traffic*100);
  const cv=Math.round((w[li].conv-w[li-2].conv)*10)/10;
  if(tr<=-5) c.push({vi:`lượt khách ↓${Math.abs(tr)}%`,en:`traffic ↓${Math.abs(tr)}%`});
  if(cv<0) c.push({vi:`tỷ lệ chuyển đổi ↓${Math.abs(cv)} điểm`,en:`conversion ↓${Math.abs(cv)} pts`});
  if(b.inventoryDays>72) c.push({vi:`tồn kho ${b.inventoryDays} ngày`,en:`inventory ${b.inventoryDays} days`});
  if(b.gmPct<40) c.push({vi:`biên gộp thấp ${b.gmPct}%`,en:`low margin ${b.gmPct}%`});
  if(b.turnoverPct>24) c.push({vi:`thiếu/biến động nhân sự`,en:`staffing instability`});
  if(!c.length) c.push({vi:'hiệu suất dưới kế hoạch nhiều tuần',en:'multi-week underperformance'});
  return c.slice(0,3);
}
function entityName(e,scope){ if(scope==='branch') return `${e.id} ${e.street}`; if(scope==='product') return e.name; if(scope==='channel') return e.name; return e.name||'Toàn công ty'; }

/* ---- sinh cảnh báo ---- */
function buildAlerts(){
  const R=rng(CFG.seed^0x51ED);
  const groups=[]; let id=0;
  RULES.forEach(rule=>{
    let entities=[];
    if(rule.scope==='branch') entities=D.branches;
    else if(rule.scope==='product') entities=D.products;
    else if(rule.scope==='channel') entities=D.online.channels;
    else entities=[ companyEntity() ];
    const hits=entities.filter(e=>ruleHit(rule,e));
    if(!hits.length) return;
    const items=hits.map(e=>{
      const life=pickLife(R());
      const ageH=Math.round(R()*rule.sla*1.6);
      let remain=rule.sla-ageH; let lifeF=life;
      if(remain<0 && lifeF!=='closed') lifeF='overdue';
      const created=new Date(NOW.getTime()-ageH*3600*1000);
      const actual=val(e,rule.metric);
      const causes = rule.scope==='branch'?branchCauses(e):productCh(rule,e);
      return { id:'A'+(id++), name:entityName(e,rule.scope), entity:e, scope:rule.scope,
        rule:rule.id, metric:rule.metric, threshold:rule.threshold, operator:rule.operator,
        actual, severity:rule.severity, owner:rule.owner, sla:rule.sla, remain, life:lifeF,
        created:created.toISOString().slice(0,10), causes, label:rule.label, suggest:suggestFor(rule,e) };
    });
    groups.push({ rule, items });
  });
  // KPI tổng hợp
  const all=groups.flatMap(g=>g.items);
  const kpi={ red:all.filter(a=>a.severity==='red'&&a.life!=='closed').length,
    orange:all.filter(a=>a.severity==='orange'&&a.life!=='closed').length,
    closed:all.filter(a=>a.life==='closed').length,
    overdue:all.filter(a=>a.life==='overdue').length };
  return { groups, all, kpi };
}
function companyEntity(){ return { id:'CO', name:'Toàn công ty', cohort:'mature',
  cashRunwayDays:D.company.cashRunwayDays, convDrop14:D.company.convDrop14 }; }
function productCh(rule,e){
  if(rule.scope==='product') return [{vi:`tồn ${e.inventoryDays} ngày · sell-through ${e.sellThrough}%`,en:`${e.inventoryDays} inv days · ${e.sellThrough}% sell-through`}];
  if(rule.scope==='channel') return [{vi:`ROAS ${e.roas} · chi phí/DT ${e.costToRevPct}%`,en:`ROAS ${e.roas} · cost/rev ${e.costToRevPct}%`}];
  return [{vi:`giá trị ${e[rule.metric]} vi phạm ngưỡng`,en:`value ${e[rule.metric]} breaches threshold`}];
}
function suggestFor(rule,e){
  const M={ R1:{vi:'Rà lượt khách, lịch nhân sự, hàng bán chạy 7 ngày',en:'Review traffic, staffing, fast-movers (7 days)'},
    R2:{vi:'Phân tích xu hướng & kích hoạt khuyến mãi cục bộ',en:'Analyse trend & trigger local promo'},
    R3:{vi:'Soát cơ cấu hàng & mức giảm giá',en:'Review SKU mix & markdown depth'},
    R4:{vi:'Markdown hoặc điều chuyển sang vùng bán nhanh',en:'Markdown or transfer to faster regions'},
    R5:{vi:'Tắt nhóm quảng cáo hiệu suất thấp',en:'Pause low-performance ad sets'},
    R6:{vi:'Kiểm tra tốc độ trang & bảng chọn size',en:'Check page speed & size guide'},
    R7:{vi:'Giãn/điều tiết đơn nhập tháng 6',en:'Stagger June purchase orders'},
    R8:{vi:'Soát lương thưởng & đào tạo quản lý cửa hàng',en:'Review pay & store-manager training'} };
  return M[rule.id]||{vi:'',en:''};
}

/* ---------- ENGINE KIẾN NGHỊ ---------- */
function buildRecommendations(){
  const recs=[]; let id=0;
  const push=(o)=>recs.push(Object.assign({id:'K'+(id++),status:'propose'},o));
  // 1) cụm CN dưới plan kéo dài
  const under=D.branches.filter(b=>b.planYtdPct<82 && b.cohort!=='new').sort((a,b)=>a.planYtdPct-b.planYtdPct);
  if(under.length){ const names=under.slice(0,4).map(b=>b.id+' '+b.street);
    const gap=under.slice(0,4).reduce((s,b)=>s+(b.ytdPlan-b.ytdRev),0);
    push({ title:{vi:'Rà soát cụm chi nhánh dưới kế hoạch kéo dài',en:'Fix the cluster of chronically under-plan branches'},
      targets:names, impact:Math.max(2.2,Math.round(gap*0.45*10)/10), feasibility:'medium', owner:'COO',
      detail:{vi:`Đàm phán lại thuê / soát format / điều chuyển hàng cho ${names.length} chi nhánh yếu nhất (${names.join(', ')}).`,
        en:`Renegotiate rent / review format / transfer stock for the ${names.length} weakest branches (${names.join(', ')}).`} }); }
  // 2) nhóm hàng tồn cao + sell-through thấp
  const md=D.products.filter(p=>p.markdown||p.action==='transfer');
  if(md.length){ const names=md.map(p=>p.name.vi); const cap=Math.round(md.reduce((s,p)=>s+p.rev*0.12,0)*10)/10;
    push({ title:{vi:'Markdown / điều chuyển nhóm hàng tồn cao',en:'Markdown / transfer high-inventory categories'},
      targets:md.map(p=>p.name), impact:cap, feasibility:'high', owner:'Merchandising',
      detail:{vi:`Giải phóng vốn tồn ở ${names.join(', ')}; tồn > ngưỡng & sell-through thấp.`,
        en:`Free up inventory capital in ${md.map(p=>p.name.en).join(', ')}; above threshold with low sell-through.`} }); }
  // 3) conversion website dưới mục tiêu
  if(D.online.convWebsite<D.online.convTarget){ const up=Math.round((D.online.convTarget-D.online.convWebsite)/D.online.convWebsite*D.company.ytdOnlineTotal*10)/10;
    push({ title:{vi:'Tối ưu trải nghiệm & bảng size để nâng tỷ lệ chuyển đổi',en:'Optimize UX & size guide to lift conversion'},
      targets:[{vi:'Website & TMĐT',en:'Website & e-commerce'}], impact:Math.max(1.5,up), feasibility:'medium', owner:'E-commerce',
      detail:{vi:`Đưa tỷ lệ chuyển đổi từ ${D.online.convWebsite}% lên mục tiêu ${D.online.convTarget}% — upside doanh thu online.`,
        en:`Move conversion from ${D.online.convWebsite}% to the ${D.online.convTarget}% target — online revenue upside.`} }); }
  // 4) kênh marketing cần cắt
  const cut=D.online.channels.filter(c=>c.cut);
  if(cut.length){ push({ title:{vi:'Cắt/điều chỉnh kênh marketing hiệu suất thấp',en:'Cut/adjust low-efficiency marketing channels'},
      targets:cut.map(c=>c.name), impact:Math.round(cut.reduce((s,c)=>s+c.cost*0.35,0)*10)/10, feasibility:'high', owner:'Marketing',
      detail:{vi:`${cut.map(c=>c.name.vi).join(', ')} có ROAS < 3.0 và chi phí/doanh thu cao — tái phân bổ ngân sách.`,
        en:`${cut.map(c=>c.name.en).join(', ')} show ROAS < 3.0 and high cost/revenue — reallocate budget.`} }); }
  // 5) cash runway nhạy với PO
  push({ title:{vi:'Giãn lịch nhập hàng để bảo vệ dòng tiền',en:'Stagger purchasing to protect cash'},
    targets:[{vi:'Dòng tiền công ty',en:'Company cashflow'}], impact:0, feasibility:'high', owner:'CFO',
    detail:{vi:`Số ngày tiền mặt ${D.company.cashRunwayDays} ngày, có thể về ${D.company.cashRunwayPO} ngày nếu đặt PO lớn tháng 6 — nhập theo tỷ lệ bán hết.`,
      en:`Cash runway ${D.company.cashRunwayDays} days, may drop to ${D.company.cashRunwayPO} with a large June PO — purchase by sell-through.`} });
  // 6) cohort CN mới turnover cao
  const ht=D.branches.filter(b=>b.cohort==='new'&&b.turnoverPct>24);
  if(ht.length){ push({ title:{vi:'Giữ chân nhân sự tại chi nhánh mới',en:'Retain staff at new branches'},
      targets:ht.map(b=>({vi:b.id,en:b.id})), impact:0, feasibility:'medium', owner:'HR',
      detail:{vi:`Tỷ lệ nghỉ việc cao ở ${ht.map(b=>b.id).join(', ')} — review lương thưởng & đào tạo quản lý cửa hàng.`,
        en:`High turnover at ${ht.map(b=>b.id).join(', ')} — review incentives & store-manager training.`} }); }
  // xếp hạng theo (impact × feasibility)
  const fw={high:1.0,medium:0.7,low:0.45};
  recs.forEach(r=>r.score=Math.round((r.impact+0.5)*fw[r.feasibility]*10)/10);
  recs.sort((a,b)=>b.score-a.score);
  const totalImpact=Math.round(recs.reduce((s,r)=>s+r.impact,0)*10)/10;
  return { recs, totalImpact };
}

/* ---------- SCORE & VALUATION (suy từ dữ liệu, KHÔNG lộ công thức) ---------- */
function buildScoreValuation(){
  const C=D.company, B=D.branches;
  // sub-signals 0–100 (nội bộ)
  const sFin=clamp((C.ebitdaCompany-6)/(16-6)*100,0,100);
  const sCash=clamp((C.cashRunwayDays-30)/(90-30)*100,0,100);
  const healths=B.map(b=>b.health); const mean=healths.reduce((a,c)=>a+c,0)/healths.length;
  const sd=Math.sqrt(healths.reduce((a,c)=>a+(c-mean)*(c-mean),0)/healths.length);
  const sEven=clamp(100-(sd-8)*3.2,0,100);              // càng đồng đều càng cao
  const sExpand=clamp((mean-45)/(75-45)*100,0,100);
  const sGrowth=clamp(((C.runRateRevenue/CFG.targets.annualRevenue)*72)+ (C.regionMix.South<70?12:4),0,100);
  const sData=62;                                       // chất lượng dữ liệu (trung thực, còn cải thiện)
  const score=Math.round(sFin*0.22+sCash*0.12+sEven*0.16+sExpand*0.18+sGrowth*0.2+sData*0.12);
  const tiers=['notready','developing','nearready','investorready','premium'];
  const tier = score<30?0:score<50?1:score<68?2:score<85?3:4;
  // valuation range (Tỷ VNĐ) từ EBITDA run-rate — KHÔNG hiển thị multiple
  const ebitda=C.runRateEbitda;
  const low=Math.round(ebitda*CFG.valuation._evToEbitdaLow);
  const base=Math.round(ebitda*CFG.valuation._evToEbitdaBase);
  const high=Math.round(ebitda*CFG.valuation._evToEbitdaHigh);
  // 3 điểm nâng hạng (teaser) suy từ điểm yếu
  const lifts=[];
  if(sEven<70) lifts.push('even'); if(sData<75) lifts.push('data'); if(sCash<70) lifts.push('cash');
  if(sExpand<70) lifts.push('expand'); if(sFin<70) lifts.push('fin');
  return { score, tier, tiers, sub:{sFin:Math.round(sFin),sCash:Math.round(sCash),sEven:Math.round(sEven),sExpand:Math.round(sExpand),sGrowth:Math.round(sGrowth),sData:Math.round(sData)},
    val:{low,base,high,ebitda:Math.round(ebitda)}, lifts:lifts.slice(0,3) };
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

VCPC.ENGINE={ buildAlerts, buildRecommendations, buildScoreValuation };
})();
