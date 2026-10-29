const request = require('supertest');
const crypto = require('crypto');

jest.mock('../../src/config/stripe', () => ({}));

const app = require('../../src/app');
const User = require('../../src/models/User');
const Worker = require('../../src/models/Worker');
const Business = require('../../src/models/Business');
const Transaction = require('../../src/models/Transaction');
const Recognition = require('../../src/models/Recognition');
const { normalizeBusinessCode, generateBusinessCode } = require('../../src/utils/businessCode');

let counter = 0;
async function makeUser(name, { worker = false } = {}) {
  counter += 1;
  const reg = await request(app).post('/api/auth/register').send({
    name,
    email: `u${counter}@example.com`,
    phone: `55500000${String(counter).padStart(2, '0')}`,
    password: 'password123',
  });
  if (worker) {
    await request(app)
      .post('/api/workers/register')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ username: `persona${counter}` });
  }
  const user = await User.findOne({ email: `u${counter}@example.com` });
  return { token: reg.body.token, user, auth: { Authorization: `Bearer ${reg.body.token}` } };
}

async function addTip(worker, { amount = 5000, net = 4300, rating = null, review = '', alias = '' } = {}) {
  return Transaction.create({
    worker: worker._id,
    amount,
    netAmount: net,
    stripePaymentIntentId: `pi_${crypto.randomBytes(6).toString('hex')}`,
    status: 'succeeded',
    rating,
    review,
    reviewAlias: alias,
  });
}

describe('business code helpers', () => {
  it('normalizes with or without dash and rejects ambiguous characters', () => {
    expect(normalizeBusinessCode('abcd-2345')).toBe('ABCD2345');
    expect(normalizeBusinessCode('ABCD 2345')).toBe('ABCD2345');
    expect(normalizeBusinessCode('ABCD234')).toBeNull();
    expect(normalizeBusinessCode('ABCD234O')).toBeNull(); // letter O is not in the alphabet
  });
  it('generates 8 valid characters', () => {
    const code = generateBusinessCode();
    expect(normalizeBusinessCode(code)).toBe(code);
  });
});

