const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Worker = require('../../src/models/Worker');

describe('GET /api/admin/worker-status', () => {
  beforeAll(() => {
    process.env.ADMIN_STATS_KEY = 'test-admin-key';
  });

  it('needs the admin key', async () => {
    expect((await request(app).get('/api/admin/worker-status?username=x')).status).toBe(401);
  });

  it('404 for an unknown username', async () => {
    const res = await request(app).get('/api/admin/worker-status?username=nadie').set('x-admin-key', 'test-admin-key');
    expect(res.status).toBe(404);
  });

  it('reports what the app thinks, without leaking the Stripe account id', async () => {
    await Worker.create({ user: new mongoose.Types.ObjectId(), username: 'listo', stripeAccountId: null, stripeOnboardingComplete: true });
    const res = await request(app).get('/api/admin/worker-status?username=listo').set('x-admin-key', 'test-admin-key');
    expect(res.status).toBe(200);
    expect(res.body.appSaysReady).toBe(true);
    expect(res.body.hasStripeAccount).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('acct_');
  });
});
