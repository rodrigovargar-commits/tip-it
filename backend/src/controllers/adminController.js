const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logSecurityEvent } = require('../utils/logger');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');

// Simple key-gated stats endpoint — not a full admin/RBAC system, just
// enough to pull real numbers for metrics without exposing them publicly.
// Checked against ADMIN_STATS_KEY, set as an env var (never committed).
const getStats = asyncHandler(async (req, res) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!process.env.ADMIN_STATS_KEY || key !== process.env.ADMIN_STATS_KEY) {
    // No actor_id — this route has no concept of an authenticated user,
    // only a shared key. source_ip is the only identity we have for it.
    logSecurityEvent({
      event: 'admin.access',
      outcome: 'failure',
      sourceIp: req.ip,
      target: 'admin:stats',
      reason: 'bad_or_missing_key',
    });
    throw new AppError('No autorizado', 401);
  }

  logSecurityEvent({
    event: 'admin.access',
    outcome: 'success',
    sourceIp: req.ip,
    target: 'admin:stats',
  });

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

module.exports = { getStats };
