const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const stripe = require('../config/stripe');
const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');

const FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 5);

const createIntent = asyncHandler(async (req, res) => {
  const { username, amount, comment } = req.body;

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

  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    throw new AppError('El monto mínimo es de 1.00', 400);
  }

  const platformFeeCents = Math.round((amountCents * FEE_PERCENT) / 100);
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
    stripePaymentIntentId: paymentIntent.id,
    comment: comment || '',
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    transactionId: transaction._id,
  });
});

const confirm = asyncHandler(async (req, res) => {
  const { paymentIntentId, rating, comment } = req.body;

  const transaction = await Transaction.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!transaction) {
    throw new AppError('Transacción no encontrada', 404);
  }
  if (String(transaction.client) !== String(req.user._id)) {
    throw new AppError('No autorizado', 403);
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const wasSucceeded = transaction.status === 'succeeded';
  transaction.status = paymentIntent.status === 'succeeded' ? 'succeeded' : transaction.status;
  if (rating !== undefined) transaction.rating = rating;
  if (comment !== undefined) transaction.comment = comment;
  await transaction.save();

  if (!wasSucceeded && transaction.status === 'succeeded') {
    const update = {
      $inc: {
        totalReceived: transaction.netAmount,
        tipCount: 1,
      },
    };
    if (transaction.rating) {
      update.$inc.ratingSum = transaction.rating;
      update.$inc.ratingCount = 1;
    }
    await Worker.findByIdAndUpdate(transaction.worker, update);
  }

  res.json({ success: true, transaction });
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

module.exports = { createIntent, confirm, getHistory };
