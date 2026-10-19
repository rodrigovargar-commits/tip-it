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

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, count: leads.length, leads });
});

// Mark a lead as contacted (or not) once someone has actually followed up —
// keeps /admin/stats' "uncontacted" count meaningful over time.
const updateLead = asyncHandler(async (req, res) => {
  if (typeof req.body.contacted !== 'boolean') {
    throw new AppError('contacted debe ser true o false', 400);
  }
  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { contacted: req.body.contacted },
    { new: true }
  );
  if (!lead) throw new AppError('No encontrado', 404);
  res.json({ success: true, lead });
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
// Cheqpay does the onboarding of each person. When it approves one, an admin
// records the result here: status 'submitted' | 'approved' | 'rejected' and, for
// approved, the id of the person's merchant at Cheqpay.
const updateCheqpayStatus = asyncHandler(async (req, res) => {
  const { status, merchantId } = req.body;
  if (!['submitted', 'approved', 'rejected'].includes(status)) throw new AppError('Estado inválido', 400);
  const worker = await Worker.findOne({ username: String(req.params.username).toLowerCase() });
  if (!worker) throw new AppError('Perfil no encontrado', 404);
  if (status === 'approved' && !/^[a-f\d]{24}$/i.test(String(merchantId || ''))) {
    throw new AppError('Para aprobar hace falta el merchant id de Cheqpay (24 caracteres)', 400);
  }
  worker.cheqpay.status = status;
  if (status === 'approved') worker.cheqpay.merchantId = String(merchantId);
  worker.cheqpay.updatedAt = new Date();
  await worker.save();
  res.json({ success: true, username: worker.username, status: worker.cheqpay.status, hasMerchant: Boolean(worker.cheqpay.merchantId) });
});

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
  updateCheqpayStatus,
  testEmail, getStats, getLeads, getSources, updateLead };
