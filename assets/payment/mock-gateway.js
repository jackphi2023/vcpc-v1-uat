/* VCPC Auto — Mock payment gateway. Simulates BaoKim/Stripe end-to-end in localStorage. */
(function(){
  function rid(p){ return p + '_' + Math.random().toString(36).slice(2,10); }
  const Mock = {
    name: 'mock',
    async createPaymentOrder(input){
      if (window.VCPC_GUARD) VCPC_GUARD.assertGatewayAllowed('mock');
      // input: { engagement_id, organization_id, instalment, amount, currency, description, return_url }
      const tx = rid('mtxn');
      const order = {
        provider: 'mock',
        transaction_id: tx,
        redirect_url: 'payment.html?simulate=1&tx=' + tx,
        qr_url: null,
        status: 'PENDING',
        currency: input.currency,
        amount: input.amount,
        expires_at: Date.now() + 30*60*1000,
        raw: { input }
      };
      // log payment record
      if (window.VCPC_DB) {
        VCPC_DB.insert('payments', {
          provider:'mock', engagement_id:input.engagement_id, organization_id:input.organization_id,
          instalment:input.instalment, amount:input.amount, currency:input.currency,
          status:'CREATED', transaction_id: tx
        });
        VCPC_DB.audit('PAYMENT_CREATED', { transaction_id: tx, amount: input.amount, currency: input.currency, instalment: input.instalment });
      }
      return order;
    },
    async verifyWebhook(headers, rawBody){
      // mock always trusts; real impl verifies signature
      return { verified: true, event: JSON.parse(rawBody || '{}') };
    },
    async queryTransaction(id){
      const ps = (window.VCPC_DB && VCPC_DB.select('payments', { transaction_id: id })) || [];
      return { transaction_id: id, status: (ps[0] && ps[0].status) || 'UNKNOWN' };
    },
    async simulateSuccess(id){
      if (!window.VCPC_DB) return;
      const ps = VCPC_DB.select('payments', { transaction_id: id });
      if (!ps.length) return;
      ps[0].status = 'PAID'; ps[0].paid_at = Date.now();
      VCPC_DB.upsert('payments', ps[0]);
      VCPC_DB.audit('PAYMENT_PAID', { transaction_id: id });
      return ps[0];
    }
  };
  if (window.VCPC_PAY) VCPC_PAY.register('mock', Mock);
})();
