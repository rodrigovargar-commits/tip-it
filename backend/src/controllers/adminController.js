const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');

// Simple key-gated stats endpoint — not a full admin/RBAC system, just
// enough to pull real numbers for metrics without exposing them publicly.
// Checked against ADMIN_STATS_KEY, set as an env var (never committed).
const getStats = asyncHandler(async (req, res) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!process.env.ADMIN_STATS_KEY || key !== process.env.ADMIN_STATS_KEY) {
    throw new AppError('No autorizado', 401);
  }

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

  res.json({
    success: true,
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
