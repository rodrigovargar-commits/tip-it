const asyncHandler = require('../utils/asyncHandler');
const Lead = require('../models/Lead');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { notifyLead } = require('../utils/notifyLead');
const { categoryFromText, cleanInstagram } = require('../utils/leadFields');

// Public endpoint — no auth, no account created. Intentionally returns
// only success/failure, never the stored document (no reason for the
// public internet to read back what it just sent).
const createLead = asyncHandler(async (req, res) => {
  const { name, phone, email, category, zone, source, website } = req.body;
  // Honeypot: real people never see this field. Answer "success" so a bot
  // gets no signal to adapt to, but store and email nothing.
  if (typeof website === 'string' && website.trim() !== '') {
    return res.status(201).json({ success: true, message: 'Gracias, te contactaremos pronto.' });
  }
  const lead = await Lead.create({ name, phone, email, category, zone, source });
  // Fire-and-forget: the email is a convenience, never a reason to fail the request.
  notifyLead(lead).catch(() => {});
  res.status(201).json({ success: true, message: 'Gracias, te contactaremos pronto.' });
});

function sameSecret(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ManyChat "External Request" step: when someone leaves their data in an
// Instagram/WhatsApp/Messenger chat, ManyChat posts it here and it shows up
// in the admin portal like any other lead. Protected by a shared secret sent
// in the X-Manychat-Secret header (MANYCHAT_SECRET env var); with no secret
// configured the endpoint is closed. The same person writing again updates
// their lead instead of creating a duplicate.
const createLeadFromManychat = asyncHandler(async (req, res) => {
  const expected = process.env.MANYCHAT_SECRET;
  if (!expected || !sameSecret(req.headers['x-manychat-secret'], expected)) {
    throw new AppError('No autorizado', 401);
  }
  const b = req.body || {};
  const instagram = cleanInstagram(b.instagram);
  const phone = String(b.phone || '').trim().slice(0, 30);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  if (!instagram && !phone && !email) {
    throw new AppError('Hace falta instagram, teléfono o correo', 400);
  }
  const match = [instagram && { instagram }, phone && { phone }, email && { email }].filter(Boolean);
  let lead = await Lead.findOne({ $or: match });
  const isNew = !lead;
  if (!lead) {
    lead = new Lead({ name: String(b.name || instagram || 'Sin nombre').trim().slice(0, 100), category: 'otro' });
  }
  if (b.name && String(b.name).trim()) lead.name = String(b.name).trim().slice(0, 100);
  if (instagram) lead.instagram = instagram;
  if (phone) lead.phone = phone;
  if (email) lead.email = email;
  if (b.category) lead.category = categoryFromText(b.category);
  if (b.zone) lead.zone = String(b.zone).trim().slice(0, 100);
  // A new chat lead is tagged "manychat" unless the flow names its own tag;
  // a returning person keeps the source they first came from.
  if (b.source && String(b.source).trim()) lead.source = String(b.source).trim().slice(0, 50);
  else if (isNew) lead.source = 'manychat';
  if (b.message && String(b.message).trim()) lead.notes.push({ text: `Chat: ${String(b.message).trim().slice(0, 480)}` });
  await lead.save();
  if (isNew) notifyLead(lead).catch(() => {});
  res.status(isNew ? 201 : 200).json({ success: true, created: isNew });
});

module.exports = { createLead, createLeadFromManychat };
