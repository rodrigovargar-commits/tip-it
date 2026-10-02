const asyncHandler = require('../utils/asyncHandler');
const Lead = require('../models/Lead');
const { notifyLead } = require('../utils/notifyLead');

// Public endpoint — no auth, no account created. Intentionally returns
// only success/failure, never the stored document (no reason for the
// public internet to read back what it just sent).
const createLead = asyncHandler(async (req, res) => {
  const { name, phone, category, zone, source } = req.body;
  const lead = await Lead.create({ name, phone, category, zone, source });
  // Fire-and-forget: the email is a convenience, never a reason to fail the request.
  notifyLead(lead).catch(() => {});
  res.status(201).json({ success: true, message: 'Gracias, te contactaremos pronto.' });
});

module.exports = { createLead };
