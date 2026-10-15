const crypto = require('crypto');
const { verifyWebhookSignature, expectedSignature } = require('../../src/payments/cheqpay/webhookSignature');

const SECRET = 'test-webhook-secret';
const payload = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  event: 'payment.capture.success',
  data: {
    paymentOrder: { id: 'ord_1', merchantReference: 'ref', externalId: 'tip-1' },
    customer: { id: 'cus_1' },
    paymentMethod: { type: 'card', options: { card: { id: 'card_abc123' } } },
    amount: '10000',
    currency: 'MXN',
    createdAt: '2025-10-30T14:30:00.000Z',
  },
};

// Computed independently, exactly as Cheqpay's documentation describes it.
const docSignature = (p, secret) =>
  crypto
    .createHmac('sha256', secret)
    .update(['card_abc123', p.data.amount, p.data.currency, p.event, JSON.stringify(p)].join('|'))
    .digest('hex');

describe('Cheqpay webhook signature', () => {
  it('accepts a body signed as the documentation describes', () => {
    expect(verifyWebhookSignature(payload, docSignature(payload, SECRET), SECRET)).toBe(true);
    expect(expectedSignature(payload, SECRET)).toBe(docSignature(payload, SECRET));
  });

  it('rejects a wrong secret, a changed amount, a changed event and a garbage signature', () => {
    const sig = docSignature(payload, SECRET);
    expect(verifyWebhookSignature(payload, sig, 'other-secret')).toBe(false);
    expect(verifyWebhookSignature({ ...payload, data: { ...payload.data, amount: '1' } }, sig, SECRET)).toBe(false);
    expect(verifyWebhookSignature({ ...payload, event: 'payment.auth.failed' }, sig, SECRET)).toBe(false);
    expect(verifyWebhookSignature(payload, 'abc', SECRET)).toBe(false);
  });

  it('rejects when there is no secret, no signature, or an unknown payment method', () => {
    const sig = docSignature(payload, SECRET);
    expect(verifyWebhookSignature(payload, sig, '')).toBe(false);
    expect(verifyWebhookSignature(payload, undefined, SECRET)).toBe(false);
    const odd = { ...payload, data: { ...payload.data, paymentMethod: { type: 'crypto', options: {} } } };
    expect(verifyWebhookSignature(odd, 'x', SECRET)).toBe(false);
  });
});
