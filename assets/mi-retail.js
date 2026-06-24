/* VCPC Auto — Market Intelligence seed for retail apparel chain (sector tier A).
   Source discipline per MI Spec v1.0: every item carries source + date + label + confidence + verify. */
(function(){
  window.VCPC_MI = {
    meta: {
      sector_vi: 'Bán lẻ thời trang', sector_en: 'Apparel retail',
      tier: 'A',
      week_vi: 'Tuần 24 · 09–15/06/2026', week_en: 'Week 24 · Jun 9–15, 2026',
      published_vi: 'Phát 08:00 Thứ Hai · 16/06/2026', published_en: 'Published Mon 08:00 · Jun 16, 2026',
      cadence_vi: 'Quét hằng ngày → tổng hợp Chủ nhật → phát trước 8h sáng Thứ Hai',
      cadence_en: 'Daily scan → Sunday roll-up → published before Mon 8am',
      accuracy_hit: 78, accuracy_last_vi: '4/5 kiến nghị tuần trước đúng', accuracy_last_en: '4/5 of last week recommendations correct'
    },
    // 30-second summary — "3 điều chắc chắn nhất"
    summary: [
      { vi: '3 đối thủ lớn cùng giảm >25% nhóm áo khoác trong 3 ngày — dấu hiệu price war đầu mùa.', en: '3 major competitors cut jackets >25% within 3 days — early-season price war signal.', label:'FACT', conf:'high' },
      { vi: 'Cầu nhóm "áo khoác nỉ / oversized" tăng mạnh trên tìm kiếm & social — cơ hội capsule nhanh.', en: 'Demand for "fleece / oversized jackets" rising on search & social — fast-capsule opportunity.', label:'ESTIMATE', conf:'med' },
      { vi: 'Đối thủ A mở flagship cách CN Cầu Giấy 1,8km — cần theo dõi traffic 14 ngày.', en: 'Competitor A opened a flagship 1.8km from the Cau Giay branch — monitor traffic for 14 days.', label:'FACT', conf:'high' }
    ],
    // Role slices
    slices: {
      ceo: [
        { tier:1, arch:'price_war', label:'FACT', conf:'high',
          title_vi:'Price war nhóm áo khoác — rà giá & biên trước khi phản ứng', title_en:'Jacket price war — review price & margin before reacting',
          body_vi:'≥3 đối thủ (A, B, D) giảm 25–32% nhóm áo khoác trên Shopee/website trong 3 ngày. Khuyến nghị: rà giá–voucher–tồn–biên gộp trước, KHÔNG giảm giá phản xạ; ưu tiên giữ giá dòng bán chạy còn biên tốt.',
          body_en:'≥3 competitors (A, B, D) cut jackets 25–32% on Shopee/web within 3 days. Recommend reviewing price–voucher–stock–gross margin first, do NOT reflex-discount; hold price on healthy-margin best-sellers.',
          sources:['Shopee snapshot','Website đối thủ A/B/D'], date:'15/06', delta_vi:'3 ngày · 3 nguồn độc lập', delta_en:'3 days · 3 independent sources',
          verify_vi:'Mở link giá Shopee A/B/D đính kèm + đối chiếu biên gộp nội bộ nhóm Áo khoác (41%).', verify_en:'Open attached Shopee price links A/B/D + cross-check internal jacket gross margin (41%).',
          owner:'CEO · Sales', impact_vi:'Bảo vệ biên ~1,2–2,0 tỷ/quý', impact_en:'Protect ~1.2–2.0B/qtr margin' },
        { tier:2, arch:'new_launch', label:'FACT', conf:'med',
          title_vi:'Đối thủ A gọi vốn vòng mới & kế hoạch 2 flagship Q3', title_en:'Competitor A raised a new round & plans 2 Q3 flagships',
          body_vi:'Báo chí đưa tin đối thủ A gọi vốn và dự kiến mở 2 flagship miền Bắc Q3. Có thể cân nhắc: đẩy nhanh nâng cấp 1–2 cửa hàng trọng điểm trước mùa thu-đông; cần kiểm tra vị trí cụ thể của họ.',
          body_en:'Press reports competitor A raised funding and plans 2 northern flagships in Q3. Consider accelerating upgrades to 1–2 key stores before autumn-winter; verify their exact locations.',
          sources:['CafeBiz','Fanpage A'], date:'12/06', delta_vi:'2 nguồn · còn ẩn số vị trí', delta_en:'2 sources · location unknown',
          verify_vi:'Theo dõi tin tuyển dụng & giấy phép xây dựng quanh khu vực dự kiến.', verify_en:'Watch hiring posts & construction permits near the expected area.',
          owner:'CEO', impact_vi:'Chiến lược — định vị khu vực', impact_en:'Strategic — area positioning' }
      ],
      marketing: [
        { tier:1, arch:'social_spike', label:'FACT', conf:'high',
          title_vi:'Social spike: creator "áo khoác oversized" tăng 3x tương tác', title_en:'Social spike: "oversized jacket" creator up 3x engagement',
          body_vi:'Một số video TikTok về áo khoác dáng oversized của đối thủ B tăng vọt tương tác (đơn ước tính tăng theo). Học hook/offer/creator — KHÔNG copy. Đề xuất: làm 2–3 video cùng góc nhìn với dòng oversized của ta trong tuần.',
          body_en:'Several TikTok videos on competitor B oversized jackets spiked in engagement (orders estimated up). Learn the hook/offer/creator — do NOT copy. Produce 2–3 videos on our oversized line this week.',
          sources:['TikTok','Social listening'], date:'14/06', delta_vi:'7 ngày · tương tác FACT, đơn ƯỚC TÍNH', delta_en:'7 days · engagement FACT, orders ESTIMATE',
          verify_vi:'Mở 3 video đính kèm + so lượt xem/lượt lưu theo ngày.', verify_en:'Open 3 attached videos + compare daily views/saves.',
          owner:'Marketing', impact_vi:'Tăng reach dòng oversized', impact_en:'Lift oversized reach' },
        { tier:2, arch:'search_trend', label:'ESTIMATE', conf:'med',
          title_vi:'Từ khoá "áo khoác nỉ" tăng ~180% trong 14 ngày', title_en:'"Fleece jacket" searches up ~180% in 14 days',
          body_vi:'Google Trends + tìm kiếm trên sàn cho thấy cầu nhóm áo nỉ/khoác nỉ tăng mạnh (khoảng, không phải số tuyệt đối). Có thể cân nhắc: capsule áo nỉ + nội dung theo trend; cần kiểm tra tồn & năng lực nhập.',
          body_en:'Google Trends + on-platform search show fleece demand rising sharply (a range, not an absolute). Consider a fleece capsule + trend content; verify stock & sourcing capacity.',
          sources:['Google Trends','Search sàn'], date:'13/06', delta_vi:'14 ngày · ƯỚC TÍNH theo khoảng', delta_en:'14 days · ESTIMATE as a range',
          verify_vi:'Đối chiếu lượt tìm "áo nỉ" trên web nội bộ + tồn kho nhóm nỉ.', verify_en:'Cross-check internal "fleece" site searches + fleece stock.',
          owner:'Marketing · BI', impact_vi:'Định hướng capsule thu-đông', impact_en:'Guide autumn-winter capsule' },
        { tier:1, arch:'review_drop', label:'FACT', conf:'high',
          title_vi:'Review drop: CN Kim Mã rating Maps còn 4,1 (keyword "chờ lâu")', title_en:'Review drop: Kim Ma branch Maps rating down to 4.1 ("long wait")',
          body_vi:'Rating Google Maps CN Kim Mã giảm dưới ngưỡng 4,2; keyword tiêu cực "chờ lâu/nhân viên" tăng. Area Manager xử lý trong 48h, ghi nhận nguyên nhân.',
          body_en:'Kim Ma Google Maps rating fell below the 4.2 threshold; negative keywords "long wait/staff" rising. Area Manager to act within 48h and log root cause.',
          sources:['Google Maps'], date:'15/06', delta_vi:'review FACT · điểm ƯỚC TÍNH', delta_en:'reviews FACT · score ESTIMATE',
          verify_vi:'Đọc 10 review mới nhất CN Kim Mã (link đính kèm).', verify_en:'Read the 10 latest Kim Ma reviews (attached link).',
          owner:'Marketing · Ops', impact_vi:'Bảo vệ niềm tin & traffic CN', impact_en:'Protect branch trust & traffic' }
      ],
      sales: [
        { tier:1, arch:'sku_gap', label:'FACT', conf:'high',
          title_vi:'SKU gap: áo khoác phao đối thủ tăng mạnh mà ta đang thiếu', title_en:'SKU gap: competitor puffer jackets surging while we are short',
          body_vi:'Áo khoác phao (puffer) của đối thủ B/D leo top danh mục 7 ngày liên tục; nhóm này ta đang thiếu size/màu. Đề xuất capsule nhanh hoặc sản phẩm thay thế trong 2 tuần.',
          body_en:'Competitor B/D puffer jackets climbed the category top for 7 straight days; we are short on sizes/colors. Recommend a fast capsule or substitute within 2 weeks.',
          sources:['Metric/Kalodata','Shopee'], date:'14/06', delta_vi:'7 ngày · xếp hạng FACT, volume ƯỚC TÍNH', delta_en:'7 days · ranking FACT, volume ESTIMATE',
          verify_vi:'Mở bảng top danh mục + đối chiếu tồn nhóm áo khoác nội bộ.', verify_en:'Open category top table + cross-check internal jacket stock.',
          owner:'Sales · Merch', impact_vi:'Cơ hội doanh thu ~0,8–1,5 tỷ', impact_en:'~0.8–1.5B revenue upside' },
        { tier:1, arch:'voucher', label:'FACT', conf:'high',
          title_vi:'Voucher: đối thủ A tung mã 25% toàn nhóm áo khoác trên Shopee', title_en:'Voucher: competitor A launched a 25% jacket-wide code on Shopee',
          body_vi:'Đối thủ A áp voucher 25% nhóm áo khoác đến 30/06. Đề xuất: phản ứng có chọn lọc bằng bundle/quà tặng thay vì giảm giá thẳng để giữ biên.',
          body_en:'Competitor A applied a 25% jacket voucher until Jun 30. Recommend a selective response via bundle/gift instead of straight discount to protect margin.',
          sources:['Shopee'], date:'15/06', delta_vi:'1 nguồn · FACT, đang theo dõi nhân rộng', delta_en:'1 source · FACT, watching for spread',
          verify_vi:'Mở trang voucher Shopee đối thủ A (đính kèm).', verify_en:'Open competitor A Shopee voucher page (attached).',
          owner:'Sales', impact_vi:'Phòng thủ thị phần áo khoác', impact_en:'Defend jacket share' },
        { tier:2, arch:'geo', label:'FACT', conf:'high',
          title_vi:'Geo: đối thủ A mở store cách CN Cầu Giấy 1,8km', title_en:'Geo: competitor A opened a store 1.8km from Cau Giay branch',
          body_vi:'Đối thủ A khai trương cửa hàng trong bán kính 2km quanh CN Cầu Giấy. Theo dõi traffic & doanh thu CN trong 14 ngày trước khi quyết định khuyến mãi cục bộ.',
          body_en:'Competitor A opened a store within 2km of the Cau Giay branch. Monitor branch traffic & revenue for 14 days before any local promotion.',
          sources:['Google Maps','Fanpage A'], date:'11/06', delta_vi:'FACT · cần theo dõi 14 ngày', delta_en:'FACT · 14-day monitoring needed',
          verify_vi:'Xem overlay bản đồ đối thủ ↔ điểm bán + traffic CN tuần này.', verify_en:'See competitor↔store map overlay + this week branch traffic.',
          owner:'Sales · Ops', impact_vi:'Bảo vệ doanh thu CN Cầu Giấy', impact_en:'Protect Cau Giay revenue' }
      ],
      bi: [
        { tier:3, arch:'top_sku', label:'ESTIMATE', conf:'med',
          title_vi:'Top danh mục thị trường tuần (xếp hạng FACT, volume khoảng)', title_en:'Weekly market category top (ranking FACT, volume as range)',
          body_vi:'Bảng top danh mục: Áo khoác phao ↑, Áo nỉ ↑, Sơ-mi ổn định, Đầm ↓. Volume hiển thị dạng khoảng (vd "20k+ → ~22–28k") vì sàn không cho số tuyệt đối.',
          body_en:'Category top: puffer ↑, fleece ↑, shirts stable, dresses ↓. Volumes shown as ranges (e.g. "20k+ → ~22–28k") since platforms do not expose absolutes.',
          sources:['Metric/Kalodata'], date:'15/06', delta_vi:'snapshot-delta 7 ngày', delta_en:'7-day snapshot-delta',
          verify_vi:'Mở bảng SKU-level đính kèm.', verify_en:'Open attached SKU-level table.',
          owner:'BI · Merch', impact_vi:'Định hướng nhập & trưng bày', impact_en:'Guide buying & merchandising' },
        { tier:1, arch:'stockout', label:'FACT', conf:'high',
          title_vi:'Stockout hot: size M/đen sơ-mi hết ở 6 cửa hàng', title_en:'Stockout hot: shirt size M/black out at 6 stores',
          body_vi:'Size M màu đen dòng sơ-mi bán chạy đã hết tại 6 cửa hàng miền Bắc trong khi vẫn tồn ở miền Nam. Ưu tiên replenishment + điều chuyển kho Nam→Bắc.',
          body_en:'Best-selling shirt size M/black sold out at 6 northern stores while still in stock in the south. Prioritize replenishment + South→North transfer.',
          sources:['POS nội bộ','Tồn kho'], date:'15/06', delta_vi:'dữ liệu nội bộ · FACT', delta_en:'internal data · FACT',
          verify_vi:'Xem bảng tồn theo size/màu/cửa hàng.', verify_en:'See stock by size/color/store table.',
          owner:'Merch · Ops', impact_vi:'Tránh mất đơn ~0,3 tỷ/tuần', impact_en:'Avoid ~0.3B/wk lost sales' }
      ]
    },
    // ④ Khoảng trống dữ liệu
    gaps: [
      { vi:'Chưa có dữ liệu giá vốn (CMT/CM) cập nhật của nhà gia công để xác nhận biên nhóm áo khoác.', en:'No updated CMT cost from the contractor to confirm jacket-group margin.' },
      { vi:'Chưa rõ vị trí chính xác 2 flagship dự kiến của đối thủ A để đánh giá chồng lấn địa bàn.', en:'Exact locations of competitor A\'s 2 planned flagships are unknown for overlap analysis.' }
    ],
    // Accuracy log — "sổ độ chính xác"
    accuracy_log: [
      { wk:'Tuần 23', rec_vi:'Cắt mã quảng cáo TikTok ROAS<2.5', rec_en:'Cut TikTok ad sets ROAS<2.5', result:'hit', note_vi:'ROAS kênh hồi phục 2,2→2,9', note_en:'Channel ROAS recovered 2.2→2.9' },
      { wk:'Tuần 23', rec_vi:'Markdown áo khoác tồn >80 ngày', rec_en:'Markdown jackets >80 inv days', result:'hit', note_vi:'Sell-through 38%→57%', note_en:'Sell-through 38%→57%' },
      { wk:'Tuần 22', rec_vi:'Đẩy nhập áo nỉ trước trend', rec_en:'Pre-buy fleece ahead of trend', result:'miss', note_vi:'Trend đến chậm 2 tuần — đã hiệu chỉnh ngưỡng', note_en:'Trend came 2 weeks late — threshold recalibrated' },
      { wk:'Tuần 22', rec_vi:'Phản ứng voucher đối thủ bằng bundle', rec_en:'Counter competitor voucher with bundle', result:'hit', note_vi:'Giữ biên, giữ thị phần', note_en:'Held margin and share' }
    ]
  };
})();

