const request = require('supertest');
const crypto = require('crypto');

jest.mock('../../src/config/stripe', () => ({
  paymentIntents: {
    create: jest.fn().mockImplementation(async () => ({ id: `pi_${Math.random().toString(36).slice(2)}`, client_secret: 'secret' })),
  },
}));

const app = require('../../src/app');
const User = require('../../src/models/User');
const Worker = require('../../src/models/Worker');
const Qr = require('../../src/models/Qr');
const Membership = require('../../src/models/Membership');
const Business = require('../../src/models/Business');
const Transaction = require('../../src/models/Transaction');
const Recognition = require('../../src/models/Recognition');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
let n = 0;
async function makeUser(name, { worker = false } = {}) {
  n += 1;
  const reg = await request(app).post('/api/auth/register').send({
    name, email: `e${n}@example.com`, phone: `55522222${String(n).padStart(2, '0')}`, password: 'password123',
  });
  const auth = { Authorization: `Bearer ${reg.body.token}` };
  if (worker) {
    await request(app).post('/api/workers/register').set(auth).send({ username: `pers${n}` });
    const u = await User.findOne({ email: `e${n}@example.com` });
    await Worker.findByIdAndUpdate(u.worker, { stripeAccountId: 'acct_x', stripeOnboardingComplete: true });
  }
  const user = await User.findOne({ email: `e${n}@example.com` });
  return { auth, user, workerId: user.worker };
}

async function tip(workerId, { at = new Date(), qr = null, rating = null, review = '' } = {}) {
  return Transaction.create({
    worker: workerId, amount: 5000, netAmount: 4300, status: 'succeeded', rating, review, qr,
    stripePaymentIntentId: `pi_${crypto.randomBytes(6).toString('hex')}`, createdAt: at,
  });
}

async function business(ownerName = 'Dueño') {
  const owner = await makeUser(ownerName);
  const created = await request(app).post('/api/business').set(owner.auth).send({ name: 'Cafetería Luna', acceptTerms: true });
  return { owner, loc: created.body.business.locations[0] };
}

const overview = (owner, q = '') => request(app).get(`/api/business/overview${q}`).set(owner.auth);

describe('the business only sees what happened after the person joined', () => {
  it('ignores tips and comments from before the day they enrolled', async () => {
    const { owner, loc } = await business();
    const p = await makeUser('Ana', { worker: true });
    await tip(p.workerId, { at: new Date(Date.now() - 10 * DAY), rating: 1, review: 'Antes de entrar' });
    await Recognition.create({ worker: p.workerId, rating: 1, comment: 'Comentario viejo', status: 'published', senderHash: 'h0', createdAt: new Date(Date.now() - 5 * DAY) });

    const join = await request(app).post('/api/business/join').set(p.auth).send({ code: loc.code, accept: true });
    expect(join.status).toBe(200);
    await tip(p.workerId, { at: new Date(Date.now() + 1000), rating: 5, review: 'Después de entrar' });

    const res = await overview(owner, '?days=365');
    const ana = res.body.members[0];
    expect(ana.total).toMatchObject({ tips: 1, rating: 5, reviews: 1 });
    expect(res.body.totals.period.tips).toBe(1);

    const reviews = await request(app).get('/api/business/reviews').set(owner.auth);
    expect(reviews.body.reviews.map((r) => r.text)).toEqual(['Después de entrar']);
  });

  it('shows nothing of a person who leaves, and keeps nothing counting after they are removed', async () => {
    const { owner, loc } = await business();
    const p = await makeUser('Beto', { worker: true });
    const join = await request(app).post('/api/business/join').set(p.auth).send({ code: loc.code, accept: true });
    await tip(p.workerId, { at: new Date(Date.now() + 1000) });
    expect((await overview(owner)).body.members).toHaveLength(1);
    await request(app).post('/api/business/leave').set(p.auth).send({ membershipId: join.body.membership.id });
    expect((await overview(owner)).body.members).toHaveLength(0);
  });
});

