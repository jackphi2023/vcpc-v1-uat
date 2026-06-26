import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function replaceRequired(source, search, replacement, label) {
  const found = typeof search === 'string' ? source.includes(search) : search.test(source);
  if (!found) throw new Error(`BizDeal transform failed: ${label}`);
  return source.replace(search, replacement);
}

export default async function transformBizDeal(dist) {
  const file = path.join(dist, 'biz-deal.html');
  let html = await readFile(file, 'utf8');

  html = replaceRequired(
    html,
    '</style>',
    `.package-grid-two{display:grid;grid-template-columns:repeat(2,minmax(400px,450px));gap:28px;justify-content:center;align-items:stretch}.package-grid-two .package{width:100%;max-width:450px}.package-grid-two .package.featured{transform:none}@media(max-width:920px){.package-grid-two{grid-template-columns:minmax(0,450px)}}\n</style>`,
    'package grid CSS insertion point not found'
  );

  html = replaceRequired(
    html,
    /<div class="grid-3"><div class="card package reveal">[\s\S]*?<a class="btn btn-light" data-i18n="pkgCta" href="#contact">[^<]*<\/a><\/div><div class="card package featured reveal"/,
    '<div class="package-grid-two"><div class="card package featured reveal"',
    'Deal Diagnostic package card not found'
  );

  html = replaceRequired(
    html,
    /<tbody><tr><td><b data-i18n="phase1">Giai đoạn 1<\/b><\/td><td>Chẩn đoán giao dịch<\/td><td data-i18n="phase1Goal">[\s\S]*?<\/tbody>/,
    '<tbody><tr><td><b data-i18n="phase1">Giai đoạn 1</b></td><td data-i18n="phase1Service">Deal Readiness — Sẵn sàng giao dịch</td><td data-i18n="phase1Goal">Rà soát nền tảng tài chính, xây khoảng định giá, chuẩn hóa hồ sơ và kế hoạch tiếp cận nhà đầu tư/bên mua.</td></tr><tr><td><b data-i18n="phase2">Giai đoạn 2</b></td><td data-i18n="phase2Service">Deal Execution — Thực thi giao dịch</td><td data-i18n="phase2Goal">Tiếp cận có chọn lọc, hỗ trợ Q&amp;A, thẩm định, đàm phán và điều phối giao dịch.</td></tr></tbody>',
    'three-phase service table not found'
  );

  const replacements = [
    ["Mọi hồ sơ đều bắt đầu bằng Chẩn đoán giao dịch và Cổng sẵn sàng để xác định tính khả thi, dữ liệu còn thiếu và phạm vi phù hợp.", "BizDeal được triển khai theo hai giai đoạn rõ ràng: Deal Readiness để chuẩn bị nền tảng và Deal Execution để đưa giao dịch ra thị trường."],
    ["Từ chẩn đoán giao dịch đến thực thi", "Từ sẵn sàng giao dịch đến thực thi"],
    ["Chẩn đoán mức độ sẵn sàng", "Rà soát nền tảng giao dịch"],
    ["Chẩn đoán giao dịch và cổng sẵn sàng", "Rà soát nền tảng và mức độ sẵn sàng giao dịch"],
    ["Phạm vi triển khai theo mức độ sẵn sàng và yêu cầu giao dịch", "Hai phạm vi dịch vụ theo mức độ sẵn sàng giao dịch"],
    ["Phạm vi, thời gian và phí được xác định theo mục tiêu giao dịch, chất lượng dữ liệu, mức độ sẵn sàng và phạm vi hỗ trợ cần thiết.", "BizDeal gồm hai phạm vi dịch vụ: chuẩn bị doanh nghiệp sẵn sàng giao dịch và trực tiếp hỗ trợ thực thi giao dịch. Thời gian, phí và phạm vi được xác định theo mục tiêu, chất lượng dữ liệu và mức độ hỗ trợ cần thiết."],
    ["Deal Readiness — Chuẩn bị sẵn sàng giao dịch", "Deal Readiness — Sẵn sàng giao dịch"],
    ["Dành cho doanh nghiệp muốn chuẩn bị hồ sơ nghiêm túc trước khi tiếp cận nhà đầu tư/bên mua.", "Dành cho doanh nghiệp cần chuẩn hóa nền tảng tài chính, định giá, hồ sơ và kế hoạch tiếp cận trước khi làm việc với nhà đầu tư/bên mua."],
    [">Báo cáo sẵn sàng &amp; khoảng định giá<", ">Rà soát mức độ sẵn sàng &amp; khoảng định giá<"],
    [">Hồ sơ giao dịch<", ">Teaser, pitch deck/IM &amp; mô hình tài chính<"],
    [">Danh mục data room<", ">Danh mục &amp; kế hoạch hoàn thiện data room<"],
    [">Bản đồ nhà đầu tư/bên mua &amp; kế hoạch tiếp cận<", ">Bản đồ nhà đầu tư/bên mua &amp; chiến lược tiếp cận<"],
    ["Dành cho doanh nghiệp đã sẵn sàng tiếp cận thị trường vốn.", "Dành cho doanh nghiệp đã có nền tảng và hồ sơ phù hợp để tiếp cận nhà đầu tư, bên mua hoặc đối tác chiến lược."],
    [">Hoàn thiện hồ sơ giao dịch<", ">Hoàn thiện hồ sơ &amp; thông điệp giao dịch<"],
    [">Tiếp cận nhà đầu tư/bên mua<", ">Tiếp cận có chọn lọc nhà đầu tư/bên mua<"],
    [">Hỗ trợ đàm phán và thẩm định<", ">Hỗ trợ Q&amp;A, thẩm định &amp; đàm phán<"],
    ["Có. Doanh nghiệp sẽ bắt đầu bằng Chẩn đoán giao dịch và Cổng sẵn sàng để xác định mức độ khả thi, dữ liệu còn thiếu và phạm vi phù hợp.", "Có. Doanh nghiệp có thể bắt đầu trực tiếp với Deal Readiness để xác định mức độ sẵn sàng, dữ liệu còn thiếu và phạm vi cần hoàn thiện trước khi thực thi giao dịch."],

    ["tPhase:'Giai đoạn',tService:'Dịch vụ',tGoal:'Mục tiêu',phase1:'Giai đoạn 1',phase1Goal:'Chẩn đoán tài chính, tối ưu EBITDA, đánh giá mức độ sẵn sàng vốn.',phase2:'Giai đoạn 2',phase2Goal:'Định giá sơ bộ, chuẩn hóa hồ sơ, xây dựng câu chuyện đầu tư.',phase3:'Giai đoạn 3',phase3Goal:'Tiếp cận nhà đầu tư/bên mua, hỗ trợ đàm phán và điều phối giao dịch.'", "tPhase:'Giai đoạn',tService:'Dịch vụ',tGoal:'Mục tiêu',phase1:'Giai đoạn 1',phase1Service:'Deal Readiness — Sẵn sàng giao dịch',phase1Goal:'Rà soát nền tảng tài chính, xây khoảng định giá, chuẩn hóa hồ sơ và kế hoạch tiếp cận nhà đầu tư/bên mua.',phase2:'Giai đoạn 2',phase2Service:'Deal Execution — Thực thi giao dịch',phase2Goal:'Tiếp cận có chọn lọc, hỗ trợ Q&A, thẩm định, đàm phán và điều phối giao dịch.'"],
    ["pkg1Time:'2-3 tuần',pkg1Title:'Deal Diagnostic — Chẩn đoán giao dịch',pkg1Text:'Dành cho chủ doanh nghiệp muốn đánh giá nhanh khả năng gọi vốn/M&A.',pkg1Li1:'Điểm sẵn sàng gọi vốn',pkg1Li2:'Khoảng định giá sơ bộ',pkg1Li3:'Điểm cần hoàn thiện',pkg1Li4:'Kế hoạch chuẩn bị ban đầu',", ""],
    ["pkg2Title:'Deal Readiness — Chuẩn bị sẵn sàng giao dịch'", "pkg2Title:'Deal Readiness — Sẵn sàng giao dịch'"],
    ["pkg2Text:'Dành cho doanh nghiệp muốn chuẩn bị hồ sơ nghiêm túc trước khi tiếp cận nhà đầu tư/bên mua.'", "pkg2Text:'Dành cho doanh nghiệp cần chuẩn hóa nền tảng tài chính, định giá, hồ sơ và kế hoạch tiếp cận trước khi làm việc với nhà đầu tư/bên mua.'"],
    ["pkg2Li1:'Báo cáo mức độ sẵn sàng và khoảng định giá'", "pkg2Li1:'Rà soát mức độ sẵn sàng và khoảng định giá'"],
    ["pkg2Li2:'Teaser, pitch deck hoặc IM'", "pkg2Li2:'Teaser, pitch deck/IM và mô hình tài chính'"],
    ["pkg2Li3:'Danh mục hồ sơ data room'", "pkg2Li3:'Danh mục và kế hoạch hoàn thiện data room'"],
    ["pkg2Li4:'Bản đồ nhà đầu tư/bên mua và kế hoạch 90 ngày'", "pkg2Li4:'Bản đồ nhà đầu tư/bên mua và chiến lược tiếp cận'"],
    ["pkg3Text:'Dành cho doanh nghiệp đã sẵn sàng tiếp cận thị trường vốn.'", "pkg3Text:'Dành cho doanh nghiệp đã có nền tảng và hồ sơ phù hợp để tiếp cận nhà đầu tư, bên mua hoặc đối tác chiến lược.'"],
    ["pkg3Li1:'Hoàn thiện hồ sơ giao dịch'", "pkg3Li1:'Hoàn thiện hồ sơ và thông điệp giao dịch'"],
    ["pkg3Li2:'Tiếp cận nhà đầu tư/bên mua'", "pkg3Li2:'Tiếp cận có chọn lọc nhà đầu tư/bên mua'"],
    ["pkg3Li3:'Hỗ trợ đàm phán và thẩm định'", "pkg3Li3:'Hỗ trợ Q&A, thẩm định và đàm phán'"],

    ["bridgeTitle:'Once financial health is clear, the next step is preparing for a capital event.'", "bridgeTitle:'BizDeal is delivered through two clear stages: readiness and execution.'"],
    ["bridgeLead:'BizDeal can be the next step after BizHealth or BizOS, once your company has solid financial data and foundational materials.'", "bridgeLead:'Deal Readiness prepares the financial foundation, valuation and materials; Deal Execution takes the mandate to selected investors or buyers.'"],
    ["tPhase:'Phase',tService:'Service',tGoal:'Goal',phase1:'Phase 1',phase1Goal:'Financial diagnosis, EBITDA optimization and preliminary capital readiness assessment.',phase2:'Phase 2',phase2Goal:'Valuation range, investor materials and investment narrative.',phase3:'Phase 3',phase3Goal:'Investor/buyer outreach, negotiation support and transaction coordination.'", "tPhase:'Phase',tService:'Service',tGoal:'Goal',phase1:'Phase 1',phase1Service:'Deal Readiness',phase1Goal:'Review the financial foundation, develop a valuation range, prepare transaction materials and build the investor/buyer approach plan.',phase2:'Phase 2',phase2Service:'Deal Execution',phase2Goal:'Selective outreach, Q&A, due diligence, negotiation support and transaction coordination.'"],
    ["modulesTitle:'5 BizDeal categories'", "modulesTitle:'From Deal Readiness to Deal Execution'"],
    ["m1Btn:'Capital Readiness Diagnostic'", "m1Btn:'Transaction foundation review'"],
    ["m1Title:'Capital/M&A readiness diagnostic'", "m1Title:'Transaction foundation and readiness review'"],
    ["packagesKicker:'The Capital & M&A service'", "packagesKicker:'BizDeal services'"],
    ["packagesTitle:'Delivery scope scaled to your company size.'", "packagesTitle:'Two service scopes based on transaction readiness'"],
    ["packagesLead:'Same outputs: readiness assessment, valuation range, transaction materials and investor outreach. Workload and fees scale with your company size.'", "packagesLead:'BizDeal has two clear service scopes: preparing the company for a transaction and supporting transaction execution. Timeline, fees and scope depend on objectives, data quality and required support.'"],
    ["pkg1Time:'2-3 weeks',pkg1Title:'Deal Diagnostic — under VND 50B/yr or testing fundraising feasibility',pkg1Text:'For founders who want a quick view of fundraising/M&A readiness.',pkg1Li1:'Mức độ sẵn sàng',pkg1Li2:'Preliminary valuation range',pkg1Li3:'10–15 improvement points',pkg1Li4:'30-day action plan',", ""],
    ["pkg2Title:'Deal Readiness — VND 50–300B/yr or preparing transaction materials'", "pkg2Title:'Deal Readiness'"],
    ["pkg2Text:'For companies preparing proper materials before investor/buyer outreach.'", "pkg2Text:'For companies that need to prepare the financial foundation, valuation, materials and outreach plan before engaging investors or buyers.'"],
    ["pkg2Li1:'Readiness report and valuation range'", "pkg2Li1:'Readiness review and valuation range'"],
    ["pkg2Li2:'Teaser, pitch deck or IM'", "pkg2Li2:'Teaser, pitch deck/IM and financial model'"],
    ["pkg2Li3:'Danh mục data room'", "pkg2Li3:'Data room index and completion plan'"],
    ["pkg2Li4:'Investor/buyer map and 90-day plan'", "pkg2Li4:'Investor/buyer map and outreach strategy'"],
    ["pkg3Title:'Deal Execution — over VND 300B/yr or a transaction ready to execute'", "pkg3Title:'Deal Execution'"],
    ["pkg3Text:'For companies ready to approach the capital market.'", "pkg3Text:'For companies with the foundation and materials to approach selected investors, buyers or strategic partners.'"],
    ["pkg3Li1:'Final transaction materials'", "pkg3Li1:'Finalize transaction materials and positioning'"],
    ["pkg3Li2:'Investor/buyer outreach'", "pkg3Li2:'Selective investor/buyer outreach'"],
    ["pkg3Li3:'Negotiation and DD support'", "pkg3Li3:'Q&A, due diligence and negotiation support'"]
  ];

  for (const [search, replacement] of replacements) {
    if (html.includes(search)) html = html.replaceAll(search, replacement);
  }

  if (html.includes('Deal Diagnostic')) {
    throw new Error('BizDeal transform failed: Deal Diagnostic is still present');
  }
  if (!html.includes('package-grid-two')) {
    throw new Error('BizDeal transform failed: two-column package layout missing');
  }

  await writeFile(file, html, 'utf8');
}
