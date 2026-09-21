const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('DELETE /api/users/me (derecho de cancelación)', () => {
  it('erases personal data and disables the account', async () => {
    process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Borrar Yo', email: 'borrar@example.com', phone: '5550009999', password: 'password123',
    });
    const token = reg.body.token;
    await request(app).put('/api/users/profile').set('Authorization', `Bearer ${token}`).send({ document: 'INE999' });

    const raw = await User.collection.findOne({ email: 'borrar@example.com' });
    expect(raw.document).toMatch(/^enc:v1:/);

    const res = await request(app).delete('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const after = await User.collection.findOne({ _id: raw._id });
    expect(after.name).toBe('Cuenta eliminada');
    expect(after.document).toBeNull();
    expect(after.active).toBe(false);

    const login = await request(app).post('/api/auth/login').send({ email: 'borrar@example.com', password: 'password123' });
    expect(login.status).toBe(401);
    delete process.env.DATA_ENCRYPTION_KEY;
  });
});
