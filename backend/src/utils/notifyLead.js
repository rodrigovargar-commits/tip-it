const { logger } = require('./logger');

// Emails the owner when someone leaves their data on /unete, so a lead never
// waits unseen in the database. Uses Resend's HTTPS API (no SMTP, no extra
// dependency). Entirely optional: with RESEND_API_KEY or LEAD_NOTIFY_EMAIL
// unset it does nothing, and a failure here must never break saving the lead
// — the lead is already stored by the time this runs.
const CATEGORY_LABELS = {
  barbero_estilista: 'Barbero / estilista',
  musico_artista: 'Músico / artista callejero',
  puesto_comida: 'Puesto de comida',
  otro: 'Otro servicio',
};

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Mexican mobile numbers are usually typed as 10 digits; wa.me wants the
// country code in front.
function whatsappLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  const full = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${full}`;
}

// Sends the email and reports exactly what happened (never any secret), so a
// problem like "the provider rejected it" can be seen instead of guessed.
async function sendLeadEmail(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.LEAD_NOTIFY_EMAIL || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const from = process.env.LEAD_NOTIFY_FROM || 'TIP-IT <onboarding@resend.dev>';
  if (!apiKey || to.length === 0) {
    return { configured: false, ok: false, error: 'Faltan RESEND_API_KEY o LEAD_NOTIFY_EMAIL en el servidor' };
  }

  const category = CATEGORY_LABELS[lead.category] || lead.category;
  const wa = whatsappLink(lead.phone);
  const when = new Date(lead.createdAt || Date.now()).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
  });

  const text = [
    `Nuevo registro desde la página de TIP-IT`,
    ``,
    `Nombre: ${lead.name}`,
    `Correo: ${lead.email || '—'}`,
    ...(lead.phone ? [`Teléfono: ${lead.phone}${wa ? ` (${wa})` : ''}`] : []),
    `A qué se dedica: ${category}`,
    `Zona: ${lead.zone || '—'}`,
    `Llegó desde: ${lead.source || 'landing'}`,
    `Fecha: ${when}`,
  ].join('\n');

  const btn =
    'background:#FF8243;color:#0A2F2F;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700;border:2px solid #0A2F2F';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;color:#0A2F2F">
      <h2 style="margin:0 0 12px">Nuevo registro 🧡</h2>
      <p style="margin:0 0 16px">Alguien quiere ayuda con su cuenta y su QR de TIP-IT:</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 0;color:#5F7371">Nombre</td><td><b>${escapeHtml(lead.name)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Correo</td><td>${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>` : '—'}</td></tr>
        ${lead.phone ? `<tr><td style="padding:6px 0;color:#5F7371">Teléfono</td><td>${escapeHtml(lead.phone)}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#5F7371">Se dedica a</td><td>${escapeHtml(category)}</td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Zona</td><td>${escapeHtml(lead.zone || '—')}</td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Llegó desde</td><td>${escapeHtml(lead.source || 'landing')}</td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Fecha</td><td>${escapeHtml(when)}</td></tr>
      </table>
      ${lead.email ? `<p style="margin-top:20px"><a href="mailto:${escapeHtml(lead.email)}" style="${btn}">Responderle por correo</a></p>` : ''}
      ${!lead.email && wa ? `<p style="margin-top:20px"><a href="${wa}" style="${btn}">Escribirle por WhatsApp</a></p>` : ''}
    </div>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: `Nuevo registro: ${lead.name} · ${category}`,
        ...(lead.email ? { reply_to: lead.email } : {}),
        text,
        html,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body.message || body.name || '';
      } catch {
        // body was not JSON; the status code is enough
      }
      logger.warn({ status: res.status, detail }, 'lead notification email rejected by provider');
      return { configured: true, ok: false, status: res.status, error: detail || `El proveedor respondió ${res.status}`, from, to };
    }
    return { configured: true, ok: true, status: res.status, from, to };
  } catch (err) {
    logger.warn({ reason: err.name }, 'lead notification email failed');
    return { configured: true, ok: false, error: err.name === 'AbortError' ? 'Se agotó el tiempo esperando a Resend' : err.message, from, to };
  } finally {
    clearTimeout(timer);
  }
}

async function notifyLead(lead) {
  return (await sendLeadEmail(lead)).ok;
}

module.exports = { notifyLead, sendLeadEmail, whatsappLink };
