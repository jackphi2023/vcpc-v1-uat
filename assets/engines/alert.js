/* VCPC Auto — Alert engine. Pure rule eval; thresholds from plans/config. */
(function(){
  function cmp(v, op, t){ if (op==='<') return v < t; if (op==='>') return v > t; if (op==='<=') return v <= t; if (op==='>=') return v >= t; if (op==='==') return v === t; return false; }
  function evaluate(rules, scope){
    const out = [];
    rules.forEach(function(rule){
      if (!rule.enabled) return;
      const v = scope[rule.metric];
      if (v == null) return;
      let hit = cmp(v, rule.operator, rule.threshold);
      if (hit && rule.and){
        for (var i=0;i<rule.and.length;i++){
          var c = rule.and[i];
          if (!cmp(scope[c.metric], c.operator, c.threshold)){ hit = false; break; }
        }
      }
      if (hit){
        out.push({
          id: rule.id, metric: rule.metric, severity: rule.severity, owner: rule.owner,
          label: rule.label, actual: v, threshold: rule.threshold, operator: rule.operator,
          sla_hours: rule.sla, action: rule.action || null
        });
      }
    });
    return out;
  }
  window.VCPC_ALERT = { evaluate };
})();
