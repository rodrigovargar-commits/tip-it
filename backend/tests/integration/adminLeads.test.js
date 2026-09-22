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
      phone: '5559998888',
      category: 'barbero_estilista',
      zone: 'Coyoacán',
    });

    const list = await request(app).get('/api/admin/leads').set('x-admin-key', KEY);
    expect(list.status).toBe(200);
    const created = list.body.leads.find((l) => l.phone === '5559998888');
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
