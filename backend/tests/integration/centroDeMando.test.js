const request = require('supertest');
const app = require('../../src/app');
const Lead = require('../../src/models/Lead');
const User = require('../../src/models/User');
const Worker = require('../../src/models/Worker');

const KEY = 'test-admin-key';
const SECRET = 'test-manychat-secret';

describe('Centro de mando: lead pipeline, manual leads and users', () => {
  const OLD = { key: process.env.ADMIN_STATS_KEY, mc: process.env.MANYCHAT_SECRET };
  beforeAll(() => {
    process.env.ADMIN_STATS_KEY = KEY;
    process.env.MANYCHAT_SECRET = SECRET;
  });
  afterAll(() => {
    process.env.ADMIN_STATS_KEY = OLD.key;
    process.env.MANYCHAT_SECRET = OLD.mc;
  });

  it('adds a lead by hand from a visit, with a note and a follow-up date', async () => {
    const res = await request(app)
      .post('/api/admin/leads')
      .set('x-admin-key', KEY)
      .send({ name: 'Paty Podóloga', phone: '5512345678', category: 'otro', zone: 'Narvarte', note: 'Le interesó, pidió verlo el lunes', nextFollowUp: '2026-10-26' });
    expect(res.status).toBe(201);
    expect(res.body.lead.source).toBe('visita');
    expect(res.body.lead.stage).toBe('nuevo');
    expect(res.body.lead.notes).toHaveLength(1);
    expect(res.body.lead.nextFollowUp).toBeTruthy();
  });

  it('rejects a manual lead with no way to reach them', async () => {
    const res = await request(app).post('/api/admin/leads').set('x-admin-key', KEY).send({ name: 'Sin datos' });
    expect(res.status).toBe(400);
  });

  it('moves a lead through the stages and keeps contacted in step', async () => {
    const lead = await Lead.create({ name: 'Beto', email: 'beto@correo.com', category: 'barbero_estilista' });
    let res = await request(app)
      .patch(`/api/admin/leads/${lead._id}`)
      .set('x-admin-key', KEY)
      .send({ stage: 'interesado', objection: 'Ya tengo terminal', note: 'Le mandé el video' });
    expect(res.status).toBe(200);
    expect(res.body.lead.stage).toBe('interesado');
    expect(res.body.lead.contacted).toBe(true);
    expect(res.body.lead.objection).toBe('Ya tengo terminal');

    res = await request(app).patch(`/api/admin/leads/${lead._id}`).set('x-admin-key', KEY).send({ stage: 'volando' });
    expect(res.status).toBe(400);

    res = await request(app).get('/api/admin/leads?stage=interesado').set('x-admin-key', KEY);
    expect(res.body.leads.map((l) => l.name)).toEqual(['Beto']);
  });

  it('the old contacted flag still moves a new lead to contactado', async () => {
    const lead = await Lead.create({ name: 'Ana', email: 'ana@correo.com', category: 'otro' });
    const res = await request(app).patch(`/api/admin/leads/${lead._id}`).set('x-admin-key', KEY).send({ contacted: true });
    expect(res.body.lead.stage).toBe('contactado');
  });

  it('shows when a lead already created an account', async () => {
    const user = await User.create({ name: 'Caro', email: 'caro@correo.com', phone: '5511112222', password: 'secreto123', isWorker: true });
    const worker = await Worker.create({ user: user._id, username: 'caro.nails', tipCount: 2 });
    user.worker = worker._id;
    await user.save();
    await Lead.create({ name: 'Caro', email: 'caro@correo.com', category: 'barbero_estilista' });

    const res = await request(app).get('/api/admin/leads').set('x-admin-key', KEY);
    const caro = res.body.leads.find((l) => l.email === 'caro@correo.com');
    expect(caro.account).toEqual({ username: 'caro.nails', ready: false, tips: 2 });

    const users = await request(app).get('/api/admin/users').set('x-admin-key', KEY);
    expect(users.status).toBe(200);
    expect(users.body.users[0]).toMatchObject({ username: 'caro.nails', email: 'caro@correo.com', ready: false, tips: 0 });
  });

  it('admin portal endpoints need the key', async () => {
    expect((await request(app).get('/api/admin/users')).status).toBe(401);
    expect((await request(app).post('/api/admin/leads').send({ name: 'x', phone: '1' })).status).toBe(401);
  });
});

describe('POST /api/leads/manychat', () => {
  const OLD = process.env.MANYCHAT_SECRET;
  beforeAll(() => {
    process.env.MANYCHAT_SECRET = SECRET;
  });
  afterAll(() => {
    process.env.MANYCHAT_SECRET = OLD;
  });

  it('refuses without the shared secret', async () => {
    const res = await request(app).post('/api/leads/manychat').send({ instagram: 'alguien' });
    expect(res.status).toBe(401);
  });

  it('creates a lead from an Instagram chat, then updates the same person instead of duplicating', async () => {
    let res = await request(app)
      .post('/api/leads/manychat')
      .set('x-manychat-secret', SECRET)
      .send({ name: 'Luis', instagram: 'https://instagram.com/Luis.Barber/', category: 'Soy barbero', message: '¿Cuánto cobran?' });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);

    res = await request(app)
      .post('/api/leads/manychat')
      .set('x-manychat-secret', SECRET)
      .send({ instagram: '@luis.barber', phone: '5599998888' });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);

    const leads = await Lead.find({}).lean();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ instagram: 'luis.barber', phone: '5599998888', category: 'barbero_estilista', source: 'manychat' });
    expect(leads[0].notes[0].text).toBe('Chat: ¿Cuánto cobran?');
  });

  it('needs at least one way to reach the person', async () => {
    const res = await request(app).post('/api/leads/manychat').set('x-manychat-secret', SECRET).send({ name: 'Nadie' });
    expect(res.status).toBe(400);
  });
});

describe('leads saved before the pipeline existed', () => {
  const OLD = process.env.ADMIN_STATS_KEY;
  beforeAll(() => {
    process.env.ADMIN_STATS_KEY = KEY;
  });
  afterAll(() => {
    process.env.ADMIN_STATS_KEY = OLD;
  });

  it('an old contacted lead becomes contactado, not nuevo, when it is first updated', async () => {
    const { insertedId } = await Lead.collection.insertOne({ name: 'Viejo', email: 'viejo@correo.com', category: 'otro', contacted: true, createdAt: new Date() });
    const res = await request(app).patch(`/api/admin/leads/${insertedId}`).set('x-admin-key', KEY).send({ nextFollowUp: '2026-11-02' });
    expect(res.status).toBe(200);
    expect(res.body.lead.stage).toBe('contactado');
    expect(res.body.lead.contacted).toBe(true);
  });
});
