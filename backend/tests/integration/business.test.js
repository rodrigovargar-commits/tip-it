const request = require('supertest');
const crypto = require('crypto');

jest.mock('../../src/config/stripe', () => ({}));

const app = require('../../src/app');
const User = require('../../src/models/User');
const Worker = require('../../src/models/Worker');
const Business = require('../../src/models/Business');
const Location = require('../../src/models/Location');
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
    const [main] = res.body.business.locations;
    expect(res.body.business.locations).toHaveLength(1);
    expect(main.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(main.codeText).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(main.joinUrl).toContain(`/negocio/unirme?c=${main.code}`);

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
    return { owner, member, code: created.body.business.locations[0].code };
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
    const blocked = await request(app).post('/api/business/join').set(member.auth).send({ code: second.body.business.locations[0].code, accept: true });
    expect(blocked.status).toBe(409);

    await request(app).post('/api/business/leave').set(member.auth);
    const ok = await request(app).post('/api/business/join').set(member.auth).send({ code: second.body.business.locations[0].code, accept: true });
    expect(ok.status).toBe(200);
  });
});

describe('owner portal', () => {
  async function team() {
    const owner = await makeUser('Dueño Uno');
    const created = await request(app).post('/api/business').set(owner.auth).send({ name: 'Barbería La Navaja' });
    const a = await makeUser('Ana Barbera', { worker: true });
    const b = await makeUser('Beto Barbero', { worker: true });
    const code = created.body.business.locations[0].code;
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
    const reviews = await request(app).get('/api/business/reviews').set(a.auth);
    expect(reviews.status).toBe(404);
    const overview = await request(app).get('/api/business/overview').set(a.auth);
    expect(overview.status).toBe(200);
    expect(overview.body.business).toBeNull(); // nothing about anyone else's team
    expect(overview.body.members).toBeUndefined();
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

  it('rotating a team code invalidates the old one but keeps the people', async () => {
    const { owner, b, code, business } = await team();
    const id = business.locations[0].id;
    const res = await request(app).post(`/api/business/locations/${id}/code/rotate`).set(owner.auth);
    expect(res.body.location.code).not.toBe(code);
    expect(res.body.location.memberCount).toBe(2);
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


describe('several teams or places in one business', () => {
  async function chain() {
    const owner = await makeUser('Dueña Cadena');
    const created = await request(app).post('/api/business').set(owner.auth).send({ name: 'Cafés Cadena' });
    const centro = created.body.business.locations[0];
    await request(app).patch(`/api/business/locations/${centro.id}`).set(owner.auth).send({ name: 'Centro' });
    const norte = (await request(app).post('/api/business/locations').set(owner.auth).send({ name: 'Norte' })).body.location;
    const a = await makeUser('Ana Centro', { worker: true });
    const b = await makeUser('Beto Norte', { worker: true });
    const c = await makeUser('Caro Norte', { worker: true });
    await request(app).post('/api/business/join').set(a.auth).send({ code: centro.code, accept: true });
    await request(app).post('/api/business/join').set(b.auth).send({ code: norte.code, accept: true });
    await request(app).post('/api/business/join').set(c.auth).send({ code: norte.code, accept: true });
    const [wa, wb, wc] = await Promise.all([a, b, c].map((x) => Worker.findById(x.user.worker)));
    return { owner, a, b, c, wa, wb, wc, centro, norte };
  }

  it('gives each team its own name and code, and shows the team when joining', async () => {
    const { owner, norte, a } = await chain();
    expect(norte.code).toMatch(/^[A-Z2-9]{8}$/);
    const me = await request(app).get('/api/business/me').set(owner.auth);
    expect(me.body.business.locations.map((l) => l.name).sort()).toEqual(['Centro', 'Norte']);
    expect(me.body.business.locations.find((l) => l.name === 'Norte').memberCount).toBe(2);
    const lookup = await request(app).get(`/api/business/lookup?code=${norte.code}`).set(a.auth);
    expect(lookup.body.business).toEqual({ name: 'Cafés Cadena', location: 'Norte' });
    const ms = await request(app).get('/api/business/membership').set(a.auth);
    expect(ms.body.business.location).toBe('Centro');
  });

  it('compares the teams side by side, adding up the exact numbers', async () => {
    const { owner, wa, wb, wc } = await chain();
    await addTip(wa, { rating: 5 });
    await addTip(wb, { rating: 4, review: 'Bien' });
    await addTip(wb, { rating: 2 });
    await addTip(wc, { rating: 5 });
    await Worker.findByIdAndUpdate(wa._id, { tipCount: 1, ratingSum: 5, ratingCount: 1 });
    await Worker.findByIdAndUpdate(wb._id, { tipCount: 2, ratingSum: 6, ratingCount: 2 });
    await Worker.findByIdAndUpdate(wc._id, { tipCount: 1, ratingSum: 5, ratingCount: 1 });

    const res = await request(app).get('/api/business/overview?days=30').set(owner.auth);
    const centro = res.body.locations.find((l) => l.name === 'Centro');
    const norte = res.body.locations.find((l) => l.name === 'Norte');
    expect(centro).toMatchObject({ members: 1, period: { tips: 1, rating: 5, reviews: 0 } });
    expect(norte).toMatchObject({ members: 2, period: { tips: 3, rating: 3.7, reviews: 1 } }); // (4+2+5)/3
    expect(res.body.totals.period.tips).toBe(4);
    expect(res.body.totals.members).toBe(3);
    expect(JSON.stringify(res.body)).not.toMatch(/netCents|amount|totalReceived|email/i);
  });

  it('can focus on one team, in the numbers and in the reviews', async () => {
    const { owner, wa, wb, norte, centro } = await chain();
    await addTip(wa, { rating: 5, review: 'Excelente' });
    await addTip(wb, { rating: 3, review: 'Normal' });
    const only = await request(app).get(`/api/business/overview?location=${norte.id}`).set(owner.auth);
    expect(only.body.members.every((m) => m.location.name === 'Norte')).toBe(true);
    expect(only.body.totals.period.tips).toBe(1);
    expect(only.body.locations).toHaveLength(2); // the comparison still lists every team
    const reviews = await request(app).get(`/api/business/reviews?location=${centro.id}`).set(owner.auth);
    expect(reviews.body.reviews).toHaveLength(1);
    expect(reviews.body.reviews[0].member.location).toBe('Centro');
  });

  it('moves people between teams, only inside the business', async () => {
    const { owner, wa, norte } = await chain();
    const other = await makeUser('Otro Dueño');
    await request(app).post('/api/business').set(other.auth).send({ name: 'Otro' });
    const otherLoc = (await request(app).get('/api/business/me').set(other.auth)).body.business.locations[0];
    const bad = await request(app).patch(`/api/business/members/${wa._id}`).set(owner.auth).send({ locationId: otherLoc.id });
    expect(bad.status).toBe(404);
    const ok = await request(app).patch(`/api/business/members/${wa._id}`).set(owner.auth).send({ locationId: norte.id });
    expect(ok.status).toBe(200);
    expect(String((await Worker.findById(wa._id)).location)).toBe(String(norte.id));
  });

  it('renames, and only deletes an empty team while keeping at least one', async () => {
    const { owner, centro, norte } = await chain();
    const busy = await request(app).delete(`/api/business/locations/${norte.id}`).set(owner.auth);
    expect(busy.status).toBe(409);
    const extra = (await request(app).post('/api/business/locations').set(owner.auth).send({ name: 'Sur' })).body.location;
    expect((await request(app).delete(`/api/business/locations/${extra.id}`).set(owner.auth)).status).toBe(200);
    await request(app).delete(`/api/business/members/${(await Worker.findOne({ location: centro.id }))._id}`).set(owner.auth);
    expect((await request(app).delete(`/api/business/locations/${centro.id}`).set(owner.auth)).status).toBe(200);
    // Norte still has people and is the last one: it can never be deleted.
    expect((await request(app).delete(`/api/business/locations/${norte.id}`).set(owner.auth)).status).toBe(409);
  });

  it('lets a person switch teams inside the same business but not join another business', async () => {
    const { a, norte } = await chain();
    const sw = await request(app).post('/api/business/join').set(a.auth).send({ code: norte.code, accept: true });
    expect(sw.status).toBe(200);
    expect(sw.body.business.location).toBe('Norte');
    const stranger = await makeUser('Dueño Ajeno');
    const biz = await request(app).post('/api/business').set(stranger.auth).send({ name: 'Ajeno' });
    const blocked = await request(app)
      .post('/api/business/join').set(a.auth).send({ code: biz.body.business.locations[0].code, accept: true });
    expect(blocked.status).toBe(409);
  });

  it('keeps the owner routes private to the owner', async () => {
    const { b, norte } = await chain();
    expect((await request(app).post('/api/business/locations').set(b.auth).send({ name: 'Mío' })).status).toBe(404);
    expect((await request(app).post(`/api/business/locations/${norte.id}/code/rotate`).set(b.auth)).status).toBe(404);
  });

  it('turns a business made before teams existed into one "Principal" team without losing anyone', async () => {
    const owner = await makeUser('Dueño Antiguo');
    const member = await makeUser('Persona Antigua', { worker: true });
    const business = await Business.create({ name: 'Negocio viejo', owner: owner.user._id, code: 'ABCD2345' });
    await User.findByIdAndUpdate(owner.user._id, { ownedBusiness: business._id });
    await Worker.findByIdAndUpdate(member.user.worker, { business: business._id, businessJoinedAt: new Date() });

    const me = await request(app).get('/api/business/me').set(owner.auth);
    expect(me.body.business.locations).toHaveLength(1);
    expect(me.body.business.locations[0]).toMatchObject({ name: 'Principal', code: 'ABCD2345', memberCount: 1 });
    expect(await Location.countDocuments({})).toBe(1);
    // the old code keeps working for new people
    const newbie = await makeUser('Nueva Persona', { worker: true });
    const joined = await request(app).post('/api/business/join').set(newbie.auth).send({ code: 'ABCD2345', accept: true });
    expect(joined.status).toBe(200);
  });
});

describe('limits and health', () => {
  it('caps the number of teams per business', async () => {
    const owner = await makeUser('Dueño Muchos');
    const created = await request(app).post('/api/business').set(owner.auth).send({ name: 'Muchos' });
    const businessId = created.body.business.id;
    const docs = Array.from({ length: 49 }, (_, i) => ({ business: businessId, name: `Equipo ${i + 2}`, code: `ZZ${String(i).padStart(2, '0')}2345`.slice(0, 8) }));
    await Location.insertMany(docs);
    const over = await request(app).post('/api/business/locations').set(owner.auth).send({ name: 'Uno más' });
    expect(over.status).toBe(409);
  });

  it('reports the deployed version on /api/health', async () => {
    process.env.RENDER_GIT_COMMIT = 'abcdef1234567890';
    const res = await request(app).get('/api/health');
    expect(res.body.version).toBe('abcdef1');
    delete process.env.RENDER_GIT_COMMIT;
  });
});
