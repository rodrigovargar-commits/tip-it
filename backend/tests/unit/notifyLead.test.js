const { notifyLead, whatsappLink } = require('../../src/utils/notifyLead');

const lead = {
  name: 'Ana <b>Barbera</b>',
  phone: '55 5999 8888',
  category: 'barbero_estilista',
  zone: 'Coyoacán',
  source: 'instagram_bio',
  createdAt: new Date('2026-10-02T18:00:00Z'),
};

describe('notifyLead', () => {
  const OLD = { ...process.env };
  const realFetch = global.fetch;
  afterEach(() => {
    process.env = { ...OLD };
    global.fetch = realFetch;
  });

  it('does nothing when the env vars are not configured', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.LEAD_NOTIFY_EMAIL;
    global.fetch = jest.fn();
    expect(await notifyLead(lead)).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends one email to every configured address, escaping user input', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.LEAD_NOTIFY_EMAIL = 'yo@correo.com, socio@correo.com';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    expect(await notifyLead(lead)).toBe(true);

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(opts.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(opts.body);
    expect(body.to).toEqual(['yo@correo.com', 'socio@correo.com']);
    expect(body.subject).toContain('Barbero / estilista');
    expect(body.html).toContain('Ana &lt;b&gt;Barbera&lt;/b&gt;');
    expect(body.html).not.toContain('<b>Barbera</b>');
    expect(body.html).toContain('https://wa.me/525559998888');
  });

  it('never throws when the provider fails or is unreachable', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.LEAD_NOTIFY_EMAIL = 'yo@correo.com';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    expect(await notifyLead(lead)).toBe(false);
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    expect(await notifyLead(lead)).toBe(false);
  });
});

describe('whatsappLink', () => {
  it('adds the Mexican country code to 10-digit numbers and ignores junk', () => {
    expect(whatsappLink('55 1234 5678')).toBe('https://wa.me/525512345678');
    expect(whatsappLink('+52 55 1234 5678')).toBe('https://wa.me/525512345678');
    expect(whatsappLink('abc')).toBeNull();
  });
});
