const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');
const Lead = require('../models/Lead');
const Visit = require('../models/Visit');
const { sendLeadEmail } = require('../utils/notifyLead');
const ensureWorkerQRs = require('../utils/ensureWorkerQRs');
const { publicBaseUrl } = require('../utils/publicUrl');
const stripe = require('../config/stripe');
const Recognition = require('../models/Recognition');
const { availableChannels, providerFor } = require('../utils/otp/providers');
const { sendCode } = require('../utils/otp/service');
const { LEAD_STAGES } = require('../models/Lead');
const { categoryFromText, cleanInstagram } = require('../utils/leadFields');

const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    guestUsers,
    fullUsers,
    totalWorkers,
    readyWorkers,
    totalTransactions,
    succeededTransactions,
    pendingTransactions,
    volumeAgg,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isGuest: true }),
    User.countDocuments({ isGuest: false }),
    Worker.countDocuments({}),
    Worker.countDocuments({ stripeOnboardingComplete: true }),
    Transaction.countDocuments({}),
    Transaction.countDocuments({ status: 'succeeded' }),
    Transaction.countDocuments({ status: 'pending' }),
    Transaction.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, gross: { $sum: '$amount' }, net: { $sum: '$netAmount' } } },
    ]),
  ]);

  // Worker funnel (read-only, straight from the DB — no client tracking needed):
  // registered -> onboarding done -> first real tip -> 5+ tips (activated).
  const tipsPerWorker = await Transaction.aggregate([
    { $match: { status: 'succeeded' } },
    { $group: { _id: '$worker', tips: { $sum: 1 } } },
  ]);
  const withFirstTip = tipsPerWorker.length;
  const withFivePlus = tipsPerWorker.filter((w) => w.tips >= 5).length;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [newWorkers7d, newUsers7d, tips7d] = await Promise.all([
    Worker.countDocuments({ createdAt: { $gte: weekAgo } }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    Transaction.countDocuments({ status: 'succeeded', createdAt: { $gte: weekAgo } }),
  ]);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  // Marketing landing (interest only, no account created) — measured
  // separately from the real worker funnel above. Counts only; the actual
  // names/phones to contact live at GET /api/admin/leads.
  const [totalLeads, leadsByCategory, leads7d, uncontactedLeads] = await Promise.all([
    Lead.countDocuments({}),
    Lead.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Lead.countDocuments({ createdAt: { $gte: weekAgo } }),
    Lead.countDocuments({ contacted: false }),
  ]);

  res.json({
    success: true,
    funnel: {
      workersRegistered: totalWorkers,
      onboardingComplete: readyWorkers,
      firstTipReceived: withFirstTip,
      fivePlusTips: withFivePlus,
      conversionPct: {
        registeredToOnboarded: pct(readyWorkers, totalWorkers),
        onboardedToFirstTip: pct(withFirstTip, readyWorkers),
        firstTipToFivePlus: pct(withFivePlus, withFirstTip),
      },
      last7Days: { newUsers: newUsers7d, newWorkers: newWorkers7d, succeededTips: tips7d },
    },
    leads: {
      total: totalLeads,
      uncontacted: uncontactedLeads,
      last7Days: leads7d,
      byCategory: Object.fromEntries(leadsByCategory.map((c) => [c._id, c.count])),
    },
    users: { total: totalUsers, guests: guestUsers, full: fullUsers },
    workers: { total: totalWorkers, readyForTips: readyWorkers },
    transactions: {
      total: totalTransactions,
      succeeded: succeededTransactions,
      pending: pendingTransactions,
      grossMXN: (volumeAgg[0]?.gross || 0) / 100,
      netMXN: (volumeAgg[0]?.net || 0) / 100,
    },
  });
});

// The actual contact list from the /unete landing — name, phone, category,
// zone — so a real person can follow up on WhatsApp. Newest first, capped
// at 200 per page (?before=<ISO date> to paginate further back).
// Ads report: for every source tag, how many sessions reached the site, how
// many left their details on /unete, and how many created an account. Visits
// are counted by our own server, so they do not depend on cookies or Analytics.
const getSources = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [visits, leads, users] = await Promise.all([
    Visit.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$source', n: { $sum: 1 } } }]),
    Lead.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$source', n: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { createdAt: { $gte: since }, isGuest: false } },
      { $group: { _id: { $ifNull: ['$source', ''] }, n: { $sum: 1 } } },
    ]),
  ]);
  const rows = {};
  const row = (k) => (rows[k] = rows[k] || { source: k, visits: 0, leads: 0, accounts: 0 });
  visits.forEach((v) => (row(v._id || 'directo').visits = v.n));
  leads.forEach((v) => (row(v._id || 'directo').leads = v.n));
  users.forEach((v) => (row(v._id || 'directo').accounts = v.n));
  const sources = Object.values(rows).sort((a, b) => b.visits - a.visits);
  res.json({ success: true, days, sources });
});

