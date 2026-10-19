const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const stripe = require('../config/stripe');
const { providerName, canReceiveTips } = require('../payments/provider');
const cheqpayFee = require('../payments/cheqpay/fee');
const cheqpay = require('../payments/cheqpay/client');
const { publicBaseUrl } = require('../utils/publicUrl');
const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');
const markTransactionSucceeded = require('../utils/markTransactionSucceeded');
const { countRating } = markTransactionSucceeded;

const FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 8);
const MAX_TIP_CENTS = 500000; // $5,000.00
const FEE_FIXED_CENTS = Math.round(Number(process.env.PLATFORM_FEE_FIXED_CENTS || 300));

// Fee is charged on the tip amount the client intends to give, not on the
// grossed-up total — so the preview shown before payment always matches
// what's actually deducted, regardless of who ends up paying it.
function calculateFee(tipCents) {
  return Math.round((tipCents * FEE_PERCENT) / 100) + FEE_FIXED_CENTS;
}

const CHEQPAY_MIN_CENTS = Math.round(Number(process.env.CHEQPAY_MIN_CHARGE_CENTS || 2000)); // $20.00

const getFeeInfo = asyncHandler(async (req, res) => {
  if (providerName() === 'cheqpay') {
    res.json({
      success: true,
      provider: 'cheqpay',
      // One rate on the whole charge (percent + fixed), see payments/cheqpay/fee.js.
      feePercent: Number(process.env.CHEQPAY_FEE_PERCENT || 3.3),
      feeFixedCents: Math.round(Number(process.env.CHEQPAY_FEE_FIXED_CENTS || 130)),
      minCents: CHEQPAY_MIN_CENTS,
    });
    return;
  }
  res.json({
    success: true,
    provider: 'stripe',
    feePercent: FEE_PERCENT,
    feeFixedCents: FEE_FIXED_CENTS,
  });
});

