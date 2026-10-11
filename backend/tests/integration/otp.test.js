const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const OtpChallenge = require('../../src/models/OtpChallenge');
const { outbox } = require('../../src/utils/otp/providers');

const lastCode = () => outbox[outbox.length - 1].code;

async function getVerificationToken(channel, destination) {
  await request(app).post('/api/auth/otp/send').send({ channel, destination, purpose: 'register' });
  const res = await request(app)
    .post('/api/auth/otp/verify')
    .send({ channel, destination, purpose: 'register', code: lastCode() });
  return res.body.verificationToken;
}

beforeEach(() => {
  outbox.length = 0;
  delete process.env.OTP_REQUIRED;
});

describe('GET /api/auth/otp/config', () => {
  it('reports what this server can send', async () => {
    const res = await request(app).get('/api/auth/otp/config');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.channels).toEqual(expect.arrayContaining(['email', 'sms']));
  });
});

describe('POST /api/auth/otp/send', () => {
  it('sends a 6-digit code and hides most of the address', async () => {
    const res = await request(app)
      .post('/api/auth/otp/send')
      .send({ channel: 'sms', destination: '55 1234 5678', purpose: 'register' });
    expect(res.status).toBe(200);
    expect(res.body.sentTo).toBe('+52 •••• 5678');
    expect(outbox).toHaveLength(1);
    expect(outbox[0].code).toMatch(/^\d{6}$/);
    expect(outbox[0].destination).toBe('+525512345678');
  });

  it('never stores the code itself', async () => {
    await request(app).post('/api/auth/otp/send').send({ channel: 'email', destination: 'a@b.co', purpose: 'register' });
    const row = await OtpChallenge.findOne({});
    expect(JSON.stringify(row.toObject())).not.toContain(outbox[0].code);
    expect(row.codeHash).toEqual(expect.any(String));
  });

  it('rejects a malformed number or address with 400', async () => {
    const a = await request(app).post('/api/auth/otp/send').send({ channel: 'sms', destination: '123', purpose: 'register' });
    const b = await request(app).post('/api/auth/otp/send').send({ channel: 'email', destination: 'nope', purpose: 'register' });
    const c = await request(app).post('/api/auth/otp/send').send({ channel: 'fax', destination: 'x', purpose: 'register' });
    expect([a.status, b.status, c.status]).toEqual([400, 400, 400]);
    expect(outbox).toHaveLength(0);
  });

  it('makes the person wait before asking for another code', async () => {
    const body = { channel: 'email', destination: 'a@b.co', purpose: 'register' };
    await request(app).post('/api/auth/otp/send').send(body);
    const again = await request(app).post('/api/auth/otp/send').send(body);
    expect(again.status).toBe(429);
    expect(outbox).toHaveLength(1);
  });

  it('caps how many codes one address can get per hour', async () => {
    const body = { channel: 'email', destination: 'a@b.co', purpose: 'register' };
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/otp/send').send(body);
      await OtpChallenge.updateOne({}, { lastSentAt: new Date(Date.now() - 60 * 1000) });
    }
    const sixth = await request(app).post('/api/auth/otp/send').send(body);
    expect(sixth.status).toBe(429);
    expect(outbox).toHaveLength(5);
  });
});

describe('POST /api/auth/otp/verify', () => {
  const body = { channel: 'sms', destination: '5512345678', purpose: 'register' };

  it('gives a verification token for the right code', async () => {
    await request(app).post('/api/auth/otp/send').send(body);
    const res = await request(app).post('/api/auth/otp/verify').send({ ...body, code: lastCode() });
    expect(res.status).toBe(200);
    expect(res.body.verificationToken).toEqual(expect.any(String));
  });

  it('rejects a wrong code, and a used code cannot be used twice', async () => {
    await request(app).post('/api/auth/otp/send').send(body);
    const good = lastCode();
    const wrong = good === '000000' ? '111111' : '000000';
    const bad = await request(app).post('/api/auth/otp/verify').send({ ...body, code: wrong });
    expect(bad.status).toBe(400);
    const ok = await request(app).post('/api/auth/otp/verify').send({ ...body, code: good });
    expect(ok.status).toBe(200);
    const reuse = await request(app).post('/api/auth/otp/verify').send({ ...body, code: good });
    expect(reuse.status).toBe(400);
  });

  it('locks the code after 5 wrong tries, even if the right one comes next', async () => {
    await request(app).post('/api/auth/otp/send').send(body);
    const good = lastCode();
    const wrong = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/otp/verify').send({ ...body, code: wrong });
    }
    const late = await request(app).post('/api/auth/otp/verify').send({ ...body, code: good });
    expect(late.status).toBe(400);
  });

  it('rejects an expired code', async () => {
    await request(app).post('/api/auth/otp/send').send(body);
    await OtpChallenge.updateOne({}, { expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).post('/api/auth/otp/verify').send({ ...body, code: lastCode() });
    expect(res.status).toBe(400);
  });

  it('does not accept a code that was sent to a different number', async () => {
    await request(app).post('/api/auth/otp/send').send(body);
    const res = await request(app)
      .post('/api/auth/otp/verify')
      .send({ ...body, destination: '5599999999', code: lastCode() });
    expect(res.status).toBe(400);
  });
});

