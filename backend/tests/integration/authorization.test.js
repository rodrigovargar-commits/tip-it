const request = require('supertest');
const app = require('../../src/app');
const Contact = require('../../src/models/Contact');
const Worker = require('../../src/models/Worker');

// The most important test file in this suite: RV Mejores Prácticas §6 says
// this is where AI-generated code and fintech pentests both find their
// worst findings, and requires exactly this test — "usuario A no puede
// leer, modificar ni borrar el recurso del usuario B" — for every endpoint
// that returns or changes a subject's data.

async function createUserAndWorker(suffix) {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: `Trabajador ${suffix}`,
      email: `worker${suffix}@example.com`,
      phone: `555000${suffix}`,
      password: 'password123',
    });
  const token = registerRes.body.token;

  const workerRes = await request(app)
    .post('/api/workers/register')
    .set('Authorization', `Bearer ${token}`)
    .send({ username: `worker${suffix}` });

  return { token, workerId: workerRes.body.worker.id };
}

describe('Authorization — worker stats (GET /api/workers/:id/stats)', () => {
  it("user A cannot read user B's worker stats", async () => {
    const a = await createUserAndWorker('a1');
    const b = await createUserAndWorker('b1');

    const res = await request(app)
      .get(`/api/workers/${b.workerId}/stats`)
      .set('Authorization', `Bearer ${a.token}`);

    // 404, not 403 — must not confirm that b.workerId exists at all.
    expect(res.status).toBe(404);
  });

  it('the owner can read their own stats', async () => {
    const a = await createUserAndWorker('a2');

    const res = await request(app)
      .get(`/api/workers/${a.workerId}/stats`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('a request with no token at all is rejected before any ownership check', async () => {
    const a = await createUserAndWorker('a3');
    const res = await request(app).get(`/api/workers/${a.workerId}/stats`);
    expect(res.status).toBe(401);
  });
});

describe('Authorization — contacts (DELETE /api/contacts/:id)', () => {
  it("user A cannot delete user B's contact", async () => {
    const a = await createUserAndWorker('a4');
    const b = await createUserAndWorker('b4');
    const c = await createUserAndWorker('c4'); // the worker B added as a contact

    await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${b.token}`)
      .send({ username: `workerc4` });
    const contact = await Contact.findOne({});
    expect(contact).not.toBeNull();

    const res = await request(app)
      .delete(`/api/contacts/${contact._id}`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(res.status).toBe(404);
    // The contact must still exist — A's attempt did not delete B's data.
    const stillThere = await Contact.findById(contact._id);
    expect(stillThere).not.toBeNull();
  });

  it("owner can delete their own contact", async () => {
    const b = await createUserAndWorker('b5');
    await createUserAndWorker('c5');
    await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${b.token}`)
      .send({ username: 'workerc5' });
    const contact = await Contact.findOne({});

    const res = await request(app)
      .delete(`/api/contacts/${contact._id}`)
      .set('Authorization', `Bearer ${b.token}`);

    expect(res.status).toBe(200);
    expect(await Contact.findById(contact._id)).toBeNull();
  });
});

describe('Authorization — output DTOs never leak internal fields', () => {
  it('registerWorker response never includes stripeAccountId or other internal fields', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Trabajador DTO',
      email: 'dto@example.com',
      phone: '5559999999',
      password: 'password123',
    });
    const res = await request(app)
      .post('/api/workers/register')
      .set('Authorization', `Bearer ${registerRes.body.token}`)
      .send({ username: 'workerdto' });

    expect(res.status).toBe(201);
    expect(res.body.worker.stripeAccountId).toBeUndefined();
    expect(res.body.worker.__v).toBeUndefined();
    expect(res.body.worker.username).toBe('workerdto');
  });
});
