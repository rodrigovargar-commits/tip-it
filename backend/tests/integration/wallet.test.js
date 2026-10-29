const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

jest.mock('../../src/config/stripe', () => ({}));

const app = require('../../src/app');
const { signWalletToken, readWalletToken } = require('../../src/utils/wallet/token');
const { buildGoogleSaveUrl } = require('../../src/utils/wallet/google');

const KEYS = [
  'GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_CLIENT_EMAIL', 'GOOGLE_WALLET_PRIVATE_KEY',
  'APPLE_WALLET_PASS_TYPE_ID', 'APPLE_WALLET_TEAM_ID', 'APPLE_WALLET_CERT_PEM_BASE64',
  'APPLE_WALLET_KEY_PEM_BASE64', 'APPLE_WALLET_WWDR_PEM_BASE64',
];
afterEach(() => KEYS.forEach((k) => delete process.env[k]));

async function worker() {
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Wally', email: 'wally@example.com', phone: '5551110000', password: 'password123',
  });
  await request(app).post('/api/workers/register').set('Authorization', `Bearer ${reg.body.token}`).send({ username: 'wally' });
  return { Authorization: `Bearer ${reg.body.token}` };
}

describe('wallet without credentials', () => {
  it('reports both as unavailable and refuses to build passes', async () => {
    const auth = await worker();
    const cfg = await request(app).get('/api/wallet/config');
    expect(cfg.body).toMatchObject({ apple: false, google: false });
    expect((await request(app).get('/api/wallet/google').set(auth)).status).toBe(503);
    expect((await request(app).get('/api/wallet/apple').set(auth)).status).toBe(503);
  });

  it('needs a login for the personal links', async () => {
    expect((await request(app).get('/api/wallet/google')).status).toBe(401);
  });
});

describe('Google Wallet link', () => {
  it('signs a pass whose barcode is the person profile', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.GOOGLE_WALLET_ISSUER_ID = '3388000000000000001';
    process.env.GOOGLE_WALLET_CLIENT_EMAIL = 'wallet@tipit.iam.gserviceaccount.com';
    process.env.GOOGLE_WALLET_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n');

    const url = buildGoogleSaveUrl({ worker: { _id: 'abc123', username: 'rafa' }, name: 'Rafa' });
    expect(url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
    const decoded = jwt.verify(url.split('/save/')[1], publicKey, { algorithms: ['RS256'] });
    expect(decoded.iss).toBe('wallet@tipit.iam.gserviceaccount.com');
    expect(decoded.typ).toBe('savetowallet');
    const obj = decoded.payload.genericObjects[0];
    expect(obj.barcode.type).toBe('QR_CODE');
    expect(obj.barcode.value).toMatch(/\/p\/rafa$/);
    expect(obj.header.defaultValue.value).toBe('Rafa');
  });
});

describe('Apple pass route', () => {
  it('matches a token that contains dots and answers 410 for a bad one', async () => {
    Object.assign(process.env, {
      APPLE_WALLET_PASS_TYPE_ID: 'pass.mx.tipit.qr', APPLE_WALLET_TEAM_ID: 'TEAM123456',
      APPLE_WALLET_CERT_PEM_BASE64: 'eA==', APPLE_WALLET_KEY_PEM_BASE64: 'eA==', APPLE_WALLET_WWDR_PEM_BASE64: 'eA==',
    });
    const res = await request(app).get('/api/wallet/apple/pass/aaa.bbb.ccc.pkpass');
    expect(res.status).toBe(410);
    const fresh = await request(app).get(`/api/wallet/apple/pass/${signWalletToken('507f1f77bcf86cd799439011')}.pkpass`);
    expect(fresh.status).not.toBe(410); // valid token: reaches the pass builder (404 here, no such person)
    expect(fresh.status).toBe(404);
  });
});

describe('Apple pass link token', () => {
  it('round-trips and rejects tampering or other token types', () => {
    const token = signWalletToken('worker1');
    expect(readWalletToken(token)).toBe('worker1');
    expect(readWalletToken(`${token}x`)).toBeNull();
    const login = jwt.sign({ sub: 'worker1' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    expect(readWalletToken(login)).toBeNull(); // a login token cannot open a pass link
  });
});
