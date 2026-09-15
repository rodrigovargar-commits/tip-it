const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('POST /api/auth/register', () => {
  const validBody = {
    name: 'Ana Ejemplo',
    email: 'ana@example.com',
    phone: '5551234567',
    password: 'password123',
  };

  it('creates an account and returns a token on valid input', async () => {
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('ana@example.com');
  });

  it('never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.body.user.password).toBeUndefined();
  });

  // §4 / §9 — malformed input must fail with 400, not 500, and must not
  // create a record.
  it.each([
    ['missing email', { ...validBody, email: undefined }],
    ['malformed email', { ...validBody, email: 'not-an-email' }],
    ['missing name', { ...validBody, name: '' }],
    ['missing phone', { ...validBody, phone: '' }],
    ['password too short', { ...validBody, password: 'short' }],
  ])('rejects with 400 when %s', async (_label, body) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const count = await User.countDocuments({});
    expect(count).toBe(0);
  });

  it('rejects a duplicate email with 409, not a 500 from a raw duplicate-key error', async () => {
    await request(app).post('/api/auth/register').send(validBody);
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  const credentials = {
    name: 'Ana Ejemplo',
    email: 'ana@example.com',
    phone: '5551234567',
    password: 'password123',
  };

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(credentials);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects a wrong password with 401, and does not leak whether the email exists', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrongpassword' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    // Same generic message either way — an attacker can't use the response
    // to enumerate which emails have accounts.
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });
});
