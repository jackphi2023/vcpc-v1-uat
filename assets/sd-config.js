/* ============================================================
   VCPC Operations Strategy Dashboard — CONFIG (config-driven)
   Mô phỏng "tab cấu hình trên Google Sheet". Đổi ngưỡng = sửa
   ở đây, KHÔNG sửa logic engine.
   ============================================================ */
window.VCPC = window.VCPC || {};

VCPC.CONFIG = {
  /* --- Kết nối dữ liệu live --- */
  SHEET_CSV_URL: '',          // rỗng -> dùng dataset mô phỏng (seeded). Có URL -> đọc CSV published.
  refreshMinutes: 15,
  seed: 20260610,
  asOf: '2026-06-10',         // tuần dữ liệu mới nhất
  periodStart: '2026-01-01',
  weeks: 23,

  /* --- Mục tiêu năm 2026 (tỷ VNĐ) --- */
  targets: { annualRevenue: 450, annualOnline: 65, gmPct: 45, ebitdaPct: 12 },

  /* --- Trọng số điểm sức khỏe chi nhánh (cho phép chỉnh) --- */
  healthWeights: { plan: 0.35, trend: 0.20, margin: 0.20, inventory: 0.15, conversion: 0.10 },

  /* --- Ngưỡng suy ra TRẠNG THÁI từ điểm sức khỏe (một nguồn sự thật) --- */
  statusBands: { good: 70, watch: 55, orange: 40 },   // >=70 Tốt · >=55 Theo dõi · >=40 Cảnh báo · <40 Nguy cấp

  /* --- Benchmark tham khảo ngoài (luôn dán nhãn "tham khảo") --- */
  benchmark: { conversionPct: 24, gmPct: 46, inventoryDays: 55, roas: 3.5, mktToRevPct: 6.0 },

  /* --- Tham số định giá (chỉ knob nội bộ, KHÔNG hiển thị multiple) --- */
  valuation: { _evToEbitdaLow: 3.05, _evToEbitdaBase: 4.0, _evToEbitdaHigh: 5.25 }
};

/* ============================================================
   ENGINE CẢNH BÁO — bộ rule. Engine tính lại mỗi lần render.
   scope: branch | company | product | channel
   Hỗ trợ điều kiện kép qua mảng `and`.
   ============================================================ */
VCPC.CONFIG_ALERT = [
  { id:'R1', metric:'planWeekPct', scope:'branch', operator:'<', threshold:75,
    severity:'red', owner:'COO', sla:24, cohortExempt:true, enabled:true,
    label:{vi:'Doanh thu tuần dưới 75% kế hoạch', en:'Weekly revenue below 75% of plan'} },

  { id:'R2', metric:'trendDown', scope:'branch', operator:'>', threshold:2,
    and:[{metric:'planYtdPct', operator:'<', threshold:90}],
    severity:'orange', owner:'COO', sla:48, cohortExempt:true, enabled:true,
    label:{vi:'Xu hướng 4 tuần giảm liên tục & dưới 90% kế hoạch', en:'4-week downtrend & below 90% of plan'} },

  { id:'R3', metric:'gmPct', scope:'branch', operator:'<', threshold:38,
    severity:'orange', owner:'CFO', sla:48, cohortExempt:false, enabled:true,
    label:{vi:'Biên lợi nhuận gộp dưới 38%', en:'Gross margin below 38%'} },

  { id:'R4', metric:'inventoryDays', scope:'product', operator:'>', threshold:75,
    and:[{metric:'sellThrough', operator:'<', threshold:50}],
    severity:'orange', owner:'Merchandising', sla:48, cohortExempt:false, enabled:true,
    label:{vi:'Tồn kho vượt 75 ngày', en:'Inventory above 75 days'} },

  { id:'R5', metric:'roas', scope:'channel', operator:'<', threshold:3.0,
    and:[{metric:'costToRevPct', operator:'>', threshold:7.5}],
    severity:'orange', owner:'Marketing', sla:48, cohortExempt:false, enabled:true,
    label:{vi:'ROAS kênh < 3.0 & chi phí/doanh thu > 7.5%', en:'Channel ROAS < 3.0 & cost/revenue > 7.5%'} },

  { id:'R6', metric:'convDrop14', scope:'company', operator:'>', threshold:0.25,
    severity:'orange', owner:'E-commerce', sla:48, cohortExempt:false, enabled:true,
    label:{vi:'Tỷ lệ chuyển đổi website giảm > 0,25 điểm trong 14 ngày', en:'Website conversion down > 0.25 pts in 14 days'} },

  { id:'R7', metric:'cashRunwayDays', scope:'company', operator:'<', threshold:45,
    severity:'red', owner:'CFO', sla:24, cohortExempt:false, enabled:true,
    label:{vi:'Số ngày tiền mặt < 45 ngày', en:'Cash runway < 45 days'} },

  { id:'R8', metric:'turnoverPct', scope:'branch', operator:'>', threshold:25,
    severity:'orange', owner:'HR', sla:72, cohortExempt:false, enabled:true,
    label:{vi:'Tỷ lệ nghỉ việc chi nhánh > 25%/năm', en:'Branch turnover > 25% p.a.'} }
];

/* Người phụ trách theo vai trò (hiển thị) */
VCPC.OWNERS = {
  COO:{vi:'Giám đốc vận hành',en:'COO'}, CFO:{vi:'Giám đốc tài chính',en:'CFO'},
  Merchandising:{vi:'Quản trị hàng hoá',en:'Merchandising'}, Marketing:{vi:'Trưởng marketing',en:'Marketing'},
  'E-commerce':{vi:'Phụ trách TMĐT',en:'E-commerce'}, HR:{vi:'Trưởng nhân sự',en:'HR'}
};