describe('every enrollment gives a QR of the company next to the personal one', () => {
  it('creates a company QR on joining and lists both, pointing to the same profile and account', async () => {
    const { loc } = await business();
    const p = await makeUser('Caro', { worker: true });
    const join = await request(app).post('/api/business/join').set(p.auth).send({ code: loc.code, accept: true });
    expect(join.body.membership.qr.name).toBe('Cafetería Luna');
    expect(join.body.membership.qr.image).toMatch(/^data:image\/png/);

    const list = await request(app).get('/api/qrs').set(p.auth);
    expect(list.body.qrs.map((q) => q.name)).toEqual(['QR personal', 'Cafetería Luna']);
    const [main, company] = list.body.qrs;
    expect(main.url).toMatch(/\/p\/pers\d+$/);
    expect(company.url).toBe(`${main.url}?q=${company.code}`); // same profile, its own code
  });

  it('lets a person make more QRs of their own, rename and archive them, up to ten', async () => {
    const p = await makeUser('Dani', { worker: true });
    const made = await request(app).post('/api/qrs').set(p.auth).send({ name: 'Terraza' });
    expect(made.status).toBe(201);
    expect(made.body.qr.url).toContain(`?q=${made.body.qr.code}`);
    expect((await request(app).patch(`/api/qrs/${made.body.qr.id}`).set(p.auth).send({ name: 'Terraza norte' })).status).toBe(200);
    expect((await request(app).delete(`/api/qrs/${made.body.qr.id}`).set(p.auth)).status).toBe(200);
    expect((await request(app).get('/api/qrs').set(p.auth)).body.qrs).toHaveLength(1); // only the main one is left
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect((await request(app).post('/api/qrs').set(p.auth).send({ name: `QR ${i + 1}` })).status).toBe(201);
    }
    expect((await request(app).post('/api/qrs').set(p.auth).send({ name: 'Uno más' })).status).toBe(409);
  });

  it('does not let a company QR be archived or renamed by hand', async () => {
    const { loc } = await business();
    const p = await makeUser('Eli', { worker: true });
    const join = await request(app).post('/api/business/join').set(p.auth).send({ code: loc.code, accept: true });
    const id = join.body.membership.qr.id;
    expect((await request(app).delete(`/api/qrs/${id}`).set(p.auth)).status).toBe(409);
    expect((await request(app).patch(`/api/qrs/${id}`).set(p.auth).send({ name: 'Otro' })).status).toBe(409);
  });

  it('keeps the QRs private to their owner', async () => {
    const a = await makeUser('Fer', { worker: true });
    const b = await makeUser('Gus', { worker: true });
    const made = await request(app).post('/api/qrs').set(a.auth).send({ name: 'Mío' });
    expect((await request(app).delete(`/api/qrs/${made.body.qr.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).get('/api/qrs')).status).toBe(401);
  });
});

describe('tips and comments remember the QR they came through', () => {
  it('stores a valid code on a payment and a comment, and ignores one that is not theirs', async () => {
    const a = await makeUser('Hugo', { worker: true });
    const b = await makeUser('Inés', { worker: true });
    const made = await request(app).post('/api/qrs').set(a.auth).send({ name: 'Evento' });
    const username = (await Worker.findById(a.workerId)).username;

    await request(app).post('/api/tips/create-intent').send({ username, amount: 50, qr: made.body.qr.code });
    await request(app).post('/api/tips/create-intent').send({ username, amount: 50 });
    const bCode = (await request(app).post('/api/qrs').set(b.auth).send({ name: 'De Inés' })).body.qr.code;
    await request(app).post('/api/tips/create-intent').send({ username, amount: 50, qr: bCode });
    const stored = (await Transaction.find({ worker: a.workerId }).sort({ createdAt: 1 })).map((t) => t.qr);
    expect(stored).toEqual([made.body.qr.code, null, null]);

    await request(app).post(`/api/workers/${username}/recognitions`).send({ rating: 5, comment: 'Gracias', qr: made.body.qr.code });
    expect((await Recognition.findOne({ worker: a.workerId })).qr).toBe(made.body.qr.code);
  });

  it('counts, for the person, how each of their QRs is doing', async () => {
    const a = await makeUser('Jana', { worker: true });
    const made = await request(app).post('/api/qrs').set(a.auth).send({ name: 'Puesto' });
    await tip(a.workerId);
    await tip(a.workerId, { qr: made.body.qr.code });
    await tip(a.workerId, { qr: made.body.qr.code });
    const list = (await request(app).get('/api/qrs').set(a.auth)).body.qrs;
    expect(list.find((q) => q.kind === 'main').tips).toBe(1);
    expect(list.find((q) => q.name === 'Puesto').tips).toBe(2);
  });
});

describe('part time: only what came through the company QR counts', () => {
  it('counts the main QR for a full-time person but not for a part-time one', async () => {
    const { owner, loc } = await business();
    const full = await makeUser('Full', { worker: true });
    const part = await makeUser('Part', { worker: true });
    await request(app).post('/api/business/join').set(full.auth).send({ code: loc.code, accept: true, mode: 'full' });
    const pj = await request(app).post('/api/business/join').set(part.auth).send({ code: loc.code, accept: true, mode: 'part' });
    const later = new Date(Date.now() + 1000);
    await tip(full.workerId, { at: later });
    await tip(part.workerId, { at: later }); // came through their own QR: not the company's
    await tip(part.workerId, { at: later, qr: pj.body.membership.qr.code });

    const res = await overview(owner);
    const byName = Object.fromEntries(res.body.members.map((m) => [m.name, m]));
    expect(byName.Full.total.tips).toBe(1);
    expect(byName.Part.total.tips).toBe(1);
    expect(byName.Part.scope).toBe('qr');
  });

  it('lets one person be in two businesses at the same time, each seeing only its own QR', async () => {
    const one = await business('Dueño Uno');
    const two = await business('Dueño Dos');
    const p = await makeUser('Doble', { worker: true });
    const a = await request(app).post('/api/business/join').set(p.auth).send({ code: one.loc.code, accept: true, mode: 'part' });
    const b = await request(app).post('/api/business/join').set(p.auth).send({ code: two.loc.code, accept: true, mode: 'part' });
    expect(b.status).toBe(200);
    const later = new Date(Date.now() + 1000);
    await tip(p.workerId, { at: later, qr: a.body.membership.qr.code });
    await tip(p.workerId, { at: later, qr: b.body.membership.qr.code });
    await tip(p.workerId, { at: later, qr: b.body.membership.qr.code });
    expect((await overview(one.owner)).body.members[0].total.tips).toBe(1);
    expect((await overview(two.owner)).body.members[0].total.tips).toBe(2);
    expect((await request(app).get('/api/qrs').set(p.auth)).body.qrs).toHaveLength(3);
  });
});

describe('events: a short activity with its own dates', () => {
  const when = (startH, endH) => ({ startsAt: new Date(Date.now() + startH * HOUR).toISOString(), endsAt: new Date(Date.now() + endH * HOUR).toISOString() });

  it('is created with dates, and rejects impossible ones', async () => {
    const { owner } = await business();
    const mk = (body) => request(app).post('/api/business/locations').set(owner.auth).send({ name: 'Feria', kind: 'event', ...body });
    expect((await mk(when(1, 49))).status).toBe(201);
    expect((await mk({})).status).toBe(400);                                  // no dates
    expect((await mk(when(5, 2))).status).toBe(400);                          // ends before it starts
    expect((await mk(when(-72, -24))).status).toBe(400);                      // already over
    expect((await mk(when(1, 24 * 90))).status).toBe(400);                   // too long for an event
    const bad = await request(app).post('/api/business/locations').set(owner.auth).send({ name: 'X1', kind: 'event', startsAt: 'no', endsAt: 'tampoco' });
    expect(bad.status).toBe(400);
  });

  it('counts only what came through its QR inside its dates, and keeps the results after it ends', async () => {
    const { owner } = await business();
    const ev = (await request(app).post('/api/business/locations').set(owner.auth).send({ name: 'Festival', kind: 'event', ...when(-1, 48) })).body.location;
    expect(ev.state).toBe('live');
    const p = await makeUser('Músico', { worker: true });
    const join = await request(app).post('/api/business/join').set(p.auth).send({ code: ev.code, accept: true, mode: 'full' });
    expect(join.body.membership.scope).toBe('qr'); // an event never counts the main QR
    const code = join.body.membership.qr.code;
    const ends = new Date(ev.endsAt);

    await tip(p.workerId, { at: new Date(Date.now() + 1000), qr: code, rating: 5 });   // inside
    await tip(p.workerId, { at: new Date(Date.now() + 2000), rating: 5 });             // main QR: not the event's
    await tip(p.workerId, { at: new Date(ends.getTime() + HOUR), qr: code, rating: 1 }); // after it ended

    const res = await overview(owner, '?days=365');
    const event = res.body.locations.find((l) => l.name === 'Festival');
    expect(event.kind).toBe('event');
    expect(event.total.tips).toBe(1);
    expect(event.total.rating).toBe(5);
    expect(res.body.members[0].window.end).toBeTruthy();
  });

  it('shows an ended event as finished, with its results still there, and no longer accepts people', async () => {
    const { owner } = await business();
    const ev = (await request(app).post('/api/business/locations').set(owner.auth).send({ name: 'Fin de semana', kind: 'event', ...when(1, 3) })).body.location;
    const p = await makeUser('Mesero', { worker: true });
    const join = await request(app).post('/api/business/join').set(p.auth).send({ code: ev.code, accept: true });
    expect(join.status).toBe(200);
    const start = new Date(ev.startsAt).getTime();
    await tip(p.workerId, { at: new Date(start + HOUR), qr: join.body.membership.qr.code, rating: 4 });
    // the event ends
    await require('../../src/models/Location').updateOne({ _id: ev.id }, { $set: { startsAt: new Date(Date.now() - 5 * HOUR), endsAt: new Date(Date.now() - HOUR) } });
    await Membership.updateOne({ worker: p.workerId }, { $set: { joinedAt: new Date(Date.now() - 6 * HOUR) } });
    await Transaction.collection.updateMany({ worker: p.workerId }, { $set: { createdAt: new Date(Date.now() - 3 * HOUR) } }); // createdAt is immutable through the model

    const res = await overview(owner, '?days=365');
    const event = res.body.locations.find((l) => l.name === 'Fin de semana');
    expect(event.state).toBe('ended');
    expect(event.total).toMatchObject({ tips: 1, rating: 4 });
    const late = await makeUser('Tarde', { worker: true });
    expect((await request(app).post('/api/business/join').set(late.auth).send({ code: ev.code, accept: true })).status).toBe(410);
    const lookup = await request(app).get(`/api/business/lookup?code=${ev.code}`).set(late.auth);
    expect(lookup.body.business).toMatchObject({ kind: 'event', state: 'ended' });
  });

  it('keeps who took part: people of an event cannot be moved and the event cannot be erased', async () => {
    const { owner, loc } = await business();
    const ev = (await request(app).post('/api/business/locations').set(owner.auth).send({ name: 'Boda', kind: 'event', ...when(1, 10) })).body.location;
    const p = await makeUser('Barman', { worker: true });
    await request(app).post('/api/business/join').set(p.auth).send({ code: ev.code, accept: true });
    const m = await Membership.findOne({ worker: p.workerId });
    const move = await request(app).patch(`/api/business/members/${m._id}`).set(owner.auth).send({ locationId: loc.id });
    expect(move.status).toBe(409);
    expect((await request(app).delete(`/api/business/locations/${ev.id}`).set(owner.auth)).status).toBe(409);
  });

  it('lets a person take part in a team and an event of the same business', async () => {
    const { owner, loc } = await business();
    const ev = (await request(app).post('/api/business/locations').set(owner.auth).send({ name: 'Concierto', kind: 'event', ...when(-1, 10) })).body.location;
    const p = await makeUser('Todoterreno', { worker: true });
    expect((await request(app).post('/api/business/join').set(p.auth).send({ code: loc.code, accept: true, mode: 'full' })).status).toBe(200);
    const e = await request(app).post('/api/business/join').set(p.auth).send({ code: ev.code, accept: true });
    expect(e.status).toBe(200);
    const mine = await request(app).get('/api/business/memberships').set(p.auth);
    expect(mine.body.memberships).toHaveLength(2);
    expect(mine.body.memberships.map((x) => x.kind).sort()).toEqual(['event', 'team']);
    // one payment through the event QR is read by the event, not counted twice
    await tip(p.workerId, { at: new Date(Date.now() + 1000), qr: e.body.membership.qr.code });
    const res = await overview(owner, '?days=365');
    expect(res.body.totals.period.tips).toBe(1);
  });
});

describe('people who joined before memberships existed', () => {
  it('become full-time members from the day they joined, and what came before stays hidden', async () => {
    const owner = await makeUser('Dueño Viejo');
    const p = await makeUser('Veterana', { worker: true });
    const biz = await Business.create({ name: 'Negocio viejo', owner: owner.user._id, code: 'ABCD2345' });
    await User.findByIdAndUpdate(owner.user._id, { ownedBusiness: biz._id });
    const joined = new Date(Date.now() - 2 * DAY);
    await Worker.findByIdAndUpdate(p.workerId, { business: biz._id, businessJoinedAt: joined });
    await tip(p.workerId, { at: new Date(Date.now() - 9 * DAY) }); // before they joined
    await tip(p.workerId, { at: new Date(Date.now() - 1 * DAY) }); // after

    const res = await overview(owner, '?days=365');
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0]).toMatchObject({ scope: 'all' });
    expect(res.body.members[0].total.tips).toBe(1);
    expect(new Date(res.body.members[0].joinedAt).getTime()).toBe(joined.getTime());
    const mine = await request(app).get('/api/business/membership').set(p.auth);
    expect(mine.body.business.name).toBe('Negocio viejo');
  });
});

describe('erasing accounts', () => {
  it('a person who erases their account leaves every business and their QRs stop counting', async () => {
    const { owner, loc } = await business();
    const p = await makeUser('Se va', { worker: true });
    await request(app).post('/api/business/join').set(p.auth).send({ code: loc.code, accept: true });
    expect((await request(app).delete('/api/users/me').set(p.auth)).status).toBe(200);
    expect(await Membership.countDocuments({ worker: p.workerId })).toBe(0);
    expect((await overview(owner)).body.members).toHaveLength(0);
    expect(await Qr.countDocuments({ worker: p.workerId, archivedAt: null })).toBe(0);
  });
});
