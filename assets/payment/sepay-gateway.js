/* VCPC Auto — Sepay gateway. Tạo QR VietQR theo nội dung CK; backend nhận webhook khi
   tiền về (https://sepay.vn) rồi set payment PAID. Front-end hiển thị QR + poll trạng thái.
   Khi chưa nối backend (demo), cho phép "Tôi đã chuyển khoản" + admin xác nhận như bank-transfer. */
(function(){
  function buildVietQR(cfg, amount, note){
    // VietQR image API (img.vietqr.io) — render QR động. amount/addInfo optional.
    if (!cfg || !cfg.account_number || !cfg.bank_code) return null;
    var base = 'https://img.vietqr.io/image/' + encodeURIComponent(cfg.bank_code) + '-' + encodeURIComponent(cfg.account_number) + '-' + (cfg.template||'compact') + '.png';
    var qs = [];
    if (amount != null) qs.push('amount=' + Math.round(amount));
    if (note) qs.push('addInfo=' + encodeURIComponent(note));
    if (cfg.account_holder) qs.push('accountName=' + encodeURIComponent(cfg.account_holder));
    return base + (qs.length ? ('?' + qs.join('&')) : '');
  }
  async function postJSON(url, body){
    try { var r = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) }); if(!r.ok) throw 0; return await r.json(); }
    catch(e){ return null; }
  }
  var Sepay = {
    name: 'sepay',
    buildVietQR: buildVietQR,
    async createPaymentOrder(input){
      if (window.VCPC_GUARD) VCPC_GUARD.assertGatewayAllowed('sepay');
      // input: { engagement_id, organization_id, instalment, amount, currency, description, reference, sepayConfig }
      var cfg = input.sepayConfig || {};
      var note = input.reference || ('VCPC ' + (input.engagement_id||'').slice(-8));
      var qr = buildVietQR(cfg, input.amount, note);
      // try backend to register an expected payment (so webhook can match)
      var back = await postJSON('/api/payments/sepay/create', input);
      var tx = (back && back.transaction_id) || note;
      if (window.VCPC_DB){
        VCPC_DB.insert('payments', {
          provider:'sepay', engagement_id:input.engagement_id, organization_id:input.organization_id,
          instalment:input.instalment, amount:input.amount, currency:input.currency,
          status:'AWAITING_CONFIRMATION', transaction_id:tx, reference:note, plan_code:input.plan_code, created_at:Date.now()
        });
        VCPC_DB.audit('SEPAY_QR_SHOWN', { transaction_id:tx, amount:input.amount, reference:note });
      }
      return { provider:'sepay', transaction_id:tx, qr_url:qr, status:'PENDING', currency:input.currency, amount:input.amount, reference:note, raw:{ backend: !!back } };
    },
    // Front-end polls this; backend returns PAID once Sepay webhook matched the transfer note.
    async queryTransaction(tx){
      var back = await postJSON('/api/payments/sepay/status', { transaction_id: tx });
      if (back && back.status) return back;
      var ps = (window.VCPC_DB && VCPC_DB.select('payments', { transaction_id: tx })) || [];
      return { transaction_id: tx, status: (ps[0] && ps[0].status) || 'UNKNOWN' };
    },
    // demo helper: mark as paid (simulates webhook)
    async simulateWebhook(tx){
      if (!window.VCPC_DB) return;
      var ps = VCPC_DB.select('payments', { transaction_id: tx });
      if (!ps.length) return null;
      ps[0].status = 'PAID'; ps[0].paid_at = Date.now();
      VCPC_DB.upsert('payments', ps[0]);
      VCPC_DB.audit('SEPAY_WEBHOOK_PAID', { transaction_id: tx });
      return ps[0];
    }
  };
  if (window.VCPC_PAY) VCPC_PAY.register('sepay', Sepay);
  window.VCPC_SEPAY = Sepay;
})();