const createIntent = asyncHandler(async (req, res) => {
  if (providerName() !== 'stripe') throw new AppError('Este método de pago no está disponible', 400);
  const { username, amount, comment, coverFee } = req.body;

  const worker = await Worker.findOne({ username: String(username).toLowerCase() });
  if (!worker) {
    throw new AppError('No encontramos a ese Tip-er', 404);
  }
  if (!worker.stripeAccountId || !worker.stripeOnboardingComplete) {
    throw new AppError('Esta persona no puede recibir propinas por ahora.', 400);
  }
  if (req.user && String(worker.user) === String(req.user._id)) {
    throw new AppError('No puedes enviarte propina a ti mismo', 400);
  }

  const tipCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(tipCents) || tipCents < 100) {
    throw new AppError('El monto mínimo es de 1.00', 400);
  }

  if (tipCents > MAX_TIP_CENTS) {
    throw new AppError('El importe máximo es de 5,000.00', 400);
  }

  const platformFeeCents = calculateFee(tipCents);

  // Sin "cubrir comisión": el trabajador recibe la propina menos la comisión.
  // Con "cubrir comisión": el cliente paga la propina + comisión encima, y
  // el trabajador recibe el 100% del monto que el cliente quiso dar.
  const amountCents = coverFee ? tipCents + platformFeeCents : tipCents;
  const netAmountCents = amountCents - platformFeeCents;

  // If the commission would eat the whole tip, refuse instead of charging
  // someone for nothing. The person can raise the amount or cover the cost —
  // the app never switches that on for them.
  if (netAmountCents <= 0) {
    throw new AppError(
      'Con ese importe no alcanza para cubrir el procesamiento. Elige un monto mayor o cubre el costo.',
      400
    );
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'mxn',
    application_fee_amount: platformFeeCents,
    transfer_data: { destination: worker.stripeAccountId },
    // Cards only (Apple Pay and Google Pay are card wallets). Must match the
    // payment method types the checkout page asks Stripe Elements for.
    payment_method_types: ['card'],
    metadata: {
      workerId: String(worker._id),
      clientId: req.user ? String(req.user._id) : 'anonymous',
    },
  });

  const transaction = await Transaction.create({
    worker: worker._id,
    client: req.user ? req.user._id : null,
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

// Cheqpay: the person pays on Cheqpay's hosted page and comes back to
// /pagar/<usuario>?ref=<externalId>&cp_status=..&cp_invoice_id=.. .
const createCheckoutLink = asyncHandler(async (req, res) => {
  if (providerName() !== 'cheqpay') throw new AppError('Este método de pago no está disponible', 400);
  const { username, amount, comment, coverFee } = req.body;

  const worker = await Worker.findOne({ username: String(username).toLowerCase() });
  if (!worker) throw new AppError('No encontramos a ese Tip-er', 404);
  if (!canReceiveTips(worker)) throw new AppError('Esta persona no puede recibir propinas por ahora.', 400);
  if (req.user && String(worker.user) === String(req.user._id)) throw new AppError('No puedes enviarte propina a ti mismo', 400);

  const tipCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(tipCents) || tipCents < 100) throw new AppError('El monto mínimo es de 1.00', 400);
  if (tipCents > MAX_TIP_CENTS) throw new AppError('El importe máximo es de 5,000.00', 400);

  // One rate on the whole charge: with "cubrir comisión" the charge is raised
  // just enough for the person to receive the full tip.
  const amountCents = coverFee ? cheqpayFee.chargeForNet(tipCents) : tipCents;
  const feeCents = cheqpayFee.feeOnCharge(amountCents);
  const netAmountCents = amountCents - feeCents;

  if (amountCents < CHEQPAY_MIN_CENTS) {
    throw new AppError(`El monto mínimo es de ${(CHEQPAY_MIN_CENTS / 100).toFixed(2)}`, 400);
  }
  if (netAmountCents <= 0) {
    throw new AppError('Con ese importe no alcanza para cubrir el procesamiento. Elige un monto mayor o cubre el costo.', 400);
  }

  const externalId = `tip_${crypto.randomBytes(12).toString('hex')}`;
  const base = publicBaseUrl();
  // The charge is made under this person's own Cheqpay merchant once they have
  // one; before that (sandbox) it falls back to TIP-IT's test merchant.
  const merchantId = worker.cheqpay?.merchantId || undefined;
  const link = await cheqpay.createPaymentLink({
    merchantId,
    amountCents,
    name: 'Propina TIP-IT',
    description: `Propina para ${worker.publicName || worker.username}`,
    redirectUrl: `${base}/pagar/${encodeURIComponent(worker.username)}?ref=${externalId}&cp_status={status}&cp_invoice_id={invoiceId}`,
    cancelUrl: `${base}/pagar/${encodeURIComponent(worker.username)}`,
    externalId,
    reference: externalId,
    metadata: { workerId: String(worker._id) },
  });

  const transaction = await Transaction.create({
    worker: worker._id,
    client: req.user ? req.user._id : null,
    amount: amountCents,
    platformFee: feeCents,
    netAmount: netAmountCents,
    coverFee: Boolean(coverFee),
    provider: 'cheqpay',
    cheqpayExternalId: externalId,
    cheqpayLinkId: link.id,
    cheqpayMerchantId: merchantId || null,
    // Keeps the field required and unique without changing its index.
    stripePaymentIntentId: `cheqpay:${externalId}`,
    comment: comment || '',
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    url: link.url,
    transactionId: transaction._id,
    amount: amountCents,
    platformFee: feeCents,
    netAmount: netAmountCents,
  });
});

// Asks Cheqpay itself what happened to this payment; never trusts the browser.
async function syncCheqpayStatus(transaction, invoiceId) {
  if (invoiceId && /^[a-f\d]{24}$/i.test(String(invoiceId)) && !transaction.cheqpayInvoiceId) {
    transaction.cheqpayInvoiceId = String(invoiceId);
    await transaction.save();
  }
  if (!transaction.cheqpayInvoiceId || transaction.status === 'succeeded') return;

  const invoice = await cheqpay.getInvoice(transaction.cheqpayInvoiceId, transaction.cheqpayMerchantId || undefined);
  // The invoice must belong to the payment link we created for this tip.
  if (transaction.cheqpayLinkId && invoice?.paymentLinkId !== transaction.cheqpayLinkId) {
    throw new AppError('No pudimos verificar este pago', 400);
  }
  if (invoice.status === 'paid') {
    await markTransactionSucceeded(transaction._id);
  } else if (['failed', 'cancelled', 'abandoned'].includes(invoice.status)) {
    await Transaction.findOneAndUpdate({ _id: transaction._id, status: { $ne: 'succeeded' } }, { status: 'failed' });
  }
}

const confirm = asyncHandler(async (req, res) => {
  const { paymentIntentId, rating, review, alias, thanks, invoiceId } = req.body;

  const transaction = await Transaction.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!transaction) {
    throw new AppError('Transacción no encontrada', 404);
  }
  // Anonymous payments have no client to match against — knowing the
  // paymentIntentId (only ever handed to the browser that made the
  // payment, via its client_secret) is what proves this is legitimate,
  // same trust model Stripe itself uses for the client_secret.
  if (transaction.client && req.user && String(transaction.client) !== String(req.user._id)) {
    throw new AppError('No autorizado', 403);
  }

  if (transaction.provider === 'cheqpay') {
    if (rating !== undefined && !transaction.ratingCounted) transaction.rating = rating;
    if (review !== undefined) transaction.review = review;
    if (thanks === true) transaction.thanked = true;
    if (alias !== undefined) transaction.reviewAlias = String(alias).trim().slice(0, 30);
    await transaction.save();
    await syncCheqpayStatus(transaction, invoiceId);
    // Already paid (the webhook was first) but the rating only came now.
    await countRating(transaction._id);
    const done = await Transaction.findById(transaction._id);
    res.json({ success: true, transaction: done });
    return;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  // Once a rating has been added to the person's average it is final.
  if (rating !== undefined && !transaction.ratingCounted) transaction.rating = rating;
  if (review !== undefined) transaction.review = review;
  if (thanks === true) transaction.thanked = true;
  if (alias !== undefined) transaction.reviewAlias = String(alias).trim().slice(0, 30);
  await transaction.save();

  if (paymentIntent.status === 'succeeded') {
    // Stripe's webhook may be racing to mark this same transaction succeeded
    // right now — the shared helper guarantees only one of them counts it.
    await markTransactionSucceeded(transaction._id);
    // Already succeeded (e.g. the webhook was first) but the rating only came now.
    await countRating(transaction._id);
  }

  const fresh = await Transaction.findById(transaction._id);
  res.json({ success: true, transaction: fresh });
});

const getHistory = asyncHandler(async (req, res) => {
  const role = req.query.role === 'worker' ? 'worker' : 'client';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);

  // Only show payments that actually completed — a "pending" transaction
  // just means the client opened the payment screen and never finished
  // (closed the tab, abandoned checkout); nothing ever happened to it, so
  // it shouldn't appear in anyone's history and cause confusion.
  let filter = { status: 'succeeded' };
  if (role === 'worker') {
    if (!req.user.isWorker || !req.user.worker) {
      throw new AppError('No tienes una cuenta para recibir propinas', 403);
    }
    filter.worker = req.user.worker;
  } else {
    filter.client = req.user._id;
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

// calculateFee is exported alongside the route handlers so the business
// rule itself has a direct unit test (RV Mejores Prácticas §9), independent
// of the HTTP/DB layer around it.
module.exports = {
  createCheckoutLink, getFeeInfo, createIntent, confirm, getHistory, calculateFee };
