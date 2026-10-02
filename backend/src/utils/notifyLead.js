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

async function notifyLead(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.LEAD_NOTIFY_EMAIL || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (!apiKey || to.length === 0) return false;

  const category = CATEGORY_LABELS[lead.category] || lead.category;
  const subjectWho = lead.name;
  const wa = whatsappLink(lead.phone);
  const when = new Date(lead.createdAt || Date.now()).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
  });

  const text = [
    `Nuevo registro desde /unete`,
    ``,
    `Nombre: ${lead.name}`,
    `WhatsApp / teléfono: ${lead.phone ? `${lead.phone}${wa ? ` (${wa})` : ''}` : '—'}`,
    `Correo: ${lead.email || '—'}`,
    `A qué se dedica: ${category}`,
    `Zona: ${lead.zone || '—'}`,
    `Llegó desde: ${lead.source || 'landing'}`,
    `Fecha: ${when}`,
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;color:#0A2F2F">
      <h2 style="margin:0 0 12px">Nuevo registro 🧡</h2>
      <p style="margin:0 0 16px">Alguien quiere su QR de TIP-IT:</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 0;color:#5F7371">Nombre</td><td><b>${escapeHtml(lead.name)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">WhatsApp</td><td><b>${escapeHtml(lead.phone || '—')}</b></td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Correo</td><td>${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>` : '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Se dedica a</td><td>${escapeHtml(category)}</td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Zona</td><td>${escapeHtml(lead.zone || '—')}</td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Llegó desde</td><td>${escapeHtml(lead.source || 'landing')}</td></tr>
        <tr><td style="padding:6px 0;color:#5F7371">Fecha</td><td>${escapeHtml(when)}</td></tr>
      </table>
      ${wa ? `<p style="margin-top:20px"><a href="${wa}" style="background:#FF8243;color:#0A2F2F;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700;border:2px solid #0A2F2F">Escribirle por WhatsApp</a></p>` : ''}
      ${!wa && lead.email ? `<p style="margin-top:20px"><a href="mailto:${escapeHtml(lead.email)}" style="background:#FF8243;color:#0A2F2F;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700;border:2px solid #0A2F2F">Responderle por correo</a></p>` : ''}
    </div>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.LEAD_NOTIFY_FROM || 'TIP-IT <onboarding@resend.dev>',
        to,
        subject: `Nuevo registro: ${subjectWho} · ${category}`,
        ...(lead.email ? { reply_to: lead.email } : {}),
        text,
        html,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'lead notification email rejected by provider');
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ reason: err.name }, 'lead notification email failed');
    return false;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { notifyLead, whatsappLink };
