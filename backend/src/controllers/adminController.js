const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');
const Lead = require('../models/Lead');

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

module.exports = { getStats, getLeads, updateLead };