const getLeads = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (!Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.contacted === 'true') filter.contacted = true;
  if (req.query.contacted === 'false') filter.contacted = false;
  if (LEAD_STAGES.includes(req.query.stage)) filter.stage = req.query.stage;

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(200).lean();

  // Did this lead go on to create an account, and has it received tips?
  // Matched by email, the one field both sides always have.
  const emails = [...new Set(leads.map((l) => l.email).filter(Boolean))];
  const users = emails.length
    ? await User.find({ email: { $in: emails }, isGuest: false }).select('email worker').populate('worker', 'username tipCount stripeOnboardingComplete').lean()
    : [];
  const byEmail = new Map(users.map((u) => [u.email, u]));
  leads.forEach((l) => {
    const u = byEmail.get(l.email);
    l.account = u
      ? {
          username: u.worker?.username || null,
          ready: Boolean(u.worker?.stripeOnboardingComplete),
          tips: u.worker?.tipCount || 0,
        }
      : null;
    l.stage = l.stage || (l.contacted ? 'contactado' : 'nuevo');
  });
  res.json({ success: true, count: leads.length, leads });
});

// Moves a lead along the follow-up pipeline: stage, next follow-up date, the
// objection they gave, and a dated note. `contacted` alone still works for the
// older callers and moves a "nuevo" lead to "contactado".
const updateLead = asyncHandler(async (req, res) => {
  const { contacted, stage, nextFollowUp, objection, note, phone, instagram } = req.body || {};
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new AppError('No encontrado', 404);
  // Leads saved before the pipeline existed have no stage: derive it once.
  if (lead.$isDefault('stage') && lead.contacted) lead.stage = 'contactado';

  let changed = false;
  if (contacted !== undefined) {
    if (typeof contacted !== 'boolean') throw new AppError('contacted debe ser true o false', 400);
    lead.contacted = contacted;
    if (contacted && (lead.stage || 'nuevo') === 'nuevo') lead.stage = 'contactado';
    if (!contacted) lead.stage = 'nuevo';
    changed = true;
  }
  if (stage !== undefined) {
    if (!LEAD_STAGES.includes(stage)) throw new AppError('Etapa inválida', 400);
    lead.stage = stage;
    changed = true;
  }
  if (nextFollowUp !== undefined) {
    if (nextFollowUp === null || nextFollowUp === '') {
      lead.nextFollowUp = null;
    } else {
      const d = new Date(nextFollowUp);
      if (Number.isNaN(d.getTime())) throw new AppError('Fecha de seguimiento inválida', 400);
      lead.nextFollowUp = d;
    }
    changed = true;
  }
  if (objection !== undefined) {
    lead.objection = String(objection).slice(0, 200);
    changed = true;
  }
  if (phone !== undefined) {
    lead.phone = String(phone).slice(0, 30);
    changed = true;
  }
  if (instagram !== undefined) {
    lead.instagram = cleanInstagram(instagram);
    changed = true;
  }
  if (typeof note === 'string' && note.trim()) {
    lead.notes.push({ text: note.trim().slice(0, 500) });
    changed = true;
  }
  if (!changed) throw new AppError('No hay nada que actualizar', 400);
  await lead.save();
  res.json({ success: true, lead });
});

// A prospect found outside the website (a visit in person, an Instagram DM,
// a referral) added by hand from the portal.
const createLeadAdmin = asyncHandler(async (req, res) => {
  const { name, phone, email, instagram, category, zone, source, note, nextFollowUp } = req.body || {};
  if (!name || !String(name).trim()) throw new AppError('El nombre es obligatorio', 400);
  const lead = new Lead({
    name: String(name).slice(0, 100),
    phone: String(phone || '').slice(0, 30),
    email: String(email || '').slice(0, 120),
    instagram: cleanInstagram(instagram),
    category: categoryFromText(category),
    zone: String(zone || '').slice(0, 100),
    source: String(source || 'visita').slice(0, 50),
    nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
    notes: note && String(note).trim() ? [{ text: String(note).trim().slice(0, 500) }] : [],
  });
  if (lead.nextFollowUp && Number.isNaN(lead.nextFollowUp.getTime())) lead.nextFollowUp = null;
  try {
    await lead.save();
  } catch (err) {
    if (err.name === 'ValidationError') {
      throw new AppError(Object.values(err.errors)[0]?.message || 'Datos inválidos', 400);
    }
    throw err;
  }
  res.status(201).json({ success: true, lead });
});

// Everyone who opened a receiving account, with how far they got: bank
// connected, tips received and the date of the last one. This is the list to
// follow up for activation (an account with no tips is not a user yet).
const getUsers = asyncHandler(async (req, res) => {
  const workers = await Worker.find({})
    .sort({ createdAt: -1 })
    .limit(300)
    .select('user username publicName activity stripeOnboardingComplete tipCount createdAt')
    .populate('user', 'name email phone source createdAt')
    .lean();
  const last = await Transaction.aggregate([
    { $match: { status: 'succeeded', worker: { $in: workers.map((w) => w._id) } } },
    { $group: { _id: '$worker', lastTipAt: { $max: '$createdAt' }, tips: { $sum: 1 } } },
  ]);
  const byWorker = new Map(last.map((t) => [String(t._id), t]));
  res.json({
    success: true,
    users: workers.map((w) => {
      const t = byWorker.get(String(w._id));
      return {
        id: w._id,
        username: w.username,
        name: w.publicName || w.user?.name || w.username,
        email: w.user?.email || '',
        phone: w.user?.phone || '',
        source: w.user?.source || '',
        activity: w.activity || '',
        ready: Boolean(w.stripeOnboardingComplete),
        tips: t?.tips || 0,
        lastTipAt: t?.lastTipAt || null,
        createdAt: w.createdAt,
      };
    }),
  });
});

