const request = require('supertest');
const app = require('../../src/app');
const Lead = require('../../src/models/Lead');

describe('POST /api/leads (marketing landing — interest only, no account)', () => {
  it('stores a lead without creating a User or issuing a token', async () => {
    const res = await request(app).post('/api/leads').send({
      name: 'Juan Barbero',
      phone: '5551234567',
      category: 'barbero_estilista',
      zone: 'Coyoacán',
      source: 'instagram_bio',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();

    const stored = await Lead.findOne({ phone: '5551234567' });
    expect(stored).not.toBeNull();
    expect(stored.category).toBe('barbero_estilista');
    expect(stored.contacted).toBe(false);
  });

  it('rejects an invalid category', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'X', phone: '555', category: 'no_existe' });
    expect(res.status).toBe(400);
  });

  it('requires name and phone', async () => {
    const res = await request(app).post('/api/leads').send({ category: 'otro' });
    expect(res.status).toBe(400);
  });
});
