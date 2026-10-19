const request = require('supertest');

jest.mock('../../src/config/stripe', () => ({
  paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
}));
jest.mock('../../src/payments/cheqpay/client', () => ({
  createPaymentLink: jest.fn(),
  getInvoice: jest.fn(),
}));

const cheqpay = require('../../src/payments/cheqpay/client');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Worker = require('../../src/models/Worker');
const Transaction = require('../../src/models/Transaction');

const INVOICE = 'a1b2c3d4e5f60718293a4b5c';

async function makeWorker({ approved = true } = {}) {
  const reg = await request(app).post('/api/auth/register').send({ name: 'Rafa', email: 'rafa@example.com', phone: '5551112222', password: 'password123' });
  await request(app).post('/api/workers/register').set('Authorization', `Bearer ${reg.body.token}`).send({ username: 'rafa' });
  const user = await User.findOne({ email: 'rafa@example.com' });
  await Worker.findByIdAndUpdate(user.worker, approved ? { 'cheqpay.status': 'approved' } : {});
  return user;
}

describe('Cheqpay as payment provider (PAYMENT_PROVIDER=cheqpay)', () => {
  beforeEach(() => {
    process.env.PAYMENT_PROVIDER = 'cheqpay';
    delete process.env.CHEQPAY_ALLOW_ALL_USERS;
    cheqpay.createPaymentLink.mockReset().mockResolvedValue({ id: 'lnk_1', url: 'https://pay.sandbox.cheqpay.mx/lnk_1' });
    cheqpay.getInvoice.mockReset();
  });
  afterAll(() => {
    delete process.env.PAYMENT_PROVIDER;
  });

  it('reports Cheqpay and its rate in fee-info', async () => {
    const res = await request(app).get('/api/tips/fee-info');
    expect(res.body).toMatchObject({ provider: 'cheqpay', feePercent: 3.3, feeFixedCents: 130, minCents: 2000 });
  });

  it('creates a hosted link for $50, in pesos, with an idempotency id and a return address', async () => {
    await makeWorker();
    const res = await request(app).post('/api/tips/create-link').send({ username: 'rafa', amount: 50 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ url: 'https://pay.sandbox.cheqpay.mx/lnk_1', amount: 5000, platformFee: 295, netAmount: 4705 });
    const arg = cheqpay.createPaymentLink.mock.calls[0][0];
    expect(arg.amountCents).toBe(5000);
    expect(arg.externalId).toMatch(/^tip_[a-f0-9]{24}$/);
    expect(arg.redirectUrl).toContain(`/pagar/rafa?ref=${arg.externalId}&cp_status={status}&cp_invoice_id={invoiceId}`);
    const tx = await Transaction.findById(res.body.transactionId);
    expect(tx).toMatchObject({ provider: 'cheqpay', status: 'pending', cheqpayLinkId: 'lnk_1', cheqpayExternalId: arg.externalId });
    expect(tx.stripePaymentIntentId).toBe(`cheqpay:${arg.externalId}`);
  });

  it('charges just enough for the person to receive the full tip when the fee is covered', async () => {
    await makeWorker();
    const res = await request(app).post('/api/tips/create-link').send({ username: 'rafa', amount: 50, coverFee: true });
    expect(res.body.amount).toBe(5305);
    expect(res.body.netAmount).toBeGreaterThanOrEqual(5000);
  });

  it('refuses below the $20 minimum, above $5,000, to oneself, and for someone not approved', async () => {
    const user = await makeWorker();
    const post = (b, t) => request(app).post('/api/tips/create-link').set(t ? { Authorization: `Bearer ${t}` } : {}).send(b);
    expect((await post({ username: 'rafa', amount: 10 })).status).toBe(400);
    expect((await post({ username: 'rafa', amount: 5001 })).status).toBe(400);
    await Worker.findByIdAndUpdate(user.worker, { 'cheqpay.status': 'none' });
    expect((await post({ username: 'rafa', amount: 50 })).status).toBe(400);
    expect(cheqpay.createPaymentLink).not.toHaveBeenCalled();
  });

  it('lets every profile receive in the sandbox when explicitly allowed', async () => {
    await makeWorker({ approved: false });
    process.env.CHEQPAY_ALLOW_ALL_USERS = 'true';
    const res = await request(app).post('/api/tips/create-link').send({ username: 'rafa', amount: 50 });
    expect(res.status).toBe(201);
  });

  it('keeps the Stripe intent endpoint closed while Cheqpay is active', async () => {
    await makeWorker();
    const res = await request(app).post('/api/tips/create-intent').send({ username: 'rafa', amount: 50 });
    expect(res.status).toBe(400);
  });

  async function makeTip() {
    await makeWorker();
    const res = await request(app).post('/api/tips/create-link').send({ username: 'rafa', amount: 50 });
    const tx = await Transaction.findById(res.body.transactionId);
    return tx;
  }

  it('confirms a paid invoice that belongs to the link, once, and counts the rating', async () => {
    const tx = await makeTip();
    cheqpay.getInvoice.mockResolvedValue({ status: 'paid', paymentLinkId: 'lnk_1' });
    const res = await request(app).post('/api/tips/confirm').send({ paymentIntentId: tx.stripePaymentIntentId, invoiceId: INVOICE, rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body.transaction.status).toBe('succeeded');
    const worker = await Worker.findById(tx.worker);
    expect(worker.tipCount).toBe(1);
    expect(worker.ratingCount).toBe(1);
    await request(app).post('/api/tips/confirm').send({ paymentIntentId: tx.stripePaymentIntentId, rating: 5 });
    expect((await Worker.findById(tx.worker)).tipCount).toBe(1);
  });

  it('rejects an invoice from another link, and keeps a pending invoice pending', async () => {
    const tx = await makeTip();
    cheqpay.getInvoice.mockResolvedValue({ status: 'paid', paymentLinkId: 'otro' });
    const bad = await request(app).post('/api/tips/confirm').send({ paymentIntentId: tx.stripePaymentIntentId, invoiceId: INVOICE });
    expect(bad.status).toBe(400);
    expect((await Transaction.findById(tx._id)).status).toBe('pending');
    cheqpay.getInvoice.mockResolvedValue({ status: 'pending', paymentLinkId: 'lnk_1' });
    const pending = await request(app).post('/api/tips/confirm').send({ paymentIntentId: tx.stripePaymentIntentId, invoiceId: INVOICE });
    expect(pending.body.transaction.status).toBe('pending');
  });

  it('marks a failed or cancelled invoice as failed but never undoes a paid one', async () => {
    const tx = await makeTip();
    cheqpay.getInvoice.mockResolvedValue({ status: 'failed', paymentLinkId: 'lnk_1' });
    const res = await request(app).post('/api/tips/confirm').send({ paymentIntentId: tx.stripePaymentIntentId, invoiceId: INVOICE });
    expect(res.body.transaction.status).toBe('failed');
    await Transaction.findByIdAndUpdate(tx._id, { status: 'succeeded' });
    cheqpay.getInvoice.mockClear();
    await request(app).post('/api/tips/confirm').send({ paymentIntentId: tx.stripePaymentIntentId, invoiceId: INVOICE });
    expect((await Transaction.findById(tx._id)).status).toBe('succeeded');
  });

  it('rejects a malformed invoice id', async () => {
    const tx = await makeTip();
    const res = await request(app).post('/api/tips/confirm').send({ paymentIntentId: tx.stripePaymentIntentId, invoiceId: 'no-es-un-id' });
    expect(res.status).toBe(400);
  });

  it('charges under the person\'s own Cheqpay merchant once an admin recorded it, and checks invoices under it', async () => {
    process.env.ADMIN_STATS_KEY = 'test-admin';
    const user = await makeWorker({ approved: false });
    // Without a key nobody can approve.
    const denied = await request(app).patch('/api/admin/cheqpay/rafa').send({ status: 'approved', merchantId: 'a'.repeat(24) });
    expect(denied.status).toBe(401);
    // A bad merchant id is refused.
    const bad = await request(app).patch('/api/admin/cheqpay/rafa').set('x-admin-key', 'test-admin').send({ status: 'approved', merchantId: 'corto' });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch('/api/admin/cheqpay/rafa').set('x-admin-key', 'test-admin').send({ status: 'approved', merchantId: 'b'.repeat(24) });
    expect(ok.body).toMatchObject({ status: 'approved', hasMerchant: true });
    expect((await Worker.findById(user.worker)).cheqpay.merchantId).toBe('b'.repeat(24));

    const res = await request(app).post('/api/tips/create-link').send({ username: 'rafa', amount: 50 });
    expect(res.status).toBe(201);
    expect(cheqpay.createPaymentLink.mock.calls[0][0].merchantId).toBe('b'.repeat(24));
    const tx = await Transaction.findById(res.body.transactionId);
    cheqpay.getInvoice.mockResolvedValue({ status: 'paid', paymentLinkId: 'lnk_1' });
    await request(app).post('/api/tips/confirm').send({ paymentIntentId: tx.stripePaymentIntentId, invoiceId: INVOICE });
    expect(cheqpay.getInvoice).toHaveBeenCalledWith(INVOICE, 'b'.repeat(24));
  });
});
