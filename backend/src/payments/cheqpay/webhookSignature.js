const crypto = require('crypto');

// Cheqpay signs each webhook with HMAC-SHA256 over:
//   paymentMethodId | amount | currency | event | JSON.stringify(body)
// and sends it in the x-webhook-signature header. Compared in constant time.
function paymentMethodId(pm) {
  switch (pm?.type) {
    case 'card':
      return pm.options?.card?.id;
    case 'spei':
      return pm.options?.clabe;
    case 'paycash':
      return pm.options?.paycash?.reference;
    case 'cie_cash_net':
      return pm.options?.cieCashNet?.reference;
    default:
      return undefined;
  }
}

function expectedSignature(payload, secret) {
  const data = payload?.data || {};
  const parts = [paymentMethodId(data.paymentMethod), data.amount, data.currency, payload?.event, JSON.stringify(payload)].join('|');
  return crypto.createHmac('sha256', secret).update(parts).digest('hex');
}

function verifyWebhookSignature(payload, signature, secret = process.env.CHEQPAY_WEBHOOK_SECRET) {
  if (!secret || typeof signature !== 'string' || !payload) return false;
  if (paymentMethodId(payload.data?.paymentMethod) === undefined) return false;
  const expected = Buffer.from(expectedSignature(payload, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

module.exports = { verifyWebhookSignature, expectedSignature };
