const crypto = require('crypto');
const request = require('supertest');

jest.mock('../../src/config/stripe', () => ({}));

const app = require('../../src/app');
const User = require('../../src/models/User');
const Worker = require('../../src/models/Worker');
const Transaction = require('../../src/models/Transaction');

const SECRET = 'integration-webhook-secret';
process.env.CHEQPAY_WEBHOOK_SECRET = SECRET;

const sign = (payload) =>
  crypto
    .createHmac('sha256', SECRET)
    .update([payload.data.paymentMethod.options.card.id, payload.data.amount, payload.data.currency, payload.event, JSON.stringify(payload)].join('|'))
    .digest('hex');

const body = (event, externalId) => ({
  id: 'evt-1',
  event,
  data: {
    paymentOrder: { id: 'ord_1', externalId },
    paymentMethod: { type: 'card', options: { card: { id: 'card_1' } } },
    amount: '5295',
    currency: 'MXN',
    createdAt: new Date().toISOString(),
  },
});

async function makeTransaction() {
  const reg = await request(app).post('/api/auth/register').send({ name: 'Rafa', email: 'rafa@example.com', phone: '5551112222', password: 'password123' });
  await request(app).post('/api/workers/register').set('Authorization', `Bearer ${reg.body.token}`).send({ username: 'rafa' });
  const user = await User.findOne({ email: 'rafa@example.com' });
  const worker = await Worker.findById(user.worker);
  return Transaction.create({
    worker: worker._id, amount: 5295, platformFee: 295, netAmount: 5000, status: 'pending',
    provider: 'cheqpay', cheqpayExternalId: 'tip-abc', stripePaymentIntentId: 'cheqpay:tip-abc',
  });
}

const post = (payload, signature) => request(app).post('/api/webhooks/cheqpay').set('x-webhook-signature', signature).send(payload);

describe('POST /api/webhooks/cheqpay', () => {
  it('rejects a bad signature and changes nothing', async () => {
    const tx = await makeTransaction();
    const payload = body('payment.capture.success', 'tip-abc');
    const res = await post(payload, 'deadbeef');
    expect(res.status).toBe(401);
    expect((await Transaction.findById(tx._id)).status).toBe('pending');
  });

  it('marks the tip as paid on a signed capture, and a repeat changes nothing more', async () => {
    const tx = await makeTransaction();
    const payload = body('payment.capture.success', 'tip-abc');
    expect((await post(payload, sign(payload))).status).toBe(200);
    expect((await Transaction.findById(tx._id)).status).toBe('succeeded');
    const worker = await Worker.findById(tx.worker);
    const tips = worker.tipCount;
    expect((await post(payload, sign(payload))).status).toBe(200);
    expect((await Worker.findById(tx.worker)).tipCount).toBe(tips);
  });

  it('marks a failed authorization as failed, but never undoes a paid tip', async () => {
    const tx = await makeTransaction();
    const failed = body('payment.auth.failed', 'tip-abc');
    await post(failed, sign(failed));
    expect((await Transaction.findById(tx._id)).status).toBe('failed');

    const tx2 = await Transaction.create({ ...tx.toObject(), _id: undefined, cheqpayExternalId: 'tip-2', stripePaymentIntentId: 'cheqpay:tip-2', status: 'succeeded' });
    const failed2 = body('payment.auth.failed', 'tip-2');
    await post(failed2, sign(failed2));
    expect((await Transaction.findById(tx2._id)).status).toBe('succeeded');
  });

  it('acknowledges a signed event for an order it does not know', async () => {
    const payload = body('payment.capture.success', 'nobody');
    const res = await post(payload, sign(payload));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
