/* VCPC Auto — Data Quality Score engine.
   Weights from build brief §4.3:
     Completeness 25 · Consistency 25 · Granularity 20 · Freshness 15 · Traceability 15 */
(function(){
  function clamp(v){ return Math.max(0, Math.min(100, Math.round(v))); }
  const W = { completeness:0.25, consistency:0.25, granularity:0.20, freshness:0.15, traceability:0.15 };
  function computeFromFiles(files){
    // For mock/demo: derive a realistic-looking score from a fileset description.
    // Real impl reads normalized_records + validation_issues counts.
    let sub = { completeness:50, consistency:50, granularity:50, freshness:50, traceability:50 };
    if (!files || !files.length) return { score: 0, sub, issues: ['Chưa có file dữ liệu nào được nạp.'] };
    let comp = 0, gran = 0, fresh = 0, cons = 0, trac = 0;
    let issues = [];
    files.forEach(function(f){
      // expected fields per upload entry: { sheets: [{name,rows,cols,mappedPct,duplicates,missingPct}], ageDays, hasSource }
      const sheets = f.sheets || [];
      const avgMapped = sheets.length ? (sheets.reduce((s,x)=>s + (x.mappedPct||0),0) / sheets.length) : 0;
      const avgMissing = sheets.length ? (sheets.reduce((s,x)=>s + (x.missingPct||0),0) / sheets.length) : 100;
      const dup = sheets.reduce((s,x)=>s + (x.duplicates||0), 0);
      comp += (100 - avgMissing);
      cons += avgMapped;
      gran += Math.min(100, sheets.length * 18);
      fresh += Math.max(0, 100 - (f.ageDays || 30) * 1.6);
      trac += f.hasSource ? 90 : 35;
      if (avgMissing > 25) issues.push('Có ô trống vượt 25% trong tệp ' + (f.name || 'không tên') + '.');
      if (dup > 5) issues.push('Phát hiện ' + dup + ' dòng trùng lặp trong ' + (f.name || 'không tên') + '.');
      if (!f.hasSource) issues.push('Tệp ' + (f.name || '?') + ' thiếu cột nguồn / mã chứng từ.');
    });
    const n = files.length;
    sub = { completeness:clamp(comp/n), consistency:clamp(cons/n), granularity:clamp(gran/n), freshness:clamp(fresh/n), traceability:clamp(trac/n) };
    const score = clamp(sub.completeness*W.completeness + sub.consistency*W.consistency + sub.granularity*W.granularity + sub.freshness*W.freshness + sub.traceability*W.traceability);
    return { score, sub, issues };
  }
  function tier(score, threshold){
    if (score >= threshold) return 'pass';
    if (score >= threshold - 10) return 'borderline';
    return 'block';
  }
  window.VCPC_DQS = { computeFromFiles, tier, weights: W };
})();