describe('register with a verification token', () => {
  it('creates a password-less account from a verified phone', async () => {
    const token = await getVerificationToken('sms', '5512345678');
    const res = await request(app).post('/api/auth/register').send({ name: 'Rafa', verificationToken: token });
    expect(res.status).toBe(201);
    expect(res.body.user.phoneVerified).toBe(true);
    expect(res.body.user.phone).toBe('+525512345678');
    const user = await User.findOne({ phone: '+525512345678' }).select('+password');
    expect(user.password).toBeUndefined();
  });

  it('creates an account from a verified email without a phone', async () => {
    const token = await getVerificationToken('email', 'Rafa@Example.com');
    const res = await request(app).post('/api/auth/register').send({ name: 'Rafa', verificationToken: token });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('rafa@example.com');
    expect(res.body.user.emailVerified).toBe(true);
  });

  it('refuses a second account on the same verified phone', async () => {
    const first = await getVerificationToken('sms', '5512345678');
    await request(app).post('/api/auth/register').send({ name: 'Rafa', verificationToken: first });
    outbox.length = 0;
    await OtpChallenge.deleteMany({});
    const second = await getVerificationToken('sms', '5512345678');
    const res = await request(app).post('/api/auth/register').send({ name: 'Otra', verificationToken: second });
    expect(res.status).toBe(409);
  });

  it('rejects a made-up or expired token', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', verificationToken: 'abc.def.ghi' });
    expect(res.status).toBe(400);
  });

  it('a verification token is not a login token', async () => {
    const token = await getVerificationToken('sms', '5512345678');
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('can be made mandatory with OTP_REQUIRED, which blocks the old form', async () => {
    process.env.OTP_REQUIRED = 'true';
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana', email: 'ana@example.com', phone: '5551234567', password: 'password123',
    });
    expect(res.status).toBe(403);
  });

  it('keeps the classic form working when it is not mandatory', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana', email: 'ana@example.com', phone: '5551234567', password: 'password123',
    });
    expect(res.status).toBe(201);
  });
});

describe('signing in with a code', () => {
  const dest = { channel: 'sms', destination: '5512345678' };

  async function createAccount() {
    const token = await getVerificationToken('sms', '5512345678');
    await request(app).post('/api/auth/register').send({ name: 'Rafa', verificationToken: token });
    outbox.length = 0;
    await OtpChallenge.deleteMany({});
  }

  it('logs in the owner of a verified phone', async () => {
    await createAccount();
    await request(app).post('/api/auth/otp/send').send({ ...dest, purpose: 'login' });
    const res = await request(app).post('/api/auth/otp/verify').send({ ...dest, purpose: 'login', code: lastCode() });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.name).toBe('Rafa');
  });

  it('answers the same for a number with no account, and sends nothing', async () => {
    const send = await request(app).post('/api/auth/otp/send').send({ ...dest, purpose: 'login' });
    expect(send.status).toBe(200);
    expect(outbox).toHaveLength(0);
    const verify = await request(app).post('/api/auth/otp/verify').send({ ...dest, purpose: 'login', code: '123456' });
    expect(verify.status).toBe(400);
  });

  it('a password-less account cannot be entered with any password', async () => {
    await createAccount();
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});

describe('providers', () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SID;
    jest.restoreAllMocks();
  });

  it('emails the code through Resend when configured', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'x' }) });
    const res = await request(app).post('/api/auth/otp/send').send({ channel: 'email', destination: 'a@b.co', purpose: 'register' });
    expect(res.status).toBe(200);
    expect(spy.mock.calls[0][0]).toBe('https://api.resend.com/emails');
    const sent = JSON.parse(spy.mock.calls[0][1].body);
    expect(sent.to).toEqual(['a@b.co']);
    expect(sent.text).toMatch(/\b\d{6}\b/);
  });

  it('answers 502 when the provider refuses, instead of pretending it sent', async () => {
    process.env.RESEND_API_KEY = 're_test';
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'domain' }) });
    const res = await request(app).post('/api/auth/otp/send').send({ channel: 'email', destination: 'a@b.co', purpose: 'register' });
    expect(res.status).toBe(502);
    expect(await OtpChallenge.countDocuments({})).toBe(0);
  });

  it('delegates SMS to Twilio Verify, which also checks the code', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    process.env.TWILIO_VERIFY_SID = 'VA123';
    const spy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ status: 'pending' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 'approved' }) });

    const body = { channel: 'sms', destination: '5512345678', purpose: 'register' };
    const send = await request(app).post('/api/auth/otp/send').send(body);
    expect(send.status).toBe(200);
    expect(spy.mock.calls[0][0]).toContain('/Services/VA123/Verifications');
    expect(new URLSearchParams(spy.mock.calls[0][1].body).get('To')).toBe('+525512345678');
    expect((await OtpChallenge.findOne({})).codeHash).toBeNull();

    const verify = await request(app).post('/api/auth/otp/verify').send({ ...body, code: '123456' });
    expect(verify.status).toBe(200);
    expect(spy.mock.calls[1][0]).toContain('/VerificationCheck');
  });
});
