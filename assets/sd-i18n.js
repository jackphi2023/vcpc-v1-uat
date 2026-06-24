/* ============================================================
   VCPC Dashboard — i18n (VI/EN) + tiêu đề động theo trang
   ============================================================ */
window.VCPC = window.VCPC || {};
VCPC.I18N = {

/* Tiêu đề + diễn giải động cho 10 trang (MỤC 15) */
pages: {
  overview:   { icon:'grid', vi:['Tổng quan điều hành','Sức khỏe vận hành tuần này — doanh thu, lợi nhuận, chi nhánh và cảnh báo ưu tiên trên một màn hình.'],
                en:['Executive overview',"This week's operating health — revenue, profit, branches and priority alerts on one screen."] },
  strategy:   { icon:'target', vi:['Chiến lược','Khung lựa chọn các quyết định tăng trưởng 6–12 tháng theo Báo cáo Chiến lược đã nghiệm thu.'],
                en:['Strategy','The 6–12 month growth decision framework, per the approved Strategy Report.'] },
  finance:    { icon:'trend', vi:['Tài chính','P&L, biên lợi nhuận, dòng tiền và thời gian duy trì dòng tiền — sức khỏe tài chính và điểm cần bảo vệ khi mở rộng.'],
                en:['Finance','P&L, margins, cashflow and cash runway — financial health and what to protect while expanding.'] },
  branches:   { icon:'store', vi:['Chi nhánh','Sức khỏe từng cửa hàng theo điểm tổng hợp, xu hướng tuần và mức đạt kế hoạch — nơi rò rỉ lợi nhuận theo chi nhánh.'],
                en:['Branches','Per-store health by composite score, weekly trend and plan achievement — where profit leaks by branch.'] },
  online:     { icon:'cart', vi:['Online & CRM','Phễu từ nguồn truy cập đến đơn hàng và khách đến cửa hàng; hiệu quả kênh và giữ chân khách.'],
                en:['Online & CRM','Funnel from traffic to orders and store visits; channel efficiency and retention.'] },
  product:    { icon:'box', vi:['Sản phẩm & tồn kho','Vòng quay, biên lợi nhuận và tuổi tồn theo nhóm hàng — danh mục cần cắt, xả hàng hay điều chuyển.'],
                en:['Product & inventory','Turns, margin and inventory age by category — what to cut, mark down or transfer.'] },
  people:     { icon:'users', vi:['Marketing & nhân sự','ROAS theo kênh, năng suất nhân sự và biến động nhân sự — hiệu quả chi tiêu và vận hành con người.'],
                en:['Marketing & people','ROAS by channel, staff productivity and turnover — spend efficiency and people operations.'] },
  alerts:     { icon:'alert', vi:['Trung tâm cảnh báo','Mọi cảnh báo cần hành động — ngưỡng, người phụ trách, thời gian xử lý và trạng thái xử lý.'],
                en:['Alert center','Every alert that needs action — thresholds, owners, SLA and resolution status.'] },
  recommend:  { icon:'check', vi:['Kiến nghị & Lộ trình','Hành động ưu tiên gắn tác động VNĐ, người phụ trách và lộ trình 6–12 tháng theo Báo cáo Chiến lược đã nghiệm thu. Cho phép cập nhật hàng tháng.'],
                en:['Recommendations & roadmap','Priority actions with VND impact, owners and a 6–12 month roadmap per the approved Strategy Report. Updatable monthly.'] },
  valuation:  { icon:'gauge', vi:['Điểm Gọi Vốn & Định giá','Hai chỉ số nhà đầu tư quan tâm — mức độ sẵn sàng gọi vốn và khoảng định giá — suy ra từ dữ liệu vận hành.'],
                en:['Capital Readiness Score & Valuation Range','Two investor-facing indices — capital readiness and valuation range — derived from operating data.'] }
},
nav: {
  overview:{vi:'Tổng quan',en:'Overview'}, strategy:{vi:'Chiến lược',en:'Strategy'}, finance:{vi:'Tài chính',en:'Finance'},
  branches:{vi:'Chi nhánh',en:'Branches'}, online:{vi:'Online & CRM',en:'Online & CRM'}, product:{vi:'Sản phẩm & tồn kho',en:'Product & inventory'},
  people:{vi:'Marketing & nhân sự',en:'Marketing & people'}, alerts:{vi:'Cảnh báo',en:'Alerts'}, recommend:{vi:'Kiến nghị',en:'Recommendations'},
  valuation:{vi:'Điểm và Định Giá',en:'Score & Valuation'}
},

t: {
  brandSub:{vi:'Operations Strategy Dashboard',en:'Operations Strategy Dashboard'},
  serviceTag:{vi:'Strategy & Execution Advisory',en:'Strategy & Execution Advisory'},
  navTitle:{vi:'Khu vực điều hành',en:'Management areas'},
  unitPill:{vi:'Doanh nghiệp: Chuỗi thời trang đã ẩn danh · 40 chi nhánh',en:'Company: anonymised fashion chain · 40 branches'},
  periodPill:{vi:'Kỳ dữ liệu: 01/01 → 10/06/2026 · theo tuần',en:'Data: 01/01 → 10/06/2026 · weekly'},
  refreshPill:{vi:'Cập nhật hằng tuần · Google Drive / POS',en:'Weekly refresh · Google Drive / POS'},
  liveBtn:{vi:'Làm mới',en:'Refresh'}, simBadge:{vi:'Dữ liệu mô phỏng',en:'Simulated data'},
  bannerToggle:{vi:'Về dữ liệu',en:'About the data'},
  banner:{vi:'Dữ liệu trong dashboard thuộc một chuỗi thời trang đã đồng ý chia sẻ với VCPC. Số lượng chi nhánh và một số chỉ số tài chính, marketing trọng yếu đã được thay đổi để bảo mật cho doanh nghiệp, nhưng vẫn đủ để minh hoạ một dashboard Quản trị Chiến lược do VCPC xây dựng.',
    en:'The data shown belongs to a fashion chain that agreed to share it with VCPC. The number of branches and several key financial and marketing figures have been altered to protect the business, while still being sufficient to demonstrate a Strategy Management dashboard built by VCPC.'},
  wow:{vi:'so tuần trước',en:'WoW'}, vsPlan:{vi:'so kế hoạch',en:'vs plan'}, vsBench:{vi:'so benchmark',en:'vs benchmark'},
  ytd:{vi:'luỹ kế',en:'YTD'}, thisWeek:{vi:'Tuần này',en:'This week'}, ref:{vi:'tham khảo',en:'ref.'},

  /* Overview */
  kRevWeek:{vi:'Doanh thu tuần',en:'Weekly revenue'}, kPlanWeek:{vi:'Đạt kế hoạch tuần',en:'Weekly plan achieved'},
  kEbitda:{vi:'Biên EBITDA',en:'EBITDA margin'}, kRunway:{vi:'Số ngày tiền mặt',en:'Cash runway'},
  kBranchPlan:{vi:'% chi nhánh đạt KH',en:'% branches on plan'}, kRoas:{vi:'ROAS bình quân',en:'Blended ROAS'},
  revVsPlanTitle:{vi:'Doanh thu theo tháng vs kế hoạch vs online',en:'Monthly revenue vs plan vs online'},
  revVsPlanSub:{vi:'Đơn vị: tỷ đồng. Tháng 6 luỹ kế đến 10/06.',en:'Unit: VND billion. June cumulative to 10 Jun.'},
  execAlerts:{vi:'Cảnh báo điều hành ưu tiên',en:'Priority executive alerts'},
  needAttention:{vi:'Cần chú ý tuần này',en:'Needs attention this week'},
  needAttentionSub:{vi:'Chi nhánh tụt hạng mạnh nhất theo tuần (WoW).',en:'Biggest weekly drops (WoW).'},
  regionMix:{vi:'Cơ cấu doanh thu theo miền',en:'Revenue mix by region'},
  actual:{vi:'Thực tế',en:'Actual'}, plan:{vi:'Kế hoạch',en:'Plan'}, online:{vi:'Online',en:'Online'},
  clickToDrill:{vi:'Bấm để xem chi nhánh liên quan →',en:'Click to view related branch →'},

  /* Branches */
  filterRegion:{vi:'Tất cả miền',en:'All regions'}, filterStatus:{vi:'Tất cả trạng thái',en:'All status'},
  filterFormat:{vi:'Mọi format',en:'All formats'}, filterCohort:{vi:'Mọi tuổi store',en:'All store ages'},
  rankBy:{vi:'Xếp hạng theo',en:'Rank by'}, heatTitle:{vi:'Bản đồ nhiệt 40 chi nhánh',en:'40-branch heatmap'},
  heatSub:{vi:'Theo điểm sức khỏe (suy ra). Bấm 1 ô để mở chi tiết.',en:'By composite health (derived). Click a cell for details.'},
  branchTableTitle:{vi:'Bảng 40 chi nhánh — sắp xếp mọi cột',en:'40 branches — sort any column'},
  colBranch:{vi:'Chi nhánh',en:'Branch'}, colRegion:{vi:'Miền/Format',en:'Region/Format'}, colYtd:{vi:'DT luỹ kế',en:'YTD rev'},
  colPlan:{vi:'Đạt KH',en:'Plan %'}, colWow:{vi:'WoW',en:'WoW'}, colTrend:{vi:'8 tuần',en:'8 weeks'}, colGm:{vi:'Biên gộp',en:'Margin'},
  colInv:{vi:'Tồn (ngày)',en:'Inv days'}, colConv:{vi:'Ch.đổi',en:'Conv'}, colPickup:{vi:'Nhận tại CH',en:'Pickup'},
  colM2:{vi:'DT/m²',en:'Rev/m²'}, colHealth:{vi:'Điểm SK',en:'Health'}, colStatus:{vi:'Trạng thái',en:'Status'}, colOwner:{vi:'Phụ trách',en:'Owner'},
  bpDetail:{vi:'Chi tiết chi nhánh',en:'Branch detail'}, bpWeak:{vi:'3 chỉ số yếu nhất',en:'3 weakest metrics'},
  bpAlerts:{vi:'Cảnh báo đang mở',en:'Open alerts'}, bpAction:{vi:'Gợi ý hành động',en:'Suggested action'},
  bpWeekly:{vi:'Doanh thu 8 tuần (tỷ)',en:'8-week revenue (B)'}, bpClose:{vi:'Đóng',en:'Close'}, bpNoAlert:{vi:'Không có cảnh báo đang mở.',en:'No open alerts.'},

  /* Finance */
  plTitle:{vi:'Cấu trúc lãi lỗ luỹ kế (waterfall)',en:'P&L waterfall (YTD)'},
  plSub:{vi:'Đơn vị: tỷ đồng. Doanh thu → giá vốn → lãi gộp → chi phí vận hành → EBITDA.',en:'Unit: VND billion. Revenue → COGS → gross profit → OPEX → EBITDA.'},
  financeTable:{vi:'Lãi lỗ theo tháng',en:'Monthly P&L'}, marginTrend:{vi:'Xu hướng biên lợi nhuận',en:'Margin trend'},
  marginSub:{vi:'Biên gộp, chi phí vận hành/doanh thu và biên EBITDA.',en:'Gross margin, OPEX/revenue and EBITDA margin.'},
  cashTitle:{vi:'Dòng tiền & độ nhạy',en:'Cash & sensitivity'},
  fcMonth:{vi:'Tháng',en:'Month'}, fcRev:{vi:'Doanh thu',en:'Revenue'}, fcCogs:{vi:'Giá vốn',en:'COGS'}, fcGp:{vi:'Lãi gộp',en:'Gross profit'},
  fcOpex:{vi:'Chi phí VH',en:'OPEX'}, fcEbitda:{vi:'EBITDA',en:'EBITDA'}, fcMargin:{vi:'Biên EBITDA',en:'EBITDA %'},

  /* Strategy */
  cascadeTitle:{vi:'Khung lựa chọn chiến lược (Choice Cascade)',en:'Strategy Choice Cascade'},
  questionsTitle:{vi:'Câu hỏi chiến lược & cách đo',en:'Strategic questions & how to measure'},
  profitPoolTitle:{vi:'Lợi nhuận theo nhóm hàng',en:'Profit by category'},
  profitPoolSub:{vi:'Doanh thu × biên gộp ≈ đóng góp lợi nhuận tương đối.',en:'Revenue × gross margin ≈ relative profit contribution.'},
  unitEconTitle:{vi:'Unit economics điểm mở rộng tiềm năng',en:'Unit economics of potential new sites'},
  unitEconSub:{vi:'Mô phỏng — gắn quyết định mở chi nhánh với số, không cảm tính.',en:'Simulated — tie expansion decisions to numbers, not intuition.'},
  ueSite:{vi:'Địa điểm',en:'Site'}, uePayback:{vi:'Hoàn vốn (tháng)',en:'Payback (mo)'}, ueRent:{vi:'Thuê/DT',en:'Rent/sales'}, ueBreak:{vi:'Hoà vốn (tỷ/tháng)',en:'Break-even (B/mo)'}, ueVerdict:{vi:'Đánh giá',en:'Verdict'},

  /* Online */
  funnelTitle:{vi:'Phễu từ truy cập đến đơn & khách đến cửa hàng',en:'Traffic-to-order funnel & store visits'},
  o2sTitle:{vi:'Đóng vòng Online → Cửa hàng',en:'Online → Store loop'},
  channelTitle:{vi:'Doanh thu, chi phí & ROAS theo kênh',en:'Revenue, cost & ROAS by channel'},
  crmTitle:{vi:'Chỉ số khách hàng',en:'Customer metrics'},
  mRev:{vi:'Doanh thu',en:'Revenue'}, mCost:{vi:'Chi phí',en:'Cost'},
  convWeb:{vi:'Tỷ lệ chuyển đổi website',en:'Website conversion'}, cac:{vi:'Chi phí có khách mới',en:'Acquisition cost'},
  repeat:{vi:'Tỷ lệ mua lại',en:'Repeat rate'}, o2s:{vi:'Khách online đến cửa hàng',en:'Online-to-store visits'},

  /* Product */
  catRevTitle:{vi:'Doanh thu & biên theo nhóm hàng',en:'Revenue & margin by category'},
  invTitle:{vi:'Tồn kho theo nhóm (vs ngưỡng an toàn)',en:'Inventory by category (vs safety)'},
  prodTableTitle:{vi:'Bảng nhóm hàng — đánh dấu tự động',en:'Category table — auto-flagged'},
  merchTitle:{vi:'Ưu tiên merchandising (sinh từ dữ liệu)',en:'Merchandising priorities (data-driven)'},
  pCat:{vi:'Nhóm hàng',en:'Category'}, pRev:{vi:'Doanh thu',en:'Revenue'}, pGm:{vi:'Biên gộp',en:'Margin'},
  pSell:{vi:'Bán hết 60N',en:'60d sell-through'}, pInv:{vi:'Tồn (ngày)',en:'Inv days'}, pGmroi:{vi:'GMROI',en:'GMROI'}, pAction:{vi:'Hành động',en:'Action'},

  /* People */
  roasTitle:{vi:'ROAS & chi phí marketing theo kênh',en:'ROAS & marketing cost by channel'},
  prodTitle:{vi:'Năng suất nhân sự theo miền',en:'Staff productivity by region'},
  prodSub:{vi:'Doanh thu/nhân sự/tháng (triệu) và tỷ lệ nghỉ việc.',en:'Revenue/staff/month (M) and turnover.'},
  cadenceTitle:{vi:'Nhịp vận hành hằng tuần',en:'Weekly operating cadence'},

  /* Alerts */
  aRed:{vi:'Cảnh báo đỏ',en:'Red alerts'}, aOrange:{vi:'Cảnh báo cam',en:'Orange alerts'},
  aClosed:{vi:'Đã đóng',en:'Closed'}, aOverdue:{vi:'Quá hạn',en:'Overdue'},
  alertListTitle:{vi:'Danh sách cảnh báo (gom nhóm theo rule)',en:'Alerts (grouped by rule)'},
  configTitle:{vi:'Cấu hình ngưỡng (CONFIG_ALERT)',en:'Threshold config (CONFIG_ALERT)'},
  configNote:{vi:'Hệ thống tính toán các cảnh báo theo các cấu hình mà doanh nghiệp yêu cầu.',en:'The system computes alerts according to the configurations the business requests.'},
  expand:{vi:'chi nhánh',en:'branches'}, value:{vi:'Giá trị thực',en:'Actual'}, slaLeft:{vi:'SLA còn',en:'SLA left'},
  lifeNew:{vi:'Mới',en:'New'}, lifeAck:{vi:'Đã tiếp nhận',en:'Acknowledged'}, lifeProgress:{vi:'Đang xử lý',en:'In progress'},
  lifeClosed:{vi:'Đã đóng',en:'Closed'}, lifeOverdue:{vi:'Quá hạn',en:'Overdue'}, cause:{vi:'Nguyên nhân',en:'Cause'},
  cfgMetric:{vi:'Chỉ số',en:'Metric'}, cfgScope:{vi:'Phạm vi',en:'Scope'}, cfgRule:{vi:'Ngưỡng',en:'Threshold'}, cfgSev:{vi:'Mức',en:'Severity'}, cfgOwner:{vi:'Phụ trách',en:'Owner'}, cfgSla:{vi:'SLA',en:'SLA'},

  /* Recommendations */
  recListTitle:{vi:'Kiến nghị ưu tiên (tương ứng với Báo cáo Chiến lược đã nghiệm thu ban đầu)',en:'Priority recommendations (aligned to the approved initial Strategy Report)'},
  valueTrackTitle:{vi:'Theo dõi giá trị tài chính',en:'Financial value tracking'},
  roadmapTitle:{vi:'Lộ trình 6–12 tháng',en:'6–12 month roadmap'},
  impact:{vi:'Tác động ước tính',en:'Est. impact'}, feasibility:{vi:'Khả thi',en:'Feasibility'},
  stProposeL:{vi:'Đề xuất',en:'Propose'}, stProgressL:{vi:'Đang làm',en:'In progress'}, stDoneL:{vi:'Xong',en:'Done'},
  totalImpact:{vi:'Tổng tác động ước tính',en:'Total estimated impact'}, perYear:{vi:'tỷ/năm (ước tính)',en:'B/year (est.)'},
  fHigh:{vi:'Cao',en:'High'}, fMedium:{vi:'Trung bình',en:'Medium'}, fLow:{vi:'Thấp',en:'Low'},

  /* Valuation page */
  vIntro:{vi:'Trang này minh hoạ cách VCPC chuyển dữ liệu vận hành ở trên thành hai chỉ số mà nhà đầu tư và ngân hàng quan tâm. Đây là ước tính rút gọn để hình dung; phân tích đầy đủ, có chuyên gia ký duyệt, nằm trong gói Capital & M&A Advisory.',
    en:'This page illustrates how VCPC turns the operating data above into two indices that investors and banks care about. It is a condensed estimate for orientation; the full, expert-signed analysis sits within the Capital & M&A Advisory service.'},
  crsTitle:{vi:'Điểm sẵn sàng gọi vốn (Capital Readiness Score)',en:'Capital Readiness Score'},
  crsDesc:{vi:'Điểm này đo mức độ sẵn sàng để gọi vốn, vay hoặc bán — điểm càng cao, doanh nghiệp càng dễ vào bàn đàm phán với định giá tốt và ít chiết khấu rủi ro.',
    en:'This score measures readiness to raise, borrow or sell — the higher it is, the easier it is to negotiate at a strong valuation with fewer risk discounts.'},
  crsInputs:{vi:'Tính dựa trên các nguồn đầu vào',en:'Computed from these input sources'},
  liftTitle:{vi:'3 điểm nâng hạng',en:'3 ways to level up'}, liftNote:{vi:'Lộ trình chi tiết nằm trong Báo cáo Chiến lược đã nghiệm thu.',en:'The detailed roadmap sits within the approved Strategy Report.'},
  valTitle:{vi:'Khoảng định giá (Valuation Range)',en:'Valuation Range'}, valUnit:{vi:'Tỷ VNĐ',en:'VND billion'},
  valRangeNote:{vi:'Khoảng tham khảo — không phải một con số tuyệt đối.',en:'Reference range — not a single absolute figure.'},
  valDesc:{vi:'Định giá là một khoảng (không phải một số) vì phụ thuộc chất lượng dữ liệu, độ đầy đủ hồ sơ và điều kiện thị trường. Khoảng này sẽ thu hẹp khi dữ liệu/hồ sơ tốt hơn và sau khi chuyên gia ký duyệt.',
    en:'Valuation is a range (not a point) because it depends on data quality, document completeness and market conditions. The range narrows as data/documents improve and after expert sign-off.'},
  valInputs:{vi:'Tính dựa trên các nguồn đầu vào',en:'Computed from these input sources'},
  adjTitle:{vi:'Các yếu tố điều chỉnh được cân nhắc',en:'Adjustment factors considered'},
  pending:{vi:'Chờ chuyên gia VCPC ký duyệt',en:'Pending VCPC expert sign-off'}, estimate:{vi:'ƯỚC TÍNH',en:'ESTIMATE'},
  bridgeTitle:{vi:'Bản đầy đủ trong gói Capital & M&A Advisory',en:'The full version in Capital & M&A Advisory'},
  bridgeLead:{vi:'Đây là minh hoạ rút gọn. Bản đầy đủ bổ sung — tất cả qua chuyên gia ký duyệt:',en:'This is a condensed illustration. The full version adds — all expert-signed:'},
  bridgeCta:{vi:'Tìm hiểu Capital & M&A Advisory',en:'Explore Capital & M&A Advisory'},
  valDisclaimer:{vi:'Các chỉ số trên là ƯỚC TÍNH minh hoạ dựa trên dữ liệu demo đã được điều chỉnh để bảo mật; không phải báo cáo định giá chính thức, không phải lời khuyên đầu tư, không cam kết kết quả. Định giá chính thức chỉ có hiệu lực sau khi chuyên gia VCPC ký duyệt.',
    en:'The indices above are illustrative ESTIMATES based on demo data altered for confidentiality; not an official valuation report, not investment advice, no guaranteed outcome. An official valuation is valid only after VCPC expert sign-off.'},
  footerNote:{vi:'Dữ liệu mô phỏng có chủ đích — logic thật, số liệu giả lập. Cập nhật hằng tuần qua Google Drive / POS / tệp do doanh nghiệp cung cấp. Phát triển bởi Viet Capital Partners & Consulting — vietcapitalpartners.com.',
    en:'Intentionally simulated data — real logic, simulated figures. Weekly refresh via Google Drive / POS / files provided by the company. Developed by Viet Capital Partners & Consulting — vietcapitalpartners.com.'}
},

/* danh sách chip / nội dung tĩnh dùng chung */
lists: {
  crsInputs: [
    {vi:'Sức khỏe tài chính: biên lợi nhuận, EBITDA, dòng tiền, cash runway, đòn bẩy',en:'Financial health: margins, EBITDA, cashflow, runway, leverage'},
    {vi:'Chất lượng & độ tin cậy báo cáo tài chính (quản trị / soát xét / kiểm toán)',en:'Quality & reliability of financial reporting (managed / reviewed / audited)'},
    {vi:'Hiệu quả vận hành đa chi nhánh & mức độ đồng đều giữa các cửa hàng',en:'Multi-branch operating efficiency & evenness across stores'},
    {vi:'Độ sẵn sàng mở rộng (unit economics, P&L chi nhánh chuẩn hoá)',en:'Expansion readiness (unit economics, standardised branch P&L)'},
    {vi:'Câu chuyện tăng trưởng & vị thế thị trường (tăng trưởng, cơ cấu kênh, online)',en:'Growth story & market position (growth, channel mix, online)'},
    {vi:'Độ rõ ràng của cấu trúc vốn & cap table',en:'Clarity of capital structure & cap table'},
    {vi:'Độ đầy đủ của bộ hồ sơ (data room)',en:'Completeness of the data room'},
    {vi:'Khoảng cách kỳ vọng định giá của chủ DN so với thị trường',en:'Gap between owner valuation expectation and market'},
    {vi:'Chất lượng & độ đầy đủ dữ liệu đầu vào',en:'Quality & completeness of input data'}
  ],
  valInputs: [
    {vi:'Kết quả tài chính: doanh thu, EBITDA, biên lợi nhuận, tăng trưởng, dòng tiền tự do, nợ ròng',en:'Financials: revenue, EBITDA, margins, growth, free cash flow, net debt'},
    {vi:'Thư viện benchmark theo ngành bán lẻ thời trang (so sánh giao dịch & bội số ngành — có version)',en:'Fashion-retail benchmark library (transaction comps & sector multiples — versioned)'},
    {vi:'Chất lượng báo cáo tài chính & chất lượng dữ liệu',en:'Financial-reporting quality & data quality'},
    {vi:'Mục tiêu giao dịch (gọi vốn / vay / bán) & cấu trúc vốn hiện tại',en:'Transaction objective (raise / borrow / sell) & current capital structure'}
  ],
  adjFactors: [
    {vi:'Tính thanh khoản thấp của doanh nghiệp tư nhân',en:'Private-company illiquidity'},
    {vi:'Quy mô doanh nghiệp',en:'Company size'},
    {vi:'Mức độ tập trung khách hàng / nhà cung cấp',en:'Customer / supplier concentration'},
    {vi:'Phụ thuộc người chủ chốt',en:'Key-person dependence'},
    {vi:'Premium kiểm soát (nếu bán cổ phần chi phối)',en:'Control premium (if selling a controlling stake)'}
  ],
  liftDict: {
    even:{vi:'Chuẩn hoá P&L & thu hẹp khoảng cách hiệu suất giữa các chi nhánh',en:'Standardise P&L & narrow performance gaps across branches'},
    data:{vi:'Bổ sung báo cáo soát xét và hoàn thiện bộ hồ sơ data room',en:'Add reviewed financials and complete the data room'},
    cash:{vi:'Cải thiện cash runway & kiểm soát vốn lưu động theo tồn kho',en:'Improve cash runway & control working capital via inventory'},
    expand:{vi:'Chuẩn hoá unit economics điểm mở rộng trước khi gọi vốn',en:'Standardise new-site unit economics before raising'},
    fin:{vi:'Nâng biên EBITDA qua cơ cấu hàng & kiểm soát chi phí',en:'Lift EBITDA margin via SKU mix & cost control'}
  },
  bridgeCards: [
    {vi:'Khuyến nghị cấu trúc giao dịch',en:'Deal-structure recommendation'},
    {vi:'Danh mục hồ sơ data room còn thiếu',en:'Missing data-room checklist'},
    {vi:'Kết nối nhà đầu tư phù hợp',en:'Matching investor introductions'}
  ],
  tiers: {
    notready:{vi:'Chưa sẵn sàng',en:'Not Ready'}, developing:{vi:'Đang phát triển',en:'Developing'},
    nearready:{vi:'Gần sẵn sàng',en:'Near-Ready'}, investorready:{vi:'Sẵn sàng gọi vốn',en:'Investor-Ready'}, premium:{vi:'Hạng cao cấp',en:'Premium'}
  },
  tierMeaning: {
    nearready:{vi:'Gần sẵn sàng: nền tảng tốt, cần củng cố vài hồ sơ & chỉ số trước khi gọi vốn.',en:'Near-Ready: solid foundation; a few documents & metrics to firm up before raising.'},
    developing:{vi:'Developing: cần cải thiện sức khỏe tài chính & độ đồng đều trước khi ra thị trường.',en:'Developing: improve financial health & evenness before going to market.'},
    investorready:{vi:'Investor-Ready: hồ sơ & chỉ số đủ mạnh để vào bàn đàm phán.',en:'Investor-Ready: documents & metrics strong enough to negotiate.'}
  },
  cascade: [
    {k:'wtp',vi:['Chọn sân chơi (Where to play)',['Thời trang nam & casual giá trị tốt','Khách lõi 18–35 tuổi','Tỉnh/thành mật độ khách trẻ + cụm TP lớn']],en:['Where to play',['Value menswear & casual','18–35 core customer','Young-density cities + major metros']]},
    {k:'htw',vi:['Cách giành thắng lợi (How to win)',['Sản phẩm bền, dễ mặc, giá hợp lý','Kéo khách online về cửa hàng & chăm khách cũ','Chuẩn hoá P&L chi nhánh trước khi mở rộng']],en:['How to win',['Durable, easy, affordable products','Online-to-store + repeat-customer care','Standardise branch P&L before expansion']]},
    {k:'cap',vi:['Năng lực cần có (Capabilities)',['Quản trị hàng hoá theo dữ liệu','Phân tích size, dáng & tồn kho','Bảng điểm quản lý cửa hàng']],en:['Capabilities',['Data-driven merchandising','Size/fit & inventory analytics','Store-manager scorecards']]},
    {k:'eco',vi:['Bài toán kinh tế (Economic logic)',['Tăng biên gộp qua cơ cấu hàng','Giảm chi phí có khách mới nhờ mua lại & giới thiệu','Kiểm soát chi phí khi mở chi nhánh mới']],en:['Economic logic',['Lift gross margin via SKU mix','Cut acquisition cost via repeat & referral','Control cost when opening new branches']]}
  ],
  questions: [
    {vi:['Mở rộng ở đâu để không làm loãng biên EBITDA?','Thang điểm 100 cho địa điểm: lượt khách, giá thuê, dân số trẻ, đối thủ, nhu cầu online.'],en:['Where to expand without diluting EBITDA?','100-point site score: traffic, rent, young population, competitors, online demand.']},
    {vi:['Online là kênh bán hay kênh tạo khách đến cửa hàng?','Đo toàn phễu: truy cập → giỏ → đơn → nhận tại cửa hàng → mua lại.'],en:['Is online a sales channel or a store-demand engine?','Measure the full funnel: traffic → cart → order → pickup → repeat.']},
    {vi:['Cắt danh mục nào để tăng vòng quay vốn?','Xác định hàng chậm theo tồn, biên, lượt xem online & tỷ lệ đổi trả.'],en:['Which categories to cut to lift capital turns?','Find slow SKUs by inventory, margin, online views & returns.']},
    {vi:['Cơ chế thưởng nào tăng tỷ lệ chốt đơn tại cửa hàng?','Kết hợp doanh thu, tỷ lệ chuyển đổi, giá trị đơn, kiểm soát tồn & trải nghiệm.'],en:['Which incentive lifts in-store conversion?','Combine revenue, conversion, order value, inventory & experience.']}
  ],
  unitEcon: [
    ['Thủ Đức · Vincom','Đà Nẵng · Helio','Bắc Ninh · TT','Cần Thơ · GoMall'],
    [14,18,22,16],[11,13,16,12],[1.6,1.9,2.3,1.7],['go','go','watch','go']
  ],
  cadence: [
    {vi:['Thứ Hai','Doanh thu tuần, lượt truy cập, tỷ lệ chuyển đổi, chi nhánh đỏ/cam.'],en:['Monday','Weekly revenue, traffic, conversion, red/orange branches.']},
    {vi:['Thứ Tư','Tồn kho, điều chuyển hàng, hàng bán chạy / sắp hết.'],en:['Wednesday','Inventory, transfers, fast-moving / stockout SKUs.']},
    {vi:['Thứ Sáu','Chi phí marketing, chăm sóc khách, kế hoạch cuối tuần, lịch nhân sự.'],en:['Friday','Marketing spend, CRM, weekend plan, staffing.']},
    {vi:['Cuối tháng','Lãi lỗ chi nhánh, lương thưởng, ngân sách, kế hoạch nhập hàng.'],en:['Month-end','Branch P&L, incentives, budget, purchasing plan.']}
  ],
  roadmap: [
    {vi:['Tháng 1','Chẩn đoán: thu thập dữ liệu, lập bản đồ chỉ tiêu, ra mắt Dashboard bản 1.'],en:['Month 1','Diagnostic: collect data, map KPIs, launch Dashboard v1.']},
    {vi:['Tháng 2','Chuẩn hoá P&L chi nhánh, thiết lập cảnh báo đầu tiên.'],en:['Month 2','Standardise branch P&L, set first alerts.']},
    {vi:['Tháng 3','Thí điểm 10 chi nhánh & online, họp tuần, hiệu chỉnh ngưỡng.'],en:['Month 3','Pilot 10 branches & online, weekly review, tune thresholds.']},
    {vi:['Tháng 4–6','Mở rộng 40 chi nhánh, kết nối Google Sheets / POS, bảng điểm.'],en:['Month 4–6','Scale to 40 branches, connect Google Sheets / POS, scorecards.']},
    {vi:['Tháng 7–12','Tối ưu khách hàng, tồn kho, mở rộng & rà soát giá trị hằng tháng.'],en:['Month 7–12','Optimise CRM, inventory, expansion & monthly value review.']}
  ]
}
};
