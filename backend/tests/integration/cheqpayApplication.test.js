const request = require('supertest');

jest.mock('../../src/config/stripe', () => ({}));

const app = require('../../src/app');
const Worker = require('../../src/models/Worker');

async function makeUser(activity = 'barberia') {
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Rafa García Legal',
    email: 'rafa@example.com',
    phone: '5551112222',
    password: 'password123',
  });
  await request(app)
    .post('/api/workers/register')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ username: 'rafa', activity });
  return reg.body.token;
}

const valid = {
  legalName: 'Rafael García Pérez',
  rfc: 'gape900101ab1',
  nationality: 'Mexicana',
  phone: '55 5111 2222',
  email: 'Rafa@Example.com',
  giro: 'barberias',
  acceptTerms: true,
};

describe('Cheqpay application data', () => {
  it('suggests the giro from the activity and prefills name, phone and email', async () => {
    const token = await makeUser('musica');
    const res = await request(app).get('/api/workers/cheqpay/application').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({
      status: 'none',
      legalName: 'Rafa García Legal',
      email: 'rafa@example.com',
      giro: 'musica',
      nationality: 'Mexicana',
    });
    expect(res.body.application.giros).toHaveLength(8);
  });

  it('suggests "Otros servicios" with a description for transport', async () => {
    const token = await makeUser('transporte');
    const res = await request(app).get('/api/workers/cheqpay/application').set('Authorization', `Bearer ${token}`);
    expect(res.body.application.giro).toBe('otros');
    expect(res.body.application.giroOther).toBe('Transporte y valet');
  });

  it('saves the data, normalizes it and never returns the full RFC', async () => {
    const token = await makeUser();
    const res = await request(app).put('/api/workers/cheqpay/application').set('Authorization', `Bearer ${token}`).send(valid);
    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('collected');
    expect(res.body.application.rfcMasked).toBe('GAPE••••••B1'.replace('B1', 'AB1'));
    expect(JSON.stringify(res.body)).not.toContain('GAPE900101AB1');
    const worker = await Worker.findOne({ username: 'rafa' });
    expect(worker.cheqpay.rfc).toBe('GAPE900101AB1');
    expect(worker.cheqpay.phone).toBe('5551112222');
    expect(worker.cheqpay.email).toBe('rafa@example.com');
    expect(worker.cheqpay.termsAcceptedAt).toBeInstanceOf(Date);
  });

  it('keeps the saved RFC when it is sent empty on a later save', async () => {
    const token = await makeUser();
    const put = (body) => request(app).put('/api/workers/cheqpay/application').set('Authorization', `Bearer ${token}`).send(body);
    await put(valid);
    const res = await put({ ...valid, rfc: '', nationality: 'Mexicana ' });
    expect(res.status).toBe(200);
    expect(res.body.application.hasRfc).toBe(true);
    const worker = await Worker.findOne({ username: 'rafa' });
    expect(worker.cheqpay.rfc).toBe('GAPE900101AB1');
  });

  it('accepts a missing RFC (it is optional)', async () => {
    const token = await makeUser();
    const res = await request(app)
      .put('/api/workers/cheqpay/application')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...valid, rfc: '' });
    expect(res.status).toBe(200);
    expect(res.body.application.hasRfc).toBe(false);
  });

  it('rejects a bad RFC, missing terms, a missing description for "otros", and an unknown giro', async () => {
    const token = await makeUser();
    const put = (body) => request(app).put('/api/workers/cheqpay/application').set('Authorization', `Bearer ${token}`).send(body);
    expect((await put({ ...valid, rfc: '123' })).status).toBe(400);
    expect((await put({ ...valid, acceptTerms: false })).status).toBe(400);
    expect((await put({ ...valid, giro: 'otros', giroOther: '  ' })).status).toBe(400);
    expect((await put({ ...valid, giro: 'inventado' })).status).toBe(400);
    expect((await put({ ...valid, email: 'no-es-correo' })).status).toBe(400);
  });

  it('requires a signed-in person with a profile', async () => {
    const res = await request(app).get('/api/workers/cheqpay/application');
    expect(res.status).toBe(401);
  });
});
