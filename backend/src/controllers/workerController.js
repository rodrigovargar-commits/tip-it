const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Worker = require('../models/Worker');
const User = require('../models/User');
const stripe = require('../config/stripe');
const { generateWorkerQR } = require('../utils/generateQR');

const registerWorker = asyncHandler(async (req, res) => {
  const { username, bio } = req.body;

  if (req.user.isWorker) {
    throw new AppError('Ya tienes una cuenta de trabajador', 409);
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

  res.json({
    success: true,
    worker: {
      id: worker._id,
      username: worker.username,
      bio: worker.bio,
      qrCode: worker.qrCode,
      rating: worker.rating,
      tipCount: worker.tipCount,
      name: worker.user?.name,
      avatarUrl: worker.user?.avatarUrl,
      readyForTips: Boolean(worker.stripeOnboardingComplete),
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
  await worker.save();

  res.json({ success: true, worker });
});

const createStripeOnboardingLink = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil de trabajador no encontrado', 404);

  if (!worker.stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: req.user.email,
      business_type: 'individual',
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    worker.stripeAccountId = account.id;
    await worker.save();
  }

  const accountLink = await stripe.accountLinks.create({
    account: worker.stripeAccountId,
    refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL,
    return_url: process.env.STRIPE_CONNECT_RETURN_URL,
    type: 'account_onboarding',
  });

  res.json({ success: true, url: accountLink.url });
});

const getStripeAccountStatus = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil de trabajador no encontrado', 404);

  if (!worker.stripeAccountId) {
    return res.json({ success: true, connected: false, onboardingComplete: false });
  }

  const account = await stripe.accounts.retrieve(worker.stripeAccountId);
  worker.stripeOnboardingComplete = Boolean(account.details_submitted && account.charges_enabled);
  await worker.save();

  res.json({
    success: true,
    connected: true,
    onboardingComplete: worker.stripeOnboardingComplete,
  });
});

module.exports = {
  registerWorker,
  getByUsername,
  getStats,
  updateWorkerProfile,
  createStripeOnboardingLink,
  getStripeAccountStatus,
};
