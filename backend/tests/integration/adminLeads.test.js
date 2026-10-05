const request = require('supertest');
const app = require('../../src/app');

const KEY = 'test-admin-key';

describe('GET/PATCH /api/admin/leads (contact list from the /unete landing)', () => {
  const OLD_KEY = process.env.ADMIN_STATS_KEY;
  beforeAll(() => {
    process.env.ADMIN_STATS_KEY = KEY;
  });
  afterAll(() => {
    process.env.ADMIN_STATS_KEY = OLD_KEY;
  });

  it('rejects without the admin key', async () => {
    const res = await request(app).get('/api/admin/leads');
    expect(res.status).toBe(401);
  });

  it('lists a lead created from the landing, and lets it be marked contacted', async () => {
    await request(app).post('/api/leads').send({
      name: 'Ana Barbera',
      email: 'ana@correo.com',
      category: 'barbero_estilista',
      zone: 'Coyoacán',
    });

    const list = await request(app).get('/api/admin/leads').set('x-admin-key', KEY);
    expect(list.status).toBe(200);
    const created = list.body.leads.find((l) => l.email === 'ana@correo.com');
    expect(created).toBeDefined();
    expect(created.contacted).toBe(false);

    const patch = await request(app)
      .patch(`/api/admin/leads/${created._id}`)
      .set('x-admin-key', KEY)
      .send({ contacted: true });
    expect(patch.status).toBe(200);
    expect(patch.body.lead.contacted).toBe(true);
  });

  it('filters by category', async () => {
    const res = await request(app)
      .get('/api/admin/leads?category=musico_artista')
      .set('x-admin-key', KEY);
    expect(res.status).toBe(200);
    res.body.leads.forEach((l) => expect(l.category).toBe('musico_artista'));
  });
});

describe('POST /api/leads contact rules (email required)', () => {
  const base = { name: 'Luis Músico', category: 'musico_artista', zone: 'Coyoacán' };

  it('accepts an email as the only way to reach them', async () => {
    const res = await request(app).post('/api/leads').send({ ...base, email: 'luis@correo.com' });
    expect(res.status).toBe(201);
  });

  it('rejects a phone number alone: the email is the way we reach people', async () => {
    const res = await request(app).post('/api/leads').send({ ...base, phone: '5511112222' });
    expect(res.status).toBe(400);
  });

  it('rejects when no email is given', async () => {
    const res = await request(app).post('/api/leads').send(base);
    expect(res.status).toBe(400);
  });

  it('rejects a malformed email', async () => {
    const res = await request(app).post('/api/leads').send({ ...base, email: 'no-es-correo' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/leads honeypot (spam protection)', () => {
  const OLD_KEY = process.env.ADMIN_STATS_KEY;
  beforeAll(() => {
    process.env.ADMIN_STATS_KEY = 'test-admin-key';
  });
  afterAll(() => {
    process.env.ADMIN_STATS_KEY = OLD_KEY;
  });

  it('answers success to a bot that fills the hidden field, but stores nothing', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'Bot', email: 'bot@spam.example', category: 'otro', website: 'http://spam.example' });
    expect(res.status).toBe(201);
    const list = await request(app).get('/api/admin/leads').set('x-admin-key', 'test-admin-key');
    expect(list.body.leads.find((l) => l.name === 'Bot')).toBeUndefined();
  });
});
