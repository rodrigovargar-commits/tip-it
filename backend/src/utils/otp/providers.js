const { logger } = require('../logger');

// How a code actually reaches a person. Three real transports, all optional
// and chosen by what is configured on the server:
//   email            -> Resend (same account as the lead notifications)
//   sms / whatsapp   -> Twilio Verify (it also holds and checks the code, and
//                       has its own fraud guard against SMS-pumping)
// In development with nothing configured, codes are printed to the server
// console so the flow can be tried end to end. In production they never are.
const isTest = () => process.env.NODE_ENV === 'test';
const isProd = () => process.env.NODE_ENV === 'production';

// Test hook: every "sent" message is kept here instead of leaving the process.
const outbox = [];

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SID
  );
}

function providerFor(channel) {
  if (channel === 'email') {
    if (process.env.RESEND_API_KEY) return 'resend';
  } else if (twilioConfigured()) {
    if (channel === 'sms') return 'twilio';
    if (channel === 'whatsapp' && process.env.OTP_WHATSAPP === 'true') return 'twilio';
  }
  if (isTest()) return 'test';
  if (!isProd()) return 'console';
  return null;
}

function availableChannels() {
  return ['email', 'sms', 'whatsapp'].filter((c) => providerFor(c));
}

async function post(url, init, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    logger.warn({ reason: err.name, provider: label }, 'otp provider request failed');
    return { ok: false, status: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

function emailBody(code) {
  const text = `Tu código de TIP-IT es ${code}. Vence en 10 minutos. Si no lo pediste, ignora este mensaje.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:420px;color:#0A2F2F">
      <p style="margin:0 0 8px">Tu código para entrar a TIP-IT:</p>
      <p style="font-size:34px;font-weight:800;letter-spacing:8px;margin:8px 0 16px">${code}</p>
      <p style="margin:0;color:#5F7371;font-size:14px">Vence en 10 minutos. Si no lo pediste, ignora este mensaje; nadie puede entrar sin él.</p>
    </div>`;
  return { text, html };
}

// Returns { ok, ownsCode }. `ownsCode` tells the service whether it must keep
// a hash of `code` (we generated it) or the provider keeps the code itself.
async function deliver({ channel, destination, code }) {
  const provider = providerFor(channel);

  if (provider === 'test') {
    outbox.push({ channel, destination, code });
    return { ok: true, ownsCode: true, provider };
  }

  if (provider === 'console') {
    // eslint-disable-next-line no-console
    console.log(`[otp:${channel}] código para ${destination}: ${code}`);
    return { ok: true, ownsCode: true, provider };
  }

  if (provider === 'resend') {
    const from = process.env.OTP_EMAIL_FROM || process.env.LEAD_NOTIFY_FROM || 'TIP-IT <onboarding@resend.dev>';
    const { text, html } = emailBody(code);
    const r = await post(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [destination], subject: `Tu código de TIP-IT: ${code}`, text, html }),
      },
      'resend'
    );
    if (!r.ok) logger.warn({ status: r.status, detail: r.body?.message }, 'otp email rejected by provider');
    return { ok: r.ok, ownsCode: true, provider, status: r.status };
  }

  if (provider === 'twilio') {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_VERIFY_SID: service } = process.env;
    const r = await post(
      `https://verify.twilio.com/v2/Services/${service}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: destination, Channel: channel, Locale: 'es-MX' }).toString(),
      },
      'twilio'
    );
    if (!r.ok) logger.warn({ status: r.status, code: r.body?.code }, 'otp sms rejected by provider');
    return { ok: r.ok, ownsCode: false, provider, status: r.status };
  }

  return { ok: false, ownsCode: true, provider: null };
}

// Only used when the provider holds the code (Twilio Verify).
async function checkWithProvider({ destination, code }) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_VERIFY_SID: service } = process.env;
  const r = await post(
    `https://verify.twilio.com/v2/Services/${service}/VerificationCheck`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: destination, Code: code }).toString(),
    },
    'twilio'
  );
  return r.ok && r.body?.status === 'approved';
}

module.exports = { deliver, checkWithProvider, providerFor, availableChannels, twilioConfigured, outbox };
