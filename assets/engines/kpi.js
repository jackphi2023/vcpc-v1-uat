/* VCPC Auto — KPI engine (deterministic). Pure functions over normalized records. */
(function(){
  const fmt = {
    pct(v){ return (Math.round(v*10)/10) + '%'; },
    num(v){ return new Intl.NumberFormat('vi-VN').format(Math.round(v)); },
    money(v){ return new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' tỷ'; }
  };
  function grossMargin(rev, cogs){ if (!rev) return 0; return ((rev - cogs)/rev)*100; }
  function ebitdaMargin(rev, ebitda){ if (!rev) return 0; return (ebitda/rev)*100; }
  function cashRunwayDays(cash, monthlyOpex){ if (!monthlyOpex) return 999; return Math.round(cash / (monthlyOpex/30)); }
  function inventoryTurnover(cogs, avgInv){ if (!avgInv) return 0; return Math.round((cogs/avgInv)*10)/10; }
  function dso(receivable, revenue, days){ days = days || 365; if (!revenue) return 0; return Math.round(receivable / revenue * days); }
  function repeatRate(repeat, total){ if (!total) return 0; return (repeat/total)*100; }
  function cac(spend, customers){ if (!customers) return 0; return spend / customers; }
  function roas(rev, spend){ if (!spend) return 0; return Math.round((rev/spend)*100)/100; }
  function revPerBranch(rev, n){ if (!n) return 0; return rev / n; }
  function rentPctRev(rent, rev){ if (!rev) return 0; return (rent/rev)*100; }
  function laborPctRev(labor, rev){ if (!rev) return 0; return (labor/rev)*100; }
  window.VCPC_KPI = { grossMargin, ebitdaMargin, cashRunwayDays, inventoryTurnover, dso, repeatRate, cac, roas, revPerBranch, rentPctRev, laborPctRev, fmt };
})();
