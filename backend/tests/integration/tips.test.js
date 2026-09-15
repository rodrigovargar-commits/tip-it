const request = require('supertest');

jest.mock('../../src/config/stripe', () => ({
  paymentIntents: {
    create: jest.fn().mockResolvedValue({ id: 'pi_test_123', client_secret: 'secret_123' }),
  },
}));

const app = require('../../src/app');
const stripe = require('../../src/config/stripe');
const User = require('../../src/models/User');
const Worker = require('../../src/models/Worker');
const Transaction = require('../../src/models/Transaction');
const markTransactionSucceeded = require('../../src/utils/markTransactionSucceeded');

async function createReadyWorker(suffix) {
  const registerRes = await request(app).post('/api/auth/register').send({
    name: `Trabajador ${suffix}`,
    email: `tip${suffix}@example.com`,
    phone: `555111${suffix}`,
    password: 'password123',
  });
  const token = registerRes.body.token;
  await request(app)
    .post('/api/workers/register')
    .set('Authorization', `Bearer ${token}`)
    .send({ username: `tipworker${suffix}` });

  // create-intent requires stripeOnboardingComplete + a stripeAccountId, which
  // only happens after a real Connect flow — set it directly for the test.
  const user = await User.findOne({ email: `tip${suffix}@example.com` });
  await Worker.findByIdAndUpdate(user.worker, {
    stripeAccountId: `acct_test_${suffix}`,
    stripeOnboardingComplete: true,
  });

  return { token, username: `tipworker${suffix}`, userId: user._id };
}

describe('POST /api/tips/create-intent — validation and business rules', () => {
  beforeEach(() => {
    stripe.paymentIntents.create.mockClear();
  });

  it('creates a payment intent for a valid anonymous tip', async () => {
    const worker = await createReadyWorker('1');
    const res = await request(app)
      .post('/api/tips/create-intent')
      .send({ username: worker.username, amount: 50 });

    expect(res.status).toBe(201);
    expect(res.body.clientSecret).toBe('secret_123');
    // 6% of 5000 + 400 = 700
    expect(res.body.platformFee).toBe(700);
    expect(res.body.netAmount).toBe(5000 - 700);
  });

  it('rejects a tip to an unknown worker with 404, not 500', async () => {
    const res = await request(app)
      .post('/api/tips/create-intent')
      .send({ username: 'nobody-registered', amount: 50 });
    expect(res.status).toBe(404);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('rejects a tip below the minimum amount with 400', async () => {
    const worker = await createReadyWorker('2');
    const res = await request(app)
      .post('/api/tips/create-intent')
      .send({ username: worker.username, amount: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects a tip to a worker who has not finished Stripe onboarding', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Trabajador Incompleto',
      email: 'incompleto@example.com',
      phone: '5551112222',
      password: 'password123',
    });
    await request(app)
      .post('/api/workers/register')
      .set('Authorization', `Bearer ${registerRes.body.token}`)
      .send({ username: 'incompletoworker' });

    const res = await request(app)
      .post('/api/tips/create-intent')
      .send({ username: 'incompletoworker', amount: 50 });

    expect(res.status).toBe(400);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('a logged-in worker cannot tip themselves', async () => {
    const worker = await createReadyWorker('3');
    const res = await request(app)
      .post('/api/tips/create-intent')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ username: worker.username, amount: 50 });
    expect(res.status).toBe(400);
  });
});

describe('markTransactionSucceeded — idempotency (money-moving operation)', () => {
  it('only credits the worker once, even if called twice concurrently', async () => {
    const worker = await createReadyWorker('4');
    const user = await User.findById(worker.userId);
    const transaction = await Transaction.create({
      worker: user.worker,
      amount: 5000,
      platformFee: 700,
      netAmount: 4300,
      stripePaymentIntentId: 'pi_idempotency_test',
      status: 'pending',
    });

    // Simulates Stripe's webhook and the client's own confirm() call
    // landing at nearly the same time (documented race in the code).
    await Promise.all([
      markTransactionSucceeded(transaction._id),
      markTransactionSucceeded(transaction._id),
    ]);

    const workerDoc = await Worker.findById(user.worker);
    expect(workerDoc.tipCount).toBe(1);
    expect(workerDoc.totalReceived).toBe(4300);

    const finalTransaction = await Transaction.findById(transaction._id);
    expect(finalTransaction.status).toBe('succeeded');
  });

  it('does nothing on a transaction that is already succeeded', async () => {
    const worker = await createReadyWorker('5');
    const user = await User.findById(worker.userId);
    const transaction = await Transaction.create({
      worker: user.worker,
      amount: 2000,
      platformFee: 520,
      netAmount: 1480,
      stripePaymentIntentId: 'pi_already_done',
      status: 'succeeded',
    });
    await Worker.findByIdAndUpdate(user.worker, { tipCount: 1, totalReceived: 1480 });

    const result = await markTransactionSucceeded(transaction._id);

    expect(result).toBeNull();
    const workerDoc = await Worker.findById(user.worker);
    expect(workerDoc.tipCount).toBe(1); // unchanged, not double-counted
    expect(workerDoc.totalReceived).toBe(1480);
  });
});
