const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const stripe = require('../config/stripe');
const { generateWorkerQR } = require('../utils/generateQR');

const registerWorker = asyncHandler(async (req, res) => {
  const { username, bio } = req.body;

  if (req.user.isWorker) {
    throw new AppError('Ya tienes una cuenta de trabajador', 409);
  }
  if (req.user.isGuest) {
    throw new AppError(
      'Primero completa tu cuenta con contraseña para poder recibir pagos',
      403
    );
  }

  const existing = await Worker.findOne({ username: username.toLowerCase() });
  if (existing) {
    throw new AppError('Ese username ya está en uso', 409);
  }

  const qrCode = await generateWorkerQR(username.toLowerCase());

  const worker = await Worker.create({
    user: req.user._id,
    username: username.toLowerCase(),
    bio: bio || '',
    qrCode,
  });

  req.user.isWorker = true;
  req.user.worker = worker._id;
  await req.user.save();

  res.status(201).json({ success: true, worker });
});

const getByUsername = asyncHandler(async (req, res) => {
  const worker = await Worker.findOne({ username: req.params.username.toLowerCase() }).populate(
    'user',
    'name avatarUrl'
  );

  if (!worker) {
    throw new AppError('Trabajador no encontrado', 404);
  }

  const reviews = await Transaction.find({
    worker: worker._id,
    status: 'succeeded',
    $or: [{ review: { $ne: '' } }, { rating: { $ne: null } }],
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('client', 'name')
    .select('rating review createdAt client');

  res.json({
    success: true,
    worker: {
      id: worker._id,
      username: worker.username,
      bio: worker.bio,
      experience: worker.experience,
      qrCode: worker.qrCode,
      rating: worker.rating,
      ratingCount: worker.ratingCount,
      tipCount: worker.tipCount,
      name: worker.user?.name,
      avatarUrl: worker.user?.avatarUrl,
      readyForTips: Boolean(worker.stripeOnboardingComplete),
      reviews: reviews.map((r) => ({
        rating: r.rating,
        review: r.review,
        clientName: r.client?.name?.split(' ')[0] || 'Cliente',
        createdAt: r.createdAt,
      })),
    },
  });
});

const getStats = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id);
  if (!worker) {
    throw new AppError('Trabajador no encontrado', 404);
  }
  if (!req.user.worker || String(req.user.worker) !== String(worker._id)) {
    throw new AppError('No autorizado para ver estas estadísticas', 403);
  }

  res.json({
    success: true,
    stats: {
      totalReceived: worker.totalReceived / 100,
      tipCount: worker.tipCount,
      rating: worker.rating,
      ratingCount: worker.ratingCount,
      stripeOnboardingComplete: worker.stripeOnboardingComplete,
    },
  });
});

const updateWorkerProfile = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil de trabajador no encontrado', 404);

  if (req.body.bio !== undefined) worker.bio = req.body.bio;
  if (req.body.experience !== undefined) worker.experience = req.body.experience;
  await worker.save();

  res.json({ success: true, worker });
});

async function createFreshStripeAccount(worker, email) {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    business_type: 'individual',
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
    // Daily is the fastest standard (free) payout schedule Stripe offers —
    // workers who want faster than that can use Instant Payouts instead,
    // paying Stripe's per-payout fee themselves via getConnectedBalance /
    // createInstantPayout below.
    settings: {
      payouts: { schedule: { interval: 'daily' } },
    },
  });
  worker.stripeAccountId = account.id;
  worker.stripeOnboardingComplete = false;
  await worker.save();
}

const createStripeOnboardingLink = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil de trabajador no encontrado', 404);

  if (!worker.stripeAccountId) {
    await createFreshStripeAccount(worker, req.user.email);
  }

  let accountLink;
  try {
    accountLink = await stripe.accountLinks.create({
      account: worker.stripeAccountId,
      refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL,
      return_url: process.env.STRIPE_CONNECT_RETURN_URL,
      type: 'account_onboarding',
    });
  } catch (err) {
    // Stale account id from a different Stripe mode/key — e.g. created
    // moments before switching from test to live keys, so it no longer
    // exists under the current key. Self-heal by creating a fresh one
    // instead of leaving the worker stuck.
    await createFreshStripeAccount(worker, req.user.email);
    accountLink = await stripe.accountLinks.create({
      account: worker.stripeAccountId,
      refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL,
      return_url: process.env.STRIPE_CONNECT_RETURN_URL,
      type: 'account_onboarding',
    });
  }

  res.json({ success: true, url: accountLink.url });
});

const getStripeAccountStatus = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil de trabajador no encontrado', 404);

  if (!worker.stripeAccountId) {
    return res.json({ success: true, connected: false, onboardingComplete: false });
  }

  let account;
  try {
    account = await stripe.accounts.retrieve(worker.stripeAccountId);
  } catch (err) {
    // Same orphaned-account case as above: treat as disconnected so the UI
    // offers "Conectar con Stripe" again instead of erroring out.
    worker.stripeAccountId = null;
    worker.stripeOnboardingComplete = false;
    await worker.save();
    return res.json({ success: true, connected: false, onboardingComplete: false });
  }

  worker.stripeOnboardingComplete = Boolean(account.details_submitted && account.charges_enabled);
  await worker.save();

  res.json({
    success: true,
    connected: true,
    onboardingComplete: worker.stripeOnboardingComplete,
  });
});

const getConnectedBalance = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil de trabajador no encontrado', 404);

  if (!worker.stripeAccountId) {
    return res.json({ success: true, available: 0, instantAvailable: 0, currency: 'mxn' });
  }

  const balance = await stripe.balance.retrieve({ stripeAccount: worker.stripeAccountId });
  const available = balance.available.find((b) => b.currency === 'mxn');
  // instant_available may be entirely absent if the account has no debit
  // card eligible for Instant Payouts on file — that's a normal state, not
  // an error, so this just reports 0 rather than throwing.
  const instant = (balance.instant_available || []).find((b) => b.currency === 'mxn');

  res.json({
    success: true,
    available: available ? available.amount : 0,
    instantAvailable: instant ? instant.amount : 0,
    currency: 'mxn',
  });
});

const createInstantPayout = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil de trabajador no encontrado', 404);
  if (!worker.stripeAccountId) {
    throw new AppError('No tienes una cuenta de Stripe conectada', 400);
  }

  const balance = await stripe.balance.retrieve({ stripeAccount: worker.stripeAccountId });
  const instant = (balance.instant_available || []).find((b) => b.currency === 'mxn');
  const amount = instant ? instant.amount : 0;

  if (amount < 1) {
    throw new AppError('No tienes saldo disponible para retiro instantáneo', 400);
  }

  const payout = await stripe.payouts.create(
    { amount, currency: 'mxn', method: 'instant' },
    { stripeAccount: worker.stripeAccountId }
  );

  res.json({
    success: true,
    payout: { id: payout.id, amount: payout.amount, arrivalDate: payout.arrival_date },
  });
});

module.exports = {
  registerWorker,
  getByUsername,
  getStats,
  updateWorkerProfile,
  createStripeOnboardingLink,
  getStripeAccountStatus,
  getConnectedBalance,
  createInstantPayout,
};
