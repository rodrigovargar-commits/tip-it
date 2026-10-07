const { publicBaseUrl, workerTipUrl } = require('../../src/utils/publicUrl');

describe('publicBaseUrl (what QR codes point to)', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('never returns a comma-separated list', () => {
    delete process.env.PUBLIC_URL;
    process.env.CLIENT_URL = 'https://tip-it-three.vercel.app,https://tipit.com.mx,https://www.tipit.com.mx';
    expect(publicBaseUrl()).toBe('https://www.tipit.com.mx');
    expect(publicBaseUrl()).not.toContain(',');
  });

  it('prefers PUBLIC_URL when it is set, without a trailing slash', () => {
    process.env.PUBLIC_URL = 'https://tipit.example/';
    process.env.CLIENT_URL = 'https://other.app';
    expect(publicBaseUrl()).toBe('https://tipit.example');
  });

  it('falls back to the first https address, then to the production address', () => {
    delete process.env.PUBLIC_URL;
    process.env.CLIENT_URL = 'http://localhost:5173, https://tip-it-three.vercel.app';
    expect(publicBaseUrl()).toBe('https://tip-it-three.vercel.app');
    process.env.CLIENT_URL = '';
    process.env.NODE_ENV = 'production';
    expect(publicBaseUrl()).toBe('https://www.tipit.com.mx');
  });

  it('builds a clean worker address (lowercase, one /tip/ segment)', () => {
    delete process.env.PUBLIC_URL;
    process.env.CLIENT_URL = 'https://a.app,https://www.tipit.com.mx';
    expect(workerTipUrl('Rafa_Barber')).toBe('https://www.tipit.com.mx/tip/rafa_barber');
  });
});
