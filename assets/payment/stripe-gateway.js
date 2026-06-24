/* VCPC Auto — Stripe gateway skeleton. Creates a PaymentIntent via Next.js backend
   at /api/payments/stripe/create-intent, then redirects to Stripe Checkout or mounts
   Stripe Elements. Falls back to Mock for front-end demo. */
(function(){
  async function postJSON(url, body){
    try {
      const r = await fetch(url, { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } catch (e) {
      console.warn('[Stripe] backend not reachable, falling back to mock for demo:', e.message);
      return null;
    }
  }
  const Stripe = {
    name: 'stripe',
    async createPaymentOrder(input){
      const back = await postJSON('/api/payments/stripe/create-intent', input);
      if (back) return Object.assign({ provider:'stripe' }, back);
      const mock = VCPC_PAY.get('mock');
      const ord = await mock.createPaymentOrder(input);
      ord.provider = 'stripe'; ord.raw.simulated = true;
      return ord;
    },
    async verifyWebhook(headers, rawBody){
      const r = await postJSON('/api/payments/stripe/webhook', { headers, body: rawBody });
      return r || { verified: false, error: 'no backend' };
    },
    async queryTransaction(id){
      const r = await postJSON('/api/payments/stripe/query', { id });
      return r || { transaction_id: id, status: 'UNKNOWN' };
    }
  };
  if (window.VCPC_PAY) VCPC_PAY.register('stripe', Stripe);
})();
