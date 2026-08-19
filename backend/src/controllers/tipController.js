const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const stripe = require('../config/stripe');
const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');
const markTransactionSucceeded = require('../utils/markTransactionSucceeded');

const FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 8);
const FEE_FIXED_CENTS = Math.round(Number(process.env.PLATFORM_FEE_FIXED_CENTS || 300));

// Fee is charged on the tip amount the client intends to give, not on the
// grossed-up total — so the preview shown before payment always matches
// what's actually deducted, regardless of who ends up paying it.
function calculateFee(tipCents) {
  return Math.round((tipCents * FEE_PERCENT) / 100) + FEE_FIXED_CENTS;
}

const getFeeInfo = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    feePercent: FEE_PERCENT,
    feeFixedCents: FEE_FIXED_CENTS,
  });
});

const createIntent = asyncHandler(async (req, res) => {
  const { username, amount, comment, coverFee } = req.body;

  const worker = await Worker.findOne({ username: String(username).toLowerCase() });
  if (!worker) {
    throw new AppError('Trabajador no encontrado', 404);
  }
  if (!worker.stripeAccountId || !worker.stripeOnboardingComplete) {
    throw new AppError('Este trabajador aún no puede recibir propinas', 400);
  }
  if (String(worker.user) === String(req.user._id)) {
    throw new AppError('No puedes enviarte propina a ti mismo', 400);
  }

  const tipCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(tipCents) || tipCents < 100) {
    throw new AppError('El monto mínimo es de 1.00', 400);
  }

  const platformFeeCents = calculateFee(tipCents);

  // Sin "cubrir comisión": el trabajador recibe la propina menos la comisión.
  // Con "cubrir comisión": el cliente paga la propina + comisión encima, y
  // el trabajador recibe el 100% del monto que el cliente quiso dar.
  const amountCents = coverFee ? tipCents + platformFeeCents : tipCents;
  const netAmountCents = amountCents - platformFeeCents;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'mxn',
    application_fee_amount: platformFeeCents,
    transfer_data: { destination: worker.stripeAccountId },
    automatic_payment_methods: { enabled: true },
    metadata: {
      workerId: String(worker._id),
      clientId: String(req.user._id),
    },
  });

  const transaction = await Transaction.create({
    worker: worker._id,
    client: req.user._id,
    amount: amountCents,
    platformFee: platformFeeCents,
    netAmount: netAmountCents,
    coverFee: Boolean(coverFee),
    stripePaymentIntentId: paymentIntent.id,
    comment: comment || '',
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    transactionId: transaction._id,
    amount: amountCents,
    platformFee: platformFeeCents,
    netAmount: netAmountCents,
  });
});

const confirm = asyncHandler(async (req, res) => {
  const { paymentIntentId, rating, review } = req.body;

  const transaction = await Transaction.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!transaction) {
    throw new AppError('Transacción no encontrada', 404);
  }
  if (String(transaction.client) !== String(req.user._id)) {
    throw new AppError('No autorizado', 403);
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (rating !== undefined) transaction.rating = rating;
  if (review !== undefined) transaction.review = review;
  await transaction.save();

  if (paymentIntent.status === 'succeeded') {
    // Stripe's webhook may be racing to mark this same transaction succeeded
    // right now — the shared helper guarantees only one of them counts it.
    await markTransactionSucceeded(transaction._id);
  }

  const fresh = await Transaction.findById(transaction._id);
  res.json({ success: true, transaction: fresh });
});

const getHistory = asyncHandler(async (req, res) => {
  const role = req.query.role === 'worker' ? 'worker' : 'client';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);

  let filter;
  if (role === 'worker') {
    if (!req.user.isWorker || !req.user.worker) {
      throw new AppError('No tienes una cuenta de trabajador', 403);
    }
    filter = { worker: req.user.worker };
  } else {
    filter = { client: req.user._id };
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(role === 'worker' ? 'client' : 'worker', role === 'worker' ? 'name' : 'username bio'),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

module.exports = { getFeeInfo, createIntent, confirm, getHistory };