/* Top 20 sản phẩm bán chạy thị trường (ngành thời trang) — đặt ngay sau Tóm tắt 30 giây.
   Volume là KHOẢNG (ƯỚC TÍNH) vì sàn chỉ hiện "20k+". Mỗi dòng có nguồn/ngày/confidence. */
window.VCPC_MI.top20 = (function(){
  var P=['Áo khoác phao nam','Áo nỉ oversized','Áo sơ-mi linen','Đầm midi hoa','Quần jeans ống suông','Áo khoác cardigan','Áo thun cotton premium','Chân váy xếp ly','Áo blazer nữ','Quần tây co giãn','Áo hoodie nỉ bông','Đầm body','Áo polo nam','Set đồ thể thao','Áo khoác denim','Áo len cổ lọ','Quần short kaki','Áo sơ-mi oversize','Túi tote canvas','Giày sneaker basic'];
  var BR=['Đối thủ A','Đối thủ B','Shop C','Đối thủ A','Shop D','Đối thủ B','Nhà mình','Shop C','Đối thủ A','Shop D','Đối thủ B','Shop C','Nhà mình','Đối thủ A','Shop D','Đối thủ B','Shop C','Nhà mình','Shop D','Đối thủ A'];
  var CAT=['Áo khoác','Áo nỉ','Sơ-mi','Đầm','Quần','Áo khoác','Áo thun','Chân váy','Blazer','Quần','Áo nỉ','Đầm','Áo thun','Thể thao','Áo khoác','Áo len','Quần','Sơ-mi','Phụ kiện','Giày'];
  var PL=['Shopee','TikTok Shop','Lazada','Shopee','TikTok Shop','Website','Shopee','Lazada','Shopee','TikTok Shop','Shopee','TikTok Shop','Website','Shopee','Lazada','Shopee','TikTok Shop','Website','Shopee','TikTok Shop'];
  var price=[459,299,389,329,549,359,189,259,629,419,279,239,219,499,469,349,189,289,159,599];
  var seed=20260615; function r(){seed=(seed*1103515245+12345)>>>0;return (seed>>>0)/4294967296;}
  return P.map(function(name,i){
    var d7=Math.floor(r()*14)-6, d30=Math.floor(r()*22)-8;
    var lo=Math.floor(8+r()*30), hi=lo+Math.floor(6+r()*22);
    var conf=r()>0.6?'high':r()>0.3?'med':'low';
    var stockout=r()>0.7;
    var voucher=r()>0.55;
    return {
      rank:i+1, name:name, brand:BR[i], cat:CAT[i], platform:PL[i],
      d7:d7, d30:d30, isNew:i>0&&r()>0.85,
      price:price[i], voucher:voucher, voucherPct:voucher?[10,15,20,25][Math.floor(r()*4)]:0,
      volLo:lo, volHi:hi, rating:(3.8+r()*1.1).toFixed(1), reviews:Math.floor(200+r()*4000),
      stockout:stockout, confidence:conf,
      source:PL[i]+' · Metric', date:'15/06', snapshot:true
    };
  });
})();
