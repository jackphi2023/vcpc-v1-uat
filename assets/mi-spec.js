/* VCPC Market Intelligence spec config
   Source of truth for MI content groups, evidence levels, alert archetypes,
   weekly role slices and trust guardrails. Keep this file deterministic and
   frontend-safe; admin pages can read it without Supabase access. */
(function(){
  const contentGroups = [
    { id:1, code:'top_sku_market', title:'Top SKU/danh mục bán chạy thị trường', roles:['BI','Sales','Merch'], sources:['Metric/Kalodata','Marketplace snapshots','Snapshot delta'], label:'RANKING_FACT_VOLUME_ESTIMATE', ai:true },
    { id:2, code:'competitor_price_promo', title:'Giá & khuyến mãi/voucher đối thủ', roles:['Sales','Merch','CEO'], sources:['Marketplace','Website','App'], label:'FACT', ai:true },
    { id:3, code:'new_store_footprint', title:'Mở cửa hàng/cơ sở mới & footprint', roles:['CEO','Ops','Sales'], sources:['Google Maps/Places','Fanpage'], label:'FACT', ai:true },
    { id:4, code:'marketing_social_spike', title:'Chiến dịch marketing & social spike', roles:['Marketing'], sources:['Fanpage','Social listening','Ads'], label:'FACT_WITH_IMPACT_HYPOTHESIS', ai:true },
    { id:5, code:'pr_funding_ma', title:'PR/báo chí, sự kiện, gọi vốn/M&A', roles:['CEO','Marketing'], sources:['Press','News portals'], label:'FACT', ai:true },
    { id:6, code:'competitor_new_product', title:'Sản phẩm/dịch vụ mới của đối thủ', roles:['CEO','Merch','Marketing'], sources:['Website','Marketplace','Fanpage'], label:'FACT', ai:true },
    { id:7, code:'input_cost_macro_policy', title:'Chi phí đầu vào & vĩ mô/chính sách', roles:['CEO','Ops'], sources:['Customs','Association','GSO','Press'], label:'FACT', ai:true },
    { id:8, code:'demand_search_trend', title:'Xu hướng cầu & từ khoá tìm kiếm', roles:['Marketing','BI'], sources:['Google Trends','Marketplace search'], label:'ESTIMATE', ai:true },
    { id:9, code:'review_sentiment', title:'Review & sentiment thương hiệu/cửa hàng', roles:['Marketing','Ops'], sources:['Maps','Marketplace','Social'], label:'REVIEW_FACT_SCORE_ESTIMATE', ai:true },
    { id:10, code:'geo_competitor_overlay', title:'Overlay bản đồ: đối thủ gần điểm bán', roles:['Ops','Sales','CEO'], sources:['Maps','Internal store data'], label:'FACT', ai:true }
  ];

  const evidenceLevels = [
    { level:1, code:'recommendation', label:'① Kiến nghị', language:'Nên làm X', actionability:'Có, cụ thể', minConfidence:75 },
    { level:2, code:'consideration', label:'② Gợi ý cân nhắc', language:'Có thể cân nhắc X, cần kiểm tra Y', actionability:'Có điều kiện', minConfidence:55 },
    { level:3, code:'monitoring', label:'③ Đang theo dõi', language:'Đang thấy tín hiệu Z, chưa đủ để hành động', actionability:'Không — gắn cờ', minConfidence:35 },
    { level:4, code:'data_gap', label:'④ Khoảng trống dữ liệu', language:'Chưa đủ dữ kiện; cần dữ liệu X', actionability:'Không — nêu cái cần', minConfidence:0 }
  ];

  const industryTiers = {
    A: { industries:['retail_online','export_agri_aqua','fnb_chain'], ceiling:'recommendation', note:'Mật độ tín hiệu số cao; có thể phát kiến nghị ① nếu qua cổng bằng chứng.' },
    B: { industries:['real_estate','spa_beauty','healthcare','education','hotel_travel'], ceiling:'consideration', note:'Chủ yếu ②/③; ① chỉ khi dữ liệu nội bộ đồng thuận và chuyên gia xác nhận.' },
    C: { industries:['manufacturing_b2b','distribution','materials','logistics'], ceiling:'monitoring', note:'Chủ yếu ③/④; nội bộ và chuyên gia là nguồn chính.' }
  };

  const alertArchetypes = [
    { code:'price_war', title:'Price war', condition:'≥3 đối thủ giảm >X% cùng nhóm trong 3 ngày', recipients:['Sales','Merch','CEO'], action:'Rà giá–voucher–tồn–biên trước khi phản ứng giá', severity:'HIGH' },
    { code:'sku_service_gap', title:'SKU/dịch vụ gap', condition:'Đối thủ tăng delta 7 ngày mạnh ở danh mục ta thiếu', recipients:['Merch','Marketing'], action:'Đề xuất capsule nhanh / nội dung thay thế', severity:'HIGH' },
    { code:'geo_competitor_nearby', title:'Geo (đối thủ gần)', condition:'Đối thủ mở cơ sở trong bán kính N km quanh điểm bán', recipients:['Ops','CEO'], action:'Theo dõi traffic/doanh thu 14 ngày', severity:'MEDIUM' },
    { code:'stockout_hot', title:'Stockout hot', condition:'Hết size/màu/sản phẩm hot ở ta hoặc đối thủ', recipients:['Merch','Ops'], action:'Ưu tiên replenishment, điều chuyển kho', severity:'MEDIUM' },
    { code:'social_spike', title:'Social spike', condition:'Tương tác/đơn tăng vọt quanh 1 SKU/đối thủ', recipients:['Marketing'], action:'Phân tích hook/creator/offer — không copy', severity:'MEDIUM' },
    { code:'review_drop', title:'Review drop', condition:'Rating < ngưỡng hoặc keyword tiêu cực tăng', recipients:['Ops','Area Manager'], action:'Xử lý trong 48h, ghi nhận nguyên nhân', severity:'HIGH' },
    { code:'cost_spike', title:'Cost spike', condition:'Giá đầu vào vượt ngưỡng cấu hình', recipients:['CEO','Procurement'], action:'Rà giá vốn / hợp đồng nguồn cung', severity:'HIGH' },
    { code:'regulatory', title:'Regulatory', condition:'Thay đổi thuế/quy định/cấp phép liên quan', recipients:['CEO','Legal'], action:'Rà tuân thủ, cập nhật quy trình', severity:'HIGH' },
    { code:'new_launch_pr', title:'New launch / PR', condition:'Đối thủ ra SP mới, lên báo, gọi vốn/M&A', recipients:['CEO','Marketing'], action:'Đánh giá tác động chiến lược', severity:'MEDIUM' }
  ];

  const mondayReport = [
    { role:'CEO', title:'CEO', contents:['3 điều chắc chắn nhất','Kiến nghị ①','Cảnh báo Cao','Động thái chiến lược đối thủ'] },
    { role:'Marketing', title:'Marketing', contents:['Chiến dịch & social spike','Từ khoá/trend','PR','Sentiment thương hiệu'] },
    { role:'Sales', title:'Sales / Commercial', contents:['Price war','Voucher','SKU bán chạy cần nhập','Đối thủ mở gần'] },
    { role:'BI_Merch_Ops', title:'BI / Merch / Ops', contents:['SKU-level table','Heatmap danh mục','Stockout','Review','Overlay bản đồ'] }
  ];

  const trustRules = [
    'Không kiến nghị từ một nguồn duy nhất; không từ một lần quét — phải có delta.',
    'Không ghi số tuyệt đối khi nguồn chỉ hiển thị khoảng; dùng khoảng + nhãn ƯỚC TÍNH.',
    'Không kiến nghị trái dữ liệu nội bộ mà không gắn cờ và hạ cấp.',
    'Tầng C không vượt bối cảnh + nội bộ nếu chưa có chuyên gia.',
    'Confidence thấp hơn ngưỡng thì hạ xuống ③/④, không ép thành ①.',
    'Mỗi kiến nghị phải có nguồn, cách kiểm chứng và điều kiện lật kết luận.',
    'Việc lớn như đổi giá toàn hệ thống/đóng cơ sở/pháp lý/M&A cần chuyên gia ký.'
  ];

  function classifyEvidence(signal){
    const s = signal || {};
    const sourceCount = Number(s.sourceCount || s.source_count || 0);
    const hasDelta = !!(s.hasDelta || s.has_delta);
    const label = String(s.label || s.evidenceLabel || '').toUpperCase();
    const confidence = Number(s.confidence || 0);
    const internalConflict = !!(s.internalConflict || s.internal_conflict);
    const expertSigned = !!(s.expertSigned || s.expert_signed);
    const tier = String(s.industryTier || s.tier || 'B').toUpperCase();

    if (internalConflict) return evidenceLevels[2];
    if (sourceCount < 1) return evidenceLevels[3];
    if (sourceCount < 2 || !hasDelta) return evidenceLevels[2];
    if (label.includes('HYPOTHESIS') && !label.includes('FACT')) return evidenceLevels[2];
    if (tier === 'C' && !expertSigned) return evidenceLevels[2];
    if (tier === 'B' && confidence < 75 && !expertSigned) return evidenceLevels[1];
    if (confidence >= 75) return evidenceLevels[0];
    if (confidence >= 55) return evidenceLevels[1];
    return evidenceLevels[2];
  }

  function buildVerificationChecklist(signal){
    const s = signal || {};
    return [
      s.sourceUrl ? 'Mở nguồn: '+s.sourceUrl : 'Bổ sung link nguồn chính',
      s.secondarySourceUrl ? 'Đối chiếu nguồn thứ hai: '+s.secondarySourceUrl : 'Bổ sung nguồn độc lập thứ hai',
      s.internalMetric ? 'Đối chiếu dữ liệu nội bộ: '+s.internalMetric : 'Đối chiếu KPI nội bộ trước khi kiến nghị',
      s.deltaWindow ? 'Kiểm tra delta: '+s.deltaWindow : 'Bổ sung snapshot nhiều mốc, không dùng một lần quét'
    ];
  }

  window.VCPC_MI_SPEC = {
    version:'1.1',
    cadence:'Daily scan → Sunday synthesis → Monday before 08:00',
    contentGroups,
    evidenceLevels,
    industryTiers,
    alertArchetypes,
    mondayReport,
    trustRules,
    classifyEvidence,
    buildVerificationChecklist
  };
})();
