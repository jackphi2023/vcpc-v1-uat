/* ============================================================
   VCPC Dashboard — DATASET MÔ PHỎNG (seeded, xác định)
   Logic thật, số liệu giả lập. Mọi chỉ số suy ra trong code.
   Xuất ra VCPC.DATA (branches, company, products, online,
   marketing, derived helpers).
   ============================================================ */
(function(){
const CFG = VCPC.CONFIG;

/* ---------- RNG xác định (mulberry32) ---------- */
function rng(seed){ let a=seed>>>0; return function(){ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const r2=v=>Math.round(v*100)/100;
const r1=v=>Math.round(v*10)/10;

/* ---------- Hệ số mùa vụ theo tuần (kế hoạch "ôm" mùa vụ) ---------- */
// 23 tuần 01/01 → 10/06/2026. Tết ~ tuần 6 (giữa 02). Mid-year sale cuối 05–đầu 06.
const SEASON=[0.96,0.98,1.00,1.05,1.18,1.30,0.74,0.80,0.92,0.98,1.00,0.99,1.01,1.02,1.00,0.98,1.00,1.03,1.05,1.06,1.16,1.20,0.58];
const WEEK_MONTH=[0,0,0,0,1,1,1,1,2,2,2,2,2,3,3,3,3,4,4,4,4,5,5]; // map tuần -> tháng (0=Th1..5=Th6)
const MONTHS_VI=['Th1','Th2','Th3','Th4','Th5','Th6·đến 10/6'];
const MONTHS_EN=['Jan','Feb','Mar','Apr','May','Jun·to 10'];

/* ---------- 40 chi nhánh (cơ sở) ---------- */
// [id, street, city, region, format, ageMonths]
const BR=[
['HCM-01','Sư Vạn Hạnh','TP.HCM','South','Flagship',52],
['HCM-02','Nguyễn Trãi','TP.HCM','South','Flagship',44],
['HCM-03','Lê Văn Duyệt','TP.HCM','South','Standard',38],
['HCM-04','Huỳnh Tấn Phát','TP.HCM','South','Standard',30],
['HCM-05','Quang Trung','TP.HCM','South','Flagship',40],
['HCM-06','Võ Văn Ngân','TP.Thủ Đức','South','Standard',26],
['HCM-07','Lê Văn Việt','TP.Thủ Đức','South','Standard',22],
['HCM-08','Đỗ Xuân Hợp','TP.Thủ Đức','South','Compact',16],
['HCM-09','Phan Văn Hớn','TP.HCM','South','Compact',14],
['HCM-10','Lê Văn Quới','TP.HCM','South','Standard',19],
['HCM-11','Hóc Môn','TP.HCM','South','Compact',12],
['HCM-12','Củ Chi','TP.HCM','South','Compact',4],
['BD-01','Thủ Dầu Một','Bình Dương','South','Standard',5],
['BH-01','Biên Hòa','Đồng Nai','South','Flagship',24],
['CT-01','Ninh Kiều','Cần Thơ','South','Flagship',34],
['CT-02','Cái Răng','Cần Thơ','South','Standard',17],
['TG-01','Mỹ Tho','Tiền Giang','South','Standard',20],
['VL-01','Vĩnh Long','Vĩnh Long','South','Compact',15],
['ĐT-01','Cao Lãnh','Đồng Tháp','South','Compact',18],
['AG-01','Long Xuyên','An Giang','South','Standard',21],
['TV-01','Trà Vinh','Trà Vinh','South','Compact',16],
['CM-01','Cà Mau','Cà Mau','South','Compact',13],
['HN-01','Cầu Giấy','Hà Nội','North','Flagship',48],
['HN-02','Xã Đàn','Hà Nội','North','Standard',33],
['HN-03','Kim Mã','Hà Nội','North','Standard',28],
['HN-04','Hà Đông','Hà Nội','North','Standard',20],
['HN-05','Long Biên','Hà Nội','North','Compact',15],
['HN-06','Hoàn Kiếm','Hà Nội','North','Flagship',41],
['HP-01','Lê Chân','Hải Phòng','North','Standard',25],
['BN-01','Bắc Ninh','Bắc Ninh','North','Compact',12],
['HD-01','Hải Dương','Hải Dương','North','Compact',4],
['NĐ-01','Nam Định','Nam Định','North','Compact',2],
['DN-01','Hải Châu','Đà Nẵng','Central','Flagship',36],
['DN-02','Thanh Khê','Đà Nẵng','Central','Standard',23],
['TTH-01','Phú Hội','Huế','Central','Standard',19],
['KH-01','Nha Trang','Khánh Hòa','Central','Standard',27],
['BĐ-01','Quy Nhơn','Bình Định','Central','Compact',14],
['ĐL-01','Buôn Ma Thuột','Đắk Lắk','Central','Compact',16],
['QN-01','Quảng Ngãi','Quảng Ngãi','Central','Compact',3],
['PY-01','Tuy Hòa','Phú Yên','Central','Compact',5]
];
const MGR=['Trần Minh Quân','Nguyễn Hải Long','Lê Thị Bích Trâm','Phạm Văn Hậu','Đỗ Thu Hà','Vũ Quốc Bảo','Hoàng Thị Mai','Bùi Đức Anh','Đặng Ngọc Lan','Phan Hoàng Nam','Trương Văn Tài','Ngô Thị Yến','Lý Minh Khôi','Cao Thị Diễm','Đinh Văn Sơn','Tô Ngọc Hân','Hồ Quang Vinh','Mai Thị Thuý','Châu Văn Lợi','Lâm Ngọc Bích','Võ Thành Đạt','Dương Thị Kim','Nguyễn Tuấn Kiệt','Trần Thị Hồng','Phạm Quốc Huy','Lê Văn Cường','Đoàn Thị Nga','Bạch Minh Tú','Hà Thị Loan','Trịnh Văn Bình','Nguyễn Thị Thu','Lê Hoàng Phúc','Trần Văn Lâm','Phùng Thị Hoa','Đặng Quốc Toản','Vương Thị Ánh','Tạ Minh Hoàng','Quách Thị Như','Lưu Văn Hoà','Tống Thị Bảo'];

// Cụm hiệu suất: chronic underperformer & stars
const CHRONIC={'ĐT-01':1,'TV-01':1,'CM-01':1,'NĐ-01':1};
const WEAK={'VL-01':1,'HD-01':1,'QN-01':1,'HN-04':1};
const STAR={'HCM-01':1,'HCM-05':1,'HN-01':1,'DN-01':1,'HCM-02':1};

const baseAnnual={Flagship:[17,22],Standard:[10,14],Compact:[6,9]};
const areaRange={Flagship:[180,260],Standard:[90,150],Compact:[45,80]};

function cohort(age){ return age<6?'new':age<=18?'ramp':'mature'; }

/* ---------- Sinh dữ liệu từng chi nhánh ---------- */
const branches=BR.map((b,i)=>{
  const [id,street,city,region,format,age]=b;
  const R=rng(CFG.seed + i*7919);
  const ar=areaRange[format]; const area=Math.round(ar[0]+R()*(ar[1]-ar[0]));
  const staff=clamp(Math.round(area/16 + (format==='Flagship'?3:1) + R()*2),5,16);
  const ba=baseAnnual[format]; let annual=ba[0]+R()*(ba[1]-ba[0]);
  if(region==='South') annual*=1.04; if(region==='Central') annual*=0.94;
  const co=cohort(age);
  // hệ số hiệu suất nền
  let perf = 0.92 + R()*0.12;            // 0.92–1.04 mid
  if(STAR[id]) perf = 1.06 + R()*0.10;
  else if(CHRONIC[id]) perf = 0.62 + R()*0.08;
  else if(WEAK[id]) perf = 0.78 + R()*0.06;
  // độ dốc xu hướng (đang tăng / đang giảm rõ rệt)
  let drift = (perf-0.95)*0.9 + (R()-0.5)*0.5;   // /23 tuần
  if(CHRONIC[id]) drift=-0.7-R()*0.5; if(STAR[id]) drift=0.6+R()*0.4;
  const weeks=[];
  const baseWeekly=annual/52;
  for(let w=0;w<CFG.weeks;w++){
    const planW = baseWeekly*SEASON[w]*1.0;
    // ramp cho CN mới
    let ramp=1; if(co==='new'){ ramp=clamp(0.55+ w*0.022 + R()*0.03, 0.55, 1.0); }
    const trendMul = 1 + (drift/100)*(w-CFG.weeks/2);
    const noise = 0.93 + R()*0.14;
    let rev = planW*perf*ramp*trendMul*noise;
    rev=Math.max(rev, planW*0.4);
    const aov = (format==='Flagship'?560:format==='Standard'?470:410)*(0.92+R()*0.18)/1000; // triệu/đơn
    const txn = (rev*1000)/ ( (format==='Flagship'?560:format==='Standard'?470:410)*(0.92+R()*0.18) ); // số đơn (rev tỷ)
    const txnN = Math.round(rev*1e9 / ((format==='Flagship'?560000:format==='Standard'?470000:410000)));
    const conv = clamp((STAR[id]?0.27:CHRONIC[id]?0.17:0.22) + (R()-0.5)*0.05 + drift*0.002, 0.12, 0.34);
    const traffic = Math.round(txnN/conv);
    let gm = (STAR[id]?0.485:CHRONIC[id]?0.385:0.45) + (R()-0.5)*0.03 - (SEASON[w]>1.1?0.012:0); // sale ép biên
    gm=clamp(gm,0.34,0.52);
    let inv = (CHRONIC[id]?86:WEAK[id]?72:format==='Flagship'?48:56) + (R()-0.5)*10 + (drift<0?6:-2);
    inv=clamp(Math.round(inv),32,98);
    const pickup = clamp((0.06 + (region==='South'?0.02:0) + R()*0.05),0.02,0.14);
    weeks.push({ rev:r2(rev), plan:r2(planW), traffic, txn:txnN, aov:r2((rev*1e9)/Math.max(txnN,1)/1e6),
      conv:Math.round(conv*1000)/10, gm:Math.round(gm*1000)/10, inv, pickup:Math.round(pickup*1000)/10 });
  }
  // ----- chỉ số suy ra -----
  const ytdRev=r2(weeks.reduce((s,x)=>s+x.rev,0));
  const ytdPlan=r2(weeks.reduce((s,x)=>s+x.plan,0));
  const planYtdPct=Math.round(ytdRev/ytdPlan*1000)/10;
  const li=weeks.length-2, pi=weeks.length-3;   // tuần đầy đủ gần nhất (tuần cuối là tuần lẻ đến 10/6)
  const last=weeks[li], prev=weeks[pi];
  const planWeekPct=Math.round(last.rev/last.plan*1000)/10;
  const wow=Math.round((last.rev-prev.rev)/prev.rev*1000)/10;
  // đếm tuần giảm liên tiếp trong 4 tuần gần nhất
  let trendDown=0; for(let k=li;k>li-4&&k>0;k--){ if(weeks[k].rev<weeks[k-1].rev) trendDown++; else break; }
  const gmPct=Math.round(weeks.reduce((s,x)=>s+x.gm,0)/weeks.length*10)/10;
  const inventoryDays=last.inv;
  const convPct=Math.round(weeks.reduce((s,x)=>s+x.conv,0)/weeks.length*10)/10;
  const pickupPct=Math.round(weeks.reduce((s,x)=>s+x.pickup,0)/weeks.length*10)/10;
  const revPerM2=Math.round(ytdRev*1000/area);          // triệu/m²
  const revPerStaff=Math.round(ytdRev*1000/staff/5.4);  // triệu/người/tháng (5.4 tháng)
  const turnoverPct=clamp(Math.round((co==='new'?28:co==='ramp'?17:12)+(R()-0.5)*8),6,38);
  // điểm sức khỏe 0–100
  const W=CFG.healthWeights;
  const nPlan=clamp((planYtdPct-70)/(112-70)*100,0,100);
  const nTrend=clamp(50 + (wow*4) - trendDown*14 + drift*22,0,100);
  const nMargin=clamp((gmPct-38)/(50-38)*100,0,100);
  const nInv=clamp((78-inventoryDays)/(78-40)*100,0,100);
  const nConv=clamp((convPct-16)/(30-16)*100,0,100);
  const health=Math.round(W.plan*nPlan+W.trend*nTrend+W.margin*nMargin+W.inventory*nInv+W.conversion*nConv);
  const B=CFG.statusBands;
  const status = health>=B.good?'good':health>=B.watch?'watch':health>=B.orange?'orange':'red';
  const onlineYtd=r2(ytdRev*pickupPct/100*1.5); // phần online quy cho CN (minh hoạ)
  const spark=weeks.slice(weeks.length-9, weeks.length-1).map(x=>x.rev);
  return { idx:i, id, street, city, region, format, age, cohort:co, area, staff,
    manager:MGR[i], weeks, spark, ytdRev, ytdPlan, planYtdPct, planWeekPct, wow, trendDown,
    gmPct, inventoryDays, convPct, pickupPct, revPerM2, revPerStaff, turnoverPct, health, status, onlineYtd };
});

/* ---------- Tổng hợp công ty ---------- */
const monthRev=[0,0,0,0,0,0], monthOnline=[0,0,0,0,0,0];
branches.forEach(b=>b.weeks.forEach((x,w)=>{ const m=WEEK_MONTH[w]; monthRev[m]+=x.rev; monthOnline[m]+=x.rev*x.pickup/100*1.5; }));
const ytdRevTotal=r2(monthRev.reduce((a,c)=>a+c,0));
const ytdOnlineTotal=r2(monthOnline.reduce((a,c)=>a+c,0));
const planMonth=[37.0,35.0,38.0,40.5,42.0,14.0];
const finance=monthRev.map((rev,m)=>{ rev=r2(rev); const cogs=r2(rev*0.549); const gp=r2(rev-cogs);
  const opex=r2(rev*(0.33 + (m===1?0.01:0) - (m>=3?0.005:0))); const ebitda=r2(gp-opex);
  return { m, rev, cogs, gp, opex, ebitda, ebitdaPct:Math.round(ebitda/rev*1000)/10, planRev:planMonth[m], gmPct:Math.round(gp/rev*1000)/10 }; });
const gmCompany=Math.round(finance.reduce((s,f)=>s+f.gp,0)/ytdRevTotal*1000)/10;
const ebitdaCompany=Math.round(finance.reduce((s,f)=>s+f.ebitda,0)/ytdRevTotal*1000)/10;
const runRateRevenue=Math.round(ytdRevTotal/0.452);   // ước tính cả năm
const runRateEbitda=r1(runRateRevenue*ebitdaCompany/100);
const regionMix=(()=>{ const o={South:0,North:0,Central:0}; branches.forEach(b=>o[b.region]+=b.ytdRev); const t=o.South+o.North+o.Central; return {South:Math.round(o.South/t*100),North:Math.round(o.North/t*100),Central:Math.round(o.Central/t*100)}; })();
const cashRunwayDays=52, cashRunwayPO=43;
const convDrop14=0.31; // điểm chuyển đổi website giảm 14 ngày (cho R6)
const company={ monthRev:monthRev.map(r2), monthOnline:monthOnline.map(r2), planMonth, finance,
  ytdRevTotal, ytdOnlineTotal, gmCompany, ebitdaCompany, runRateRevenue, runRateEbitda, regionMix,
  cashRunwayDays, cashRunwayPO, convDrop14, months:{vi:MONTHS_VI,en:MONTHS_EN},
  branchesOnPlan:Math.round(branches.filter(b=>b.planYtdPct>=95).length/branches.length*100),
  redCount:branches.filter(b=>b.status==='red').length };

/* ---------- Sản phẩm & tồn kho (7 nhóm) ---------- */
const productBase=[
['T-shirt',{vi:'Áo thun',en:'T-shirts'},52.1,48,72,38,2.9,520,9],
['Polo',{vi:'Áo polo',en:'Polo shirts'},33.4,47,69,44,2.7,410,11],
['Shirt',{vi:'Sơ mi',en:'Shirts'},29.8,46,64,50,2.4,360,14],
['Jeans',{vi:'Quần jean & kaki',en:'Jeans & chinos'},35.6,43,61,57,2.2,300,18],
['Short',{vi:'Quần short & jogger',en:'Shorts & joggers'},22.4,42,59,55,2.1,260,16],
['Jacket',{vi:'Áo khoác',en:'Outerwear'},14.8,41,43,84,1.6,180,34],
['Accessory',{vi:'Phụ kiện',en:'Accessories'},16.4,52,49,71,1.8,640,22]
];
const products=productBase.map(p=>{ const [key,name,rev,gm,sell,inv,gmroi,sku,slowPct]=p;
  const markdown = inv>75 && sell<50; const transfer = inv>68 && sell<60 && !markdown;
  const action = markdown?'markdown':transfer?'transfer':sell>65?'replenish':'hold';
  return { key, name, rev, gm, sellThrough:sell, inventoryDays:inv, gmroi, sku, slowPct, markdown, action }; });

/* ---------- Online & CRM ---------- */
const funnel=[['traffic',{vi:'Lượt truy cập',en:'Traffic'},1680000],['view',{vi:'Xem sản phẩm',en:'Product view'},492000],
['cart',{vi:'Thêm giỏ',en:'Add to cart'},121000],['checkout',{vi:'Thanh toán',en:'Checkout'},48000],['order',{vi:'Đơn hàng',en:'Orders'},31000]];
const onlineToStore=8600; // số khách online đến cửa hàng
const channels=[
['search',{vi:'Tìm kiếm',en:'Search'},34.0,8.2],
['social',{vi:'Mạng xã hội',en:'Social'},24.0,9.6],
['kol',{vi:'KOL/Affiliate',en:'KOL/Affiliate'},9.8,3.0],
['crm',{vi:'CRM/Email',en:'CRM/Email'},6.2,1.1],
['ooh',{vi:'Ngoài trời',en:'OOH'},3.4,2.4]
].map(c=>{ const [key,name,rev,cost]=c; const roas=Math.round(rev/cost*100)/100; const costToRevPct=Math.round(cost/rev*1000)/10;
  return { key,name,rev,cost,roas,costToRevPct, cut: roas<3.0 && costToRevPct>7.5 }; });
const online={ funnel, onlineToStore, channels,
  convWebsite:1.85, convTarget:2.2, cac:96, cacPlan:86, repeatRate:31, repeatTarget:38,
  onlineTarget:CFG.targets.annualOnline };

/* ---------- Marketing & nhân sự ---------- */
const hr={ regions:[['South',91,18],['North',84,16],['Central',79,19]],
  totalStaff:branches.reduce((s,b)=>s+b.staff,0),
  avgTurnover:Math.round(branches.reduce((s,b)=>s+b.turnoverPct,0)/branches.length),
  mktToRevPct:6.4 };

VCPC.DATA={ branches, company, products, online, hr,
  fmt:{ ty:v=>r1(v), pct:v=>Math.round(v*10)/10 },
  source:'sim' };
})();
