/* VCPC Auto — retail-chain seed company.
   Single source of truth for the demo dashboards & dummy app data.
   Matches build brief §10.2 (F&B / chain priority). */
(function(){
  // Retail chain — fashion (jacket-led), 40 branches, multi-region. Period: 2026 H1.
  const seed = {
    company: {
      name: { vi: 'Công ty CP Thời trang DEMO', en: 'DEMO Fashion JSC' },
      industry: 'retail_apparel',
      legal_id: '0123456789',
      revenue_band: '50_300B',
      employees: 580,
      branches: 40,
      regions: { South: 18, North: 12, Central: 10 }
    },
    period: { start: '2026-01-01', end: '2026-06-10', granularity: 'weekly', as_of: '2026-06-10' },
    kpis: {
      revenue_ytd: 197.9, revenue_target: 450,
      revenue_online_ytd: 28.4, revenue_online_target: 65,
      gross_margin_pct: 45.1, gross_margin_target: 46.0,
      ebitda_margin_pct: 12.2, ebitda_margin_target: 12.0,
      cash_runway_days: 52, cash_runway_po: 43,
      plan_attainment_pct: 98,
      roas_avg: 3.19, roas_benchmark: 3.5,
      cost_to_rev_pct: 7.4,
      conv_website: 1.9, conv_target: 2.4,
      inventory_days: 64, dso: 38,
      branches_at_plan: 27,
      branches_at_risk: 8
    },
    revenue_by_month: [
      { m:'Jan', actual:33.2, plan:34.0, online:4.4 },
      { m:'Feb', actual:33.8, plan:35.2, online:4.7 },
      { m:'Mar', actual:42.0, plan:40.5, online:5.1 },
      { m:'Apr', actual:35.0, plan:36.0, online:4.6 },
      { m:'May', actual:38.1, plan:38.5, online:4.8 },
      { m:'Jun', actual:15.8, plan:16.0, online:4.8 }
    ],
    pnl_waterfall: [
      { code:'rev', label:{vi:'Doanh thu',en:'Revenue'}, value: 197.9, type:'total' },
      { code:'cogs', label:{vi:'Giá vốn',en:'COGS'}, value: 108.7, type:'sub' },
      { code:'gp', label:{vi:'Lãi gộp',en:'Gross profit'}, value: 89.3, type:'total' },
      { code:'opex', label:{vi:'Chi phí vận hành',en:'Operating cost'}, value: 65.2, type:'sub' },
      { code:'ebitda', label:{vi:'EBITDA',en:'EBITDA'}, value: 24.1, type:'total' }
    ],
    monthly_pnl: [
      { m:'Jan', rev:33.2, cogs:18.2, gp:15.0, opex:11.0, ebitda:4.0, ebitda_pct:12.1 },
      { m:'Feb', rev:33.8, cogs:18.6, gp:15.2, opex:11.5, ebitda:3.8, ebitda_pct:11.3 },
      { m:'Mar', rev:42.0, cogs:23.1, gp:19.0, opex:13.9, ebitda:5.1, ebitda_pct:12.1 },
      { m:'Apr', rev:35.0, cogs:19.2, gp:15.8, opex:11.4, ebitda:4.4, ebitda_pct:12.6 },
      { m:'May', rev:38.1, cogs:20.9, gp:17.2, opex:12.4, ebitda:4.8, ebitda_pct:12.6 },
      { m:'Jun', rev:15.8, cogs:8.7, gp:7.1, opex:5.1, ebitda:2.0, ebitda_pct:12.6 }
    ],
    branches: (function(){
      const codes = ['HCM-01','HCM-02','HCM-03','HCM-04','HCM-05','HCM-06','HCM-07','HCM-08',
        'HCM-09','HCM-10','HCM-11','HCM-12','BD-01','BH-01','CT-01','CT-02','VL-01','VT-01',
        'TV-01','BL-01','CM-01','HN-01','HN-02','HN-03','HN-04','BN-01','HP-01','HP-02',
        'DN-01','DH-01','HU-01','TTH-01','KH-01','BD-02','PT-01','GL-01','QN-01','BN-02','BL-02','PH-01'];
      const streets = ['Nguyễn Trãi','Lê Lợi','Lê Lai','Trần Hưng Đạo','Phạm Văn Đồng','Cách Mạng',
        'Trường Chinh','Cộng Hoà','Hai Bà Trưng','Pasteur','Nam Kỳ','Hùng Vương','Lý Tự Trọng',
        'Nguyễn Huệ','Lê Duẩn','Cá Mau','Trà Vinh','Vũng Tàu','Vĩnh Long','Bình Hòa','Cần Thơ',
        'Ninh Kiều','Nha Trang','Đồng Hới','Huế','Kim Mã','Cầu Giấy','Hà Đông','Long Biên',
        'Bắc Ninh','Hải Phòng','Đà Nẵng','Quy Nhơn','Pleiku','Phú Yên','Quảng Ngãi','Bình Định',
        'Mỹ Tho','Phan Rang','Phan Thiết'];
      const regions = ['South','South','South','South','South','South','South','South','South','South','South','South',
        'South','South','South','South','South','South','South','South','South',
        'North','North','North','North','North','North','North','North','North',
        'Central','Central','Central','Central','Central','Central','Central','Central','Central','Central'];
      let s = 20260610; function rnd(){ s = (s+0x6D2B79F5)>>>0; let t = Math.imul(s^s>>>15, 1|s); t = t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }
      return codes.map(function(code, i){
        const baseHealth = 30 + Math.floor(rnd()*70);
        const health = Math.max(0, Math.min(100, baseHealth));
        const gm = 38 + rnd()*9;
        const ebitda = 8 + rnd()*8;
        const ytdRev = (3 + rnd()*8);
        const planPct = 70 + Math.floor(rnd()*40);
        const trendWeeks = Array.from({length:8}, function(){ return Math.round(60 + rnd()*40); });
        const inv = 45 + Math.floor(rnd()*40);
        const conv = 18 + Math.floor(rnd()*15);
        const ch = 30 + Math.floor(rnd()*40);
        const turn = 12 + Math.floor(rnd()*22);
        return {
          id: code, street: streets[i] || code, region: regions[i] || 'South',
          format: rnd() > 0.65 ? 'large' : (rnd() > 0.5 ? 'compact' : 'standard'),
          cohort: rnd() > 0.85 ? 'new' : (rnd() > 0.6 ? 'expanding' : 'mature'),
          health, gmPct: Math.round(gm*10)/10, ebitdaPct: Math.round(ebitda*10)/10,
          ytdRev: Math.round(ytdRev*10)/10, ytdPlan: Math.round(ytdRev*100/planPct*10)/10,
          planYtdPct: planPct, planWeekPct: Math.max(50, Math.min(105, planPct + Math.floor(rnd()*20)-10)),
          inventoryDays: inv, conversionPct: conv, churnPct: ch, turnoverPct: turn,
          trend: trendWeeks
        };
      });
    })(),
    products: [
      { code:'JACKET', name:{vi:'Áo khoác',en:'Jackets'}, rev: 32.5, gmPct: 41.0, inventoryDays: 84, sellThrough: 38, markdown: true, action: 'markdown' },
      { code:'ACC', name:{vi:'Phụ kiện',en:'Accessories'}, rev: 12.4, gmPct: 47.5, inventoryDays: 78, sellThrough: 44, markdown: true, action: 'transfer' },
      { code:'SHIRT', name:{vi:'Áo sơ-mi',en:'Shirts'}, rev: 41.8, gmPct: 46.2, inventoryDays: 58, sellThrough: 62, markdown: false },
      { code:'DRESS', name:{vi:'Đầm',en:'Dresses'}, rev: 35.2, gmPct: 48.4, inventoryDays: 52, sellThrough: 68, markdown: false },
      { code:'PANTS', name:{vi:'Quần',en:'Pants'}, rev: 38.6, gmPct: 45.1, inventoryDays: 56, sellThrough: 60, markdown: false },
      { code:'BAG', name:{vi:'Túi',en:'Bags'}, rev: 22.4, gmPct: 49.8, inventoryDays: 62, sellThrough: 55, markdown: false }
    ],
    channels: [
      { code:'STORE', name:{vi:'Cửa hàng',en:'Stores'}, rev: 153.6, cost: 3.4, roas: 4.5, costToRevPct: 2.2 },
      { code:'WEB', name:{vi:'Website',en:'Website'}, rev: 14.8, cost: 1.9, roas: 3.8, costToRevPct: 12.8 },
      { code:'SHOPEE', name:{vi:'Shopee/Lazada',en:'Marketplace'}, rev: 11.6, cost: 1.6, roas: 3.2, costToRevPct: 13.8 },
      { code:'TIKTOK', name:{vi:'TikTok Shop',en:'TikTok Shop'}, rev: 2.1, cost: 0.95, roas: 2.2, costToRevPct: 45, cut: true },
      { code:'SOCIAL', name:{vi:'Mạng xã hội',en:'Social ads'}, rev: 6.4, cost: 2.1, roas: 2.7, costToRevPct: 32, cut: true },
      { code:'OOH', name:{vi:'Ngoài trời',en:'OOH'}, rev: 3.8, cost: 1.5, roas: 2.4, costToRevPct: 39, cut: true }
    ],
    cashflow: {
      cash_now: 11.4, cash_30d: 9.2, cash_60d: 8.1, cash_90d: 6.6,
      runway_days: 52, runway_days_with_po: 43,
      ap_days: 28, ar_days: 38, inv_days: 64,
      monthly_opex: 6.8
    },
    alerts_seed: [
      { id:'A1', sev:'red', label_vi:'Doanh thu tuần dưới 75% kế hoạch', label_en:'Weekly revenue below 75% of plan', target:'TV-01 Trà Vinh', owner:'COO', actual:60, threshold:75 },
      { id:'A2', sev:'red', label_vi:'Doanh thu tuần dưới 75% kế hoạch', label_en:'Weekly revenue below 75% of plan', target:'ĐT-01 Cao Lãnh', owner:'COO', actual:59, threshold:75 },
      { id:'A3', sev:'red', label_vi:'Doanh thu tuần dưới 75% kế hoạch', label_en:'Weekly revenue below 75% of plan', target:'CM-01 Cà Mau', owner:'COO', actual:61, threshold:75 },
      { id:'A4', sev:'orange', label_vi:'ROAS kênh < 3.0 & chi phí/doanh thu > 7.5%', label_en:'Channel ROAS < 3.0 & cost/rev > 7.5%', target:'Mạng xã hội', owner:'Marketing', actual:2.7, threshold:3.0 },
      { id:'A5', sev:'orange', label_vi:'Tồn kho vượt 75 ngày', label_en:'Inventory above 75 days', target:'Áo khoác', owner:'Merchandising', actual:84, threshold:75 },
      { id:'A6', sev:'orange', label_vi:'Tỷ lệ chuyển đổi website giảm > 0.25 điểm/14 ngày', label_en:'Website conv. dropped > 0.25 pts in 14 days', target:'Toàn công ty', owner:'E-commerce', actual:0.32, threshold:0.25 },
      { id:'A7', sev:'orange', label_vi:'Tỷ lệ nghỉ việc chi nhánh > 25%/năm', label_en:'Branch turnover > 25%/yr', target:'HN-03 Kim Mã', owner:'HR', actual:31, threshold:25 }
    ],
    recommendations_seed: [
      { id:'R1', priority:'high', title_vi:'Cắt/điều chỉnh kênh marketing hiệu suất thấp', title_en:'Cut low-efficiency marketing channels', impact:4.2, feasibility:'high', owner:'Marketing', tags:['Mạng xã hội','Ngoài trời'], status:'doing',
        detail_vi:'Mạng xã hội & Ngoài trời có ROAS < 3.0 và chi phí/doanh thu cao — tái phân bổ ngân sách sang Web + Shopee.',
        detail_en:'Social & OOH have ROAS < 3.0 and high cost/revenue — reallocate to Web + Marketplace.' },
      { id:'R2', priority:'high', title_vi:'Markdown / điều chuyển nhóm hàng tồn cao', title_en:'Markdown / transfer high-inventory categories', impact:3.7, feasibility:'high', owner:'Merchandising', tags:['Áo khoác','Phụ kiện'], status:'done',
        detail_vi:'Giải phóng vốn tồn ở Áo khoác (84 ngày, sell-through 38%) và Phụ kiện (78 ngày).',
        detail_en:'Free up inventory capital in Jackets (84 days, 38% sell-through) and Accessories (78 days).' },
      { id:'R3', priority:'medium', title_vi:'Rà soát cụm chi nhánh dưới kế hoạch kéo dài', title_en:'Fix chronic under-plan branch cluster', impact:3.4, feasibility:'medium', owner:'COO', tags:['TV-01','ĐT-01','CM-01','VL-01'], status:'propose',
        detail_vi:'Đàm phán lại thuê / soát format / điều chuyển hàng cho 4 chi nhánh yếu nhất.',
        detail_en:'Renegotiate rent / review format / transfer stock for the 4 weakest branches.' },
      { id:'R4', priority:'medium', title_vi:'Giãn lịch nhập hàng để bảo vệ dòng tiền', title_en:'Stagger purchasing to protect cash', impact:2.4, feasibility:'high', owner:'CFO', tags:['Cashflow'], status:'propose',
        detail_vi:'Số ngày tiền mặt 52 ngày, có thể về 43 nếu đặt PO lớn tháng 6 — nhập theo tỷ lệ bán hết.',
        detail_en:'Cash runway 52 days, may drop to 43 with a large June PO — purchase by sell-through.' },
      { id:'R5', priority:'medium', title_vi:'Nâng tỷ lệ chuyển đổi website', title_en:'Lift website conversion', impact:1.9, feasibility:'medium', owner:'E-commerce', tags:['Website','UX'], status:'propose',
        detail_vi:'Đưa conversion từ 1,9% lên 2,4% mục tiêu — soát tốc độ trang, bảng size, giỏ hàng.',
        detail_en:'Lift conversion from 1.9% to 2.4% target — review page speed, size guide, cart.' }
    ],
    mi_seed: [
      { id:'MI1', headline_vi:'Trung tâm thương mại quận 7 ra mắt khu thời trang mới', headline_en:'District 7 mall opens new fashion wing',
        source:'thoibaokinhdoanh.vn', tier:'B', date:'2026-06-08', impact_vi:'Cơ hội mở thêm 1 cửa hàng concept store.', impact_en:'Opportunity to open a concept store.',
        related_kpi:'revenue', status:'PUBLISHED' },
      { id:'MI2', headline_vi:'Đối thủ A tăng giá 5% trên dòng outerwear', headline_en:'Competitor A raises outerwear prices 5%',
        source:'Báo cáo nội bộ', tier:'A', date:'2026-06-09', impact_vi:'Cơ hội giữ giá → tăng share dòng áo khoác.', impact_en:'Hold prices to gain share in jackets.',
        related_kpi:'gm', status:'AI_DRAFT' },
      { id:'MI3', headline_vi:'Phí logistics nội địa giảm 3% từ Q3', headline_en:'Domestic logistics fees down 3% from Q3',
        source:'Hiệp hội Logistics', tier:'A', date:'2026-06-06', impact_vi:'EBITDA cải thiện ~0,2pt nếu tái đàm phán hợp đồng.', impact_en:'~0.2pt EBITDA upside if contracts renegotiated.',
        related_kpi:'ebitda', status:'PUBLISHED' },
      { id:'MI4', headline_vi:'TikTok Shop điều chỉnh phí hoa hồng', headline_en:'TikTok Shop adjusts commission fees',
        source:'TikTok Seller Center', tier:'A', date:'2026-06-05', impact_vi:'ROAS kênh có thể tiếp tục dưới 3,0 — rà soát quyết định cắt.', impact_en:'Channel ROAS likely stays below 3.0 — review cut decision.',
        related_kpi:'roas', status:'PUBLISHED' }
    ],
    capital_readiness: {
      score: 56, tier: 'near_ready',
      valuation: { low: 163, base: 214, high: 280, currency: 'VND_B' },
      sub: { fin: 64, cash: 58, even: 49, expand: 62, growth: 60, data: 62 },
      tiers_vi: ['Chưa sẵn sàng','Đang phát triển','Gần sẵn sàng','Sẵn sàng gọi vốn','Hạng cao cấp'],
      tiers_en: ['Not ready','Developing','Near ready','Investor ready','Premium']
    },
    audit_seed: [
      { event:'ORG_CREATED', at:'2026-01-15', by:'CEO' },
      { event:'PLAN_SELECTED', at:'2026-01-15', by:'CEO', payload:'BIZHEALTH_STANDARD' },
      { event:'INTAKE_SUBMITTED', at:'2026-01-16', by:'CEO' },
      { event:'UPLOAD_RECEIVED', at:'2026-01-17', by:'CFO', payload:'P&L_2025.xlsx, sales_2025_2026.xlsx' },
      { event:'DQS_COMPUTED', at:'2026-01-17', by:'system', payload:'Score 78 / threshold 70' },
      { event:'SCOPE_CONFIRMED', at:'2026-01-18', by:'CEO' },
      { event:'PAYMENT_CREATED', at:'2026-01-18', by:'CEO', payload:'Instalment 1 · 50%' },
      { event:'PAYMENT_PAID', at:'2026-01-18', by:'BaoKim', payload:'TXN_DEMO' },
      { event:'VCPC_REVIEW_PUBLISHED', at:'2026-01-22', by:'VCPC consultant', payload:'BizHealth Standard v1' }
    ]
  };
  window.VCPC_SEED = seed;
})();