describe('creating a business', () => {
  it('lets a signed-in person create one and returns the code and join link', async () => {
    const owner = await makeUser('Dueño Uno');
    const res = await request(app).post('/api/business').set(owner.auth).send({ name: 'Barbería La Navaja' });
    expect(res.status).toBe(201);
    expect(res.body.business.name).toBe('Barbería La Navaja');
    expect(res.body.business.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(res.body.business.codeText).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(res.body.business.joinUrl).toContain(`/negocio/unirme?c=${res.body.business.code}`);

    const me = await request(app).get('/api/users/me').set(owner.auth);
    expect(me.body.user.ownsBusiness).toBe(true);
  });

  it('allows only one business per owner and requires a name', async () => {
    const owner = await makeUser('Dueño Uno');
    expect((await request(app).post('/api/business').set(owner.auth).send({ name: 'A' })).status).toBe(400);
    await request(app).post('/api/business').set(owner.auth).send({ name: 'Mi negocio' });
    const again = await request(app).post('/api/business').set(owner.auth).send({ name: 'Otro negocio' });
    expect(again.status).toBe(409);
  });

  it('answers 409, not a server error, when two creations arrive at the same time', async () => {
    const owner = await makeUser('Dueño Doble');
    const [a, b] = await Promise.all([
      request(app).post('/api/business').set(owner.auth).send({ name: 'Mi negocio' }),
      request(app).post('/api/business').set(owner.auth).send({ name: 'Mi negocio' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await Business.countDocuments({})).toBe(1);
  });

  it('requires a login', async () => {
    const res = await request(app).post('/api/business').send({ name: 'Mi negocio' });
    expect(res.status).toBe(401);
  });

  it('answers /me with null when there is no business', async () => {
    const owner = await makeUser('Sin Negocio');
    const res = await request(app).get('/api/business/me').set(owner.auth);
    expect(res.body.business).toBeNull();
  });
});

describe('joining with the code', () => {
  async function setup() {
    const owner = await makeUser('Dueño Uno');
    const created = await request(app).post('/api/business').set(owner.auth).send({ name: 'Clínica Sonrisa' });
    const member = await makeUser('Persona Uno', { worker: true });
    return { owner, member, code: created.body.business.code };
  }

  it('shows the business name for a code before joining', async () => {
    const { member, code } = await setup();
    const ok = await request(app).get(`/api/business/lookup?code=${code.slice(0, 4)}-${code.slice(4)}`).set(member.auth);
    expect(ok.status).toBe(200);
    expect(ok.body.business.name).toBe('Clínica Sonrisa');
    const bad = await request(app).get('/api/business/lookup?code=ZZZZ-ZZZZ').set(member.auth);
    expect(bad.status).toBe(404);
  });

  it('requires explicit consent to share the numbers', async () => {
    const { member, code } = await setup();
    const res = await request(app).post('/api/business/join').set(member.auth).send({ code });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/aceptar/);
  });

  it('joins, is idempotent, and shows the membership', async () => {
    const { member, code } = await setup();
    const join = await request(app).post('/api/business/join').set(member.auth).send({ code, accept: true });
    expect(join.status).toBe(200);
    expect(join.body.business.name).toBe('Clínica Sonrisa');
    const again = await request(app).post('/api/business/join').set(member.auth).send({ code, accept: true });
    expect(again.status).toBe(200);

    const ms = await request(app).get('/api/business/membership').set(member.auth);
    expect(ms.body.business.name).toBe('Clínica Sonrisa');
  });

  it('rejects an invalid code and people without a tip account', async () => {
    const { member } = await setup();
    const bad = await request(app).post('/api/business/join').set(member.auth).send({ code: 'ZZZZ-ZZZZ', accept: true });
    expect(bad.status).toBe(404);
    const plain = await makeUser('Solo Paga');
    const { code } = await setup().catch(() => ({}));
    const noWorker = await request(app).post('/api/business/join').set(plain.auth).send({ code: code || 'ABCD2345', accept: true });
    expect(noWorker.status).toBe(403);
  });

  it('does not let a person be in two businesses at once, and lets them leave', async () => {
    const { member, code } = await setup();
    await request(app).post('/api/business/join').set(member.auth).send({ code, accept: true });
    const owner2 = await makeUser('Dueño Dos');
    const second = await request(app).post('/api/business').set(owner2.auth).send({ name: 'Otro lugar' });
    const blocked = await request(app).post('/api/business/join').set(member.auth).send({ code: second.body.business.code, accept: true });
    expect(blocked.status).toBe(409);

    await request(app).post('/api/business/leave').set(member.auth);
    const ok = await request(app).post('/api/business/join').set(member.auth).send({ code: second.body.business.code, accept: true });
    expect(ok.status).toBe(200);
  });
});

describe('owner portal', () => {
  async function team() {
    const owner = await makeUser('Dueño Uno');
    const created = await request(app).post('/api/business').set(owner.auth).send({ name: 'Barbería La Navaja' });
    const a = await makeUser('Ana Barbera', { worker: true });
    const b = await makeUser('Beto Barbero', { worker: true });
    const code = created.body.business.code;
    await request(app).post('/api/business/join').set(a.auth).send({ code, accept: true });
    await request(app).post('/api/business/join').set(b.auth).send({ code, accept: true });
    const wa = await Worker.findById(a.user.worker);
    const wb = await Worker.findById(b.user.worker);
    return { owner, a, b, wa, wb, code, business: created.body.business };
  }

  it('summarizes tips, rating and reviews per person and for the team', async () => {
    const { owner, wa, wb } = await team();
    await addTip(wa, { net: 4300, rating: 5, review: 'Excelente corte', alias: 'Luis' });
    await addTip(wa, { net: 8600, rating: 4 });
    await addTip(wb, { net: 4300, rating: 3, review: 'Normal' });
    await Worker.findByIdAndUpdate(wa._id, { tipCount: 2, totalReceived: 12900, ratingSum: 9, ratingCount: 2 });
    await Worker.findByIdAndUpdate(wb._id, { tipCount: 1, totalReceived: 4300, ratingSum: 3, ratingCount: 1 });
    await Recognition.create({ worker: wb._id, rating: 5, comment: 'Gracias', status: 'published', senderHash: 'h1' });
    await Recognition.create({ worker: wb._id, rating: 1, comment: 'Pendiente', status: 'pending', senderHash: 'h2' });

    const res = await request(app).get('/api/business/overview?days=30').set(owner.auth);
    expect(res.status).toBe(200);
    expect(res.body.totals.members).toBe(2);
    expect(res.body.totals.period.tips).toBe(3);
    expect(res.body.totals.period.reviews).toBe(3); // two payments with words + one published thank-you
    expect(res.body.totals.pendingReviews).toBe(1);
    const ana = res.body.members.find((m) => m.username === wa.username);
    expect(ana.period.tips).toBe(2);
    expect(ana.period.rating).toBe(4.5);
    expect(ana.total.tips).toBe(2);
    expect(res.body.members[0].username).toBe(wa.username); // most tips first
    // The business sees counts, stars and reviews, never money.
    expect(JSON.stringify(res.body)).not.toMatch(/netCents|amount|totalReceived|stripeAccountId|password|email/i);
  });

  it('lists reviews with filters and never exposes pending ones', async () => {
    const { owner, wa, wb } = await team();
    await addTip(wa, { rating: 5, review: 'Excelente corte', alias: 'Luis' });
    await addTip(wb, { rating: 3, review: 'Normal' });
    await Recognition.create({ worker: wb._id, rating: 5, comment: 'Gracias', status: 'published', senderHash: 'h1' });
    await Recognition.create({ worker: wb._id, rating: 1, comment: 'Pendiente', status: 'pending', senderHash: 'h2' });

    const all = await request(app).get('/api/business/reviews').set(owner.auth);
    expect(all.status).toBe(200);
    expect(all.body.reviews).toHaveLength(3);
    expect(all.body.reviews.some((r) => r.text === 'Pendiente')).toBe(false);
    const paid = all.body.reviews.find((r) => r.text === 'Excelente corte');
    expect(paid.kind).toBe('paid');
    expect(paid.author).toBe('Luis');
    expect(paid.member.username).toBe(wa.username);
    expect(JSON.stringify(all.body)).not.toMatch(/tipCents|amount|netAmount/i);

    const onlyBeto = await request(app).get(`/api/business/reviews?member=${wb.username}`).set(owner.auth);
    expect(onlyBeto.body.reviews.every((r) => r.member.username === wb.username)).toBe(true);
    const fiveStars = await request(app).get('/api/business/reviews?stars=5').set(owner.auth);
    expect(fiveStars.body.reviews.every((r) => r.rating === 5)).toBe(true);
  });

  it('keeps everything private: a non-owner gets 404 and sees nothing of the team', async () => {
    const { a } = await team();
    for (const path of ['/api/business/overview', '/api/business/reviews']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get(path).set(a.auth);
      expect(res.status).toBe(404);
    }
    const other = await makeUser('Otro Dueño');
    await request(app).post('/api/business').set(other.auth).send({ name: 'Otro negocio' });
    const res = await request(app).get('/api/business/overview').set(other.auth);
    expect(res.body.members).toEqual([]);
  });

  it('lets the owner remove a person, and only from their own team', async () => {
    const { owner, a, wa } = await team();
    const other = await makeUser('Otro Dueño');
    await request(app).post('/api/business').set(other.auth).send({ name: 'Otro negocio' });
    const foreign = await request(app).delete(`/api/business/members/${wa._id}`).set(other.auth);
    expect(foreign.status).toBe(404);

    const ok = await request(app).delete(`/api/business/members/${wa._id}`).set(owner.auth);
    expect(ok.status).toBe(200);
    const ms = await request(app).get('/api/business/membership').set(a.auth);
    expect(ms.body.business).toBeNull();
  });

  it('rotating the code invalidates the old one but keeps the team', async () => {
    const { owner, b, code } = await team();
    const res = await request(app).post('/api/business/code/rotate').set(owner.auth);
    expect(res.body.business.code).not.toBe(code);
    expect(res.body.business.memberCount).toBe(2);
    const lookup = await request(app).get(`/api/business/lookup?code=${code}`).set(b.auth);
    expect(lookup.status).toBe(404);
  });

  it('erasing the owner account releases the team and closes the business', async () => {
    const { owner, a } = await team();
    const res = await request(app).delete('/api/users/me').set(owner.auth);
    expect(res.status).toBe(200);
    expect(await Business.countDocuments({})).toBe(0);
    const ms = await request(app).get('/api/business/membership').set(a.auth);
    expect(ms.body.business).toBeNull();
  });
});
