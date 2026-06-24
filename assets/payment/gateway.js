/* VCPC Auto — PaymentGateway interface + factory.
   PRD §8: business logic only depends on this shape, not on BaoKim/Stripe response format. */
(function(){
  // Shape: { createPaymentOrder(input), verifyWebhook(headers, rawBody), queryTransaction(id), refund?(input) }
  const gateways = {};
  function register(name, impl){ gateways[name] = impl; }
  function get(name){
    const k = name || (window.VCPC_APP && VCPC_APP.preferredGateway && VCPC_APP.preferredGateway()) || 'mock';
    return gateways[k] || gateways.mock;
  }
  // PaymentOrderResult shape
  // { provider, transaction_id, redirect_url, qr_url, status, currency, amount, expires_at, raw }
  window.VCPC_PAY = { register, get, listAvailable(){ return Object.keys(gateways); } };
})();
