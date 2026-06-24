/* VCPC Auto — Recommendation engine. Produces deterministic candidates from data;
   the LLM only writes narrative ("AI_DRAFT"). VCPC reviewer signs each one off. */
(function(){
  function rank(recs){
    const fw = { high:1.0, medium:0.7, low:0.45 };
    recs.forEach(function(r){ r.score = Math.round((r.impact + 0.5) * (fw[r.feasibility] || 0.7) * 10) / 10; });
    recs.sort(function(a,b){ return b.score - a.score; });
    return recs;
  }
  window.VCPC_RECO = { rank };
})();
