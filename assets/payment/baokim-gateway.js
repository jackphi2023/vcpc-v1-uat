/* VCPC Auto — BaoKim gateway skeleton. Posts to /api/payments/baokim/create-order on
   the eventual Next.js backend; signed by BAOKIM_WEBHOOK_SECRET. Falls back to Mock in
   pure front-end mode (no /api). */
(function(){
  async function postJSON(url, body){
    try {
      const r = await fetch(url, { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } catch (e) {
      console.warn('[BaoKim] backend not reachable, falling back to mock for demo:', e.message);
      return null;
    }
  }
  const BaoKim = {
    name: 'baokim',
    async createPaymentOrder(input){
      const back = await postJSON('/api/payments/baokim/create-order', input);
      if (back) return Object.assign({ provider:'baokim' }, back);
      // demo fallback
      const mock = VCPC_PAY.get('mock');
      const ord = await mock.createPaymentOrder(input);
      ord.provider = 'baokim'; ord.raw.simulated = true;
      return ord;
    },
    async verifyWebhook(headers, rawBody){
      const r = await postJSON('/api/payments/baokim/verify', { headers, body: rawBody });
      return r || { verified: false, error: 'no backend' };
    },
    async queryTransaction(id){
      const r = await postJSON('/api/payments/baokim/query', { id });
      return r || { transaction_id: id, status: 'UNKNOWN' };
    }
  };
  if (window.VCPC_PAY) VCPC_PAY.register('baokim', BaoKim);
})();