// Sends one sample "new registration" email right now and returns what the
// email provider answered (no secrets), so a setup problem can be diagnosed
// from the browser: /api/admin/test-email?key=...
const testEmail = asyncHandler(async (req, res) => {
  const result = await sendLeadEmail({
    name: 'Prueba de TIP-IT',
    email: 'prueba@example.com',
    category: 'barbero_estilista',
    zone: 'Coyoacán',
    source: 'prueba_admin',
    createdAt: new Date(),
  });
  res.json({
    success: result.ok,
    configured: {
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      LEAD_NOTIFY_EMAIL: Boolean(process.env.LEAD_NOTIFY_EMAIL),
      LEAD_NOTIFY_FROM: process.env.LEAD_NOTIFY_FROM || 'TIP-IT <onboarding@resend.dev> (por defecto)',
    },
    result,
  });
});

// Rebuilds every worker's QR from the current public address.
// /api/admin/regenerate-qrs?key=...  (add &force=1 to rebuild even the ones that look right)
const regenerateQrs = asyncHandler(async (req, res) => {
  const result = await ensureWorkerQRs({ force: req.query.force === '1' });
  res.json({ success: true, publicUrl: publicBaseUrl(), ...result });
});

// What the app and Stripe each think about one person's ability to get tips.
// /api/admin/worker-status?username=rovargas&key=...   (no account ids or secrets in the answer)
const workerStatus = asyncHandler(async (req, res) => {
  const username = String(req.query.username || '').toLowerCase();
  const worker = await Worker.findOne({ username });
  if (!worker) throw new AppError('No existe ese username', 404);

  const key = process.env.STRIPE_SECRET_KEY || '';
  const out = {
    success: true,
    username,
    serverStripeMode: key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test' : 'no configurada',
    appSaysReady: Boolean(worker.stripeOnboardingComplete),
    hasStripeAccount: Boolean(worker.stripeAccountId),
    tipCount: worker.tipCount,
  };

  if (worker.stripeAccountId) {
    try {
      const a = await stripe.accounts.retrieve(worker.stripeAccountId);
      out.stripe = {
        details_submitted: a.details_submitted,
        charges_enabled: a.charges_enabled,
        payouts_enabled: a.payouts_enabled,
        disabled_reason: a.requirements?.disabled_reason || null,
        requirements_due: a.requirements?.currently_due || [],
        pending_verification: a.requirements?.pending_verification || [],
      };
      out.stripeSaysReady = Boolean(a.details_submitted && a.charges_enabled);
    } catch (err) {
      out.stripeError = err.message;
    }
  }
  res.json(out);
});

// Recognitions left without paying wait here until someone approves them.
const getRecognitions = asyncHandler(async (req, res) => {
  const status = ['pending', 'published', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const items = await Recognition.find({ status })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('worker', 'username');
  res.json({
    success: true,
    status,
    recognitions: items.map((r) => ({
      id: r._id,
      worker: r.worker?.username,
      rating: r.rating,
      comment: r.comment,
      alias: r.alias,
      createdAt: r.createdAt,
    })),
  });
});

const moderateRecognition = asyncHandler(async (req, res) => {
  const status = req.body?.status || req.query.status;
  if (!['published', 'rejected'].includes(status)) {
    throw new AppError('status debe ser published o rejected', 400);
  }
  const rec = await Recognition.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!rec) throw new AppError('No encontrado', 404);
  res.json({ success: true, id: rec._id, status: rec.status });
});

// Which ways of sending a code are configured, and (with ?to=) a real test
// send, without ever revealing a key or the code itself.
const otpStatus = asyncHandler(async (req, res) => {
  const channels = ['email', 'sms', 'whatsapp'].map((c) => ({ channel: c, provider: providerFor(c) || 'not_configured' }));
  const out = { success: true, available: availableChannels(), channels, required: process.env.OTP_REQUIRED === 'true' };
  if (req.query.to && req.query.channel) {
    try {
      const r = await sendCode({ channel: req.query.channel, destination: req.query.to, purpose: 'register' });
      out.test = { sent: true, to: r.destination };
    } catch (err) {
      out.test = { sent: false, error: err.message };
    }
  }
  res.json(out);
});

module.exports = {
  getRecognitions,
  moderateRecognition,
  otpStatus,
  workerStatus,
  regenerateQrs,
  testEmail, getStats, getLeads, getSources, updateLead, createLeadAdmin, getUsers };
