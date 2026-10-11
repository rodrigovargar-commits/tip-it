const request = require('supertest');

jest.mock('../../src/config/stripe', () => ({
  paymentIntents: {
    create: jest.fn().mockResolvedValue({ id: 'pi_rec_1', client_secret: 'secret' }),
    retrieve: jest.fn().mockResolvedValue({ id: 'pi_rec_1', status: 'succeeded' }),
  },
}));

const app = require('../../src/app');
const User = require('../../src/models/User');
const Worker = require('../../src/models/Worker');
const Recognition = require('../../src/models/Recognition');
const Transaction = require('../../src/models/Transaction');

const ADMIN = 'test-admin-key';
process.env.ADMIN_STATS_KEY = ADMIN;

async function makeWorker(extra = {}) {
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Rafa García Legal',
    email: 'rafa@example.com',
    phone: '5551112222',
    password: 'password123',
  });
  await request(app)
    .post('/api/workers/register')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ username: 'rafa', ...extra });
  const user = await User.findOne({ email: 'rafa@example.com' });
  await Worker.findByIdAndUpdate(user.worker, { stripeAccountId: 'acct_x', stripeOnboardingComplete: true });
  return { token: reg.body.token, user };
}

describe('profile fields on sign-up', () => {
  it('stores activity, occupation and a public name, and shows the public name', async () => {
    await makeWorker({ publicName: 'Rafa', activity: 'barberia', occupation: 'Barbero', establishment: 'La Navaja' });
    const res = await request(app).get('/api/workers/rafa');
    expect(res.body.worker.name).toBe('Rafa');
    expect(res.body.worker.activity).toBe('barberia');
    expect(res.body.worker.occupation).toBe('Barbero');
    expect(res.body.worker.establishment).toBe('La Navaja');
  });

  it('rejects an activity that is not in the catalog', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'A', email: 'a@example.com', phone: '5551112222', password: 'password123',
    });
    const res = await request(app)
      .post('/api/workers/register')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ username: 'aaa', activity: 'hacker' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/workers/:username/recognitions', () => {
  it('accepts a thank-you with stars and a comment, as pending', async () => {
    await makeWorker();
    const res = await request(app).post('/api/workers/rafa/recognitions').send({ rating: 5, comment: 'Excelente' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });

  it('does not show it publicly until approved, and never counts it in the average', async () => {
    await makeWorker();
    await request(app).post('/api/workers/rafa/recognitions').send({ rating: 5, comment: 'Excelente', alias: 'Luis' });
    let profile = await request(app).get('/api/workers/rafa');
    expect(profile.body.worker.reviews).toHaveLength(0);

    const rec = await Recognition.findOne({});
    const approve = await request(app).get(`/api/admin/recognitions/${rec._id}/approve?key=${ADMIN}`);
    expect(approve.body.status).toBe('published');

    profile = await request(app).get('/api/workers/rafa');
    expect(profile.body.worker.reviews).toHaveLength(1);
    expect(profile.body.worker.reviews[0]).toMatchObject({ source: 'unpaid', clientName: 'Luis', rating: 5 });
    expect(profile.body.worker.rating).toBe(0);
    expect(profile.body.worker.ratingCount).toBe(0);
  });

  it('shows the author as Anónimo by default', async () => {
    await makeWorker();
    await request(app).post('/api/workers/rafa/recognitions').send({ comment: 'Gracias' });
    await Recognition.updateMany({}, { status: 'published' });
    const profile = await request(app).get('/api/workers/rafa');
    expect(profile.body.worker.reviews[0].clientName).toBe('Anónimo');
  });

  it('lets a plain thank-you through only when it is explicit', async () => {
    await makeWorker();
    const empty = await request(app).post('/api/workers/rafa/recognitions').send({});
    expect(empty.status).toBe(400);
    const thanks = await request(app).post('/api/workers/rafa/recognitions').send({ thanks: true });
    expect(thanks.status).toBe(201);
  });

  it.each([
    ['0 stars and nothing else', { rating: 0 }, 400],
    ['6 stars', { rating: 6, comment: 'x' }, 400],
    ['comment over 200', { comment: 'a'.repeat(201) }, 400],
  ])('rejects %s', async (_l, body, status) => {
    await makeWorker();
    const res = await request(app).post('/api/workers/rafa/recognitions').send(body);
    expect(res.status).toBe(status);
  });

  it('a repeat from the same sender within a day returns the first one, not a second', async () => {
    await makeWorker();
    await request(app).post('/api/workers/rafa/recognitions').send({ comment: 'Uno' });
    const again = await request(app).post('/api/workers/rafa/recognitions').send({ comment: 'Dos' });
    expect(again.status).toBe(200);
    expect(await Recognition.countDocuments({})).toBe(1);
  });

  it('silently ignores the honeypot field, saving nothing', async () => {
    await makeWorker();
    const res = await request(app).post('/api/workers/rafa/recognitions').send({ comment: 'spam', website: 'http://x' });
    expect(res.status).toBe(201);
    expect(await Recognition.countDocuments({})).toBe(0);
  });

  it('404s for a person who does not exist', async () => {
    const res = await request(app).post('/api/workers/nadie/recognitions').send({ comment: 'x' });
    expect(res.status).toBe(404);
  });

  it('escapes nothing itself but stores plain text only, never creating a payment', async () => {
    await makeWorker();
    await request(app).post('/api/workers/rafa/recognitions').send({ comment: '<script>alert(1)</script>' });
    expect(await Transaction.countDocuments({})).toBe(0);
    const rec = await Recognition.findOne({});
    expect(rec.comment).toBe('<script>alert(1)</script>'); // stored verbatim; React escapes on display
  });

  it('admin moderation needs the key', async () => {
    const res = await request(app).get('/api/admin/recognitions');
    expect(res.status).toBe(401);
  });
});

describe('paid reviews', () => {
  it('shows the payer as Anónimo, or with the nickname they chose, never their real name', async () => {
    const { user } = await makeWorker();
    const worker = await Worker.findById(user.worker);
    const base = { worker: worker._id, amount: 5000, platformFee: 700, netAmount: 4300, status: 'succeeded', rating: 5 };
    await Transaction.create({ ...base, stripePaymentIntentId: 'pi_a', review: 'Muy bien' });
    await Transaction.create({ ...base, stripePaymentIntentId: 'pi_b', review: 'Genial', reviewAlias: 'Caro' });
    const res = await request(app).get('/api/workers/rafa');
    const names = res.body.worker.reviews.map((r) => r.clientName).sort();
    expect(names).toEqual(['Anónimo', 'Caro']);
    expect(res.body.worker.reviews.every((r) => r.source === 'paid')).toBe(true);
  });

  it('keeps a review to 200 characters on confirm and saves the nickname', async () => {
    const { user } = await makeWorker();
    const worker = await Worker.findById(user.worker);
    await Transaction.create({
      worker: worker._id, amount: 5000, platformFee: 700, netAmount: 4300, status: 'succeeded', stripePaymentIntentId: 'pi_rec_1',
    });
    const tooLong = await request(app).post('/api/tips/confirm').send({ paymentIntentId: 'pi_rec_1', review: 'a'.repeat(201) });
    expect(tooLong.status).toBe(400);
    const ok = await request(app).post('/api/tips/confirm').send({ paymentIntentId: 'pi_rec_1', rating: 4, review: 'Bien', alias: 'Caro' });
    expect(ok.status).toBe(200);
    expect((await Transaction.findOne({ stripePaymentIntentId: 'pi_rec_1' })).reviewAlias).toBe('Caro');
  });
});
