const request = require('supertest');

describe('CORS origins (CLIENT_URL list + native app shells)', () => {
  let app;
  const OLD = process.env.CLIENT_URL;
  beforeAll(() => {
    process.env.CLIENT_URL = 'https://tip-it-three.vercel.app, https://tipit.mx';
    jest.resetModules();
    app = require('../../src/app');
  });
  afterAll(() => {
    if (OLD === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = OLD;
  });

  const allowed = (origin) =>
    request(app).get('/api/health').set('Origin', origin).then((r) => r.headers['access-control-allow-origin']);

  it('allows every origin listed in CLIENT_URL', async () => {
    expect(await allowed('https://tipit.mx')).toBe('https://tipit.mx');
    expect(await allowed('https://tip-it-three.vercel.app')).toBe('https://tip-it-three.vercel.app');
  });

  it('allows the Capacitor native app origins', async () => {
    expect(await allowed('capacitor://localhost')).toBe('capacitor://localhost');
  });

  it('does not allow an unrelated origin', async () => {
    expect(await allowed('https://evil.example')).toBeUndefined();
  });
});
