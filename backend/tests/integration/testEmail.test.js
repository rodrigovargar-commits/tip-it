const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/admin/test-email', () => {
  const OLD = { ...process.env };
  const realFetch = global.fetch;
  beforeAll(() => {
    process.env.ADMIN_STATS_KEY = 'test-admin-key';
  });
  afterEach(() => {
    process.env = { ...OLD, ADMIN_STATS_KEY: 'test-admin-key' };
    global.fetch = realFetch;
  });

  it('needs the admin key', async () => {
    const res = await request(app).get('/api/admin/test-email');
    expect(res.status).toBe(401);
  });

  it('says what is missing when the email is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.LEAD_NOTIFY_EMAIL;
    const res = await request(app).get('/api/admin/test-email').set('x-admin-key', 'test-admin-key');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.configured).toMatchObject({ RESEND_API_KEY: false, LEAD_NOTIFY_EMAIL: false });
  });

  it('shows the provider error without leaking the API key', async () => {
    process.env.RESEND_API_KEY = 're_secret_value';
    process.env.LEAD_NOTIFY_EMAIL = 'yo@correo.com';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'You can only send testing emails to your own email address' }),
    });
    const res = await request(app).get('/api/admin/test-email').set('x-admin-key', 'test-admin-key');
    expect(res.body.success).toBe(false);
    expect(res.body.result.status).toBe(403);
    expect(res.body.result.error).toContain('testing emails');
    expect(JSON.stringify(res.body)).not.toContain('re_secret_value');
  });

  it('reports success when the provider accepts the email', async () => {
    process.env.RESEND_API_KEY = 're_secret_value';
    process.env.LEAD_NOTIFY_EMAIL = 'yo@correo.com';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const res = await request(app).get('/api/admin/test-email').set('x-admin-key', 'test-admin-key');
    expect(res.body.success).toBe(true);
  });
});
