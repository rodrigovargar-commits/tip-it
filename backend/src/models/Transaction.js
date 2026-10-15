const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null allows anonymous/guest tips in the future
    },
    amount: {
      // Gross amount paid by the client, in cents
      type: Number,
      required: true,
      min: 100, // 1.00 in the smallest currency's major unit
    },
    platformFee: {
      // TIP-IT commission, in cents
      type: Number,
      required: true,
      default: 0,
    },
    stripeFee: {
      // Estimated Stripe processing fee, in cents
      type: Number,
      default: 0,
    },
    netAmount: {
      // Amount transferred to the worker, in cents
      type: Number,
      required: true,
      default: 0,
    },
    coverFee: {
      // If true, the client paid the commission on top so the worker got 100% of the tip
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
      default: 'mxn',
    },
    // Cheqpay: the idempotency key we gave the payment link (matches the webhook's
    // paymentOrder.externalId) and the provider's own ids, once known.
    provider: { type: String, enum: ['stripe', 'cheqpay'], default: 'stripe' },
    // No default on purpose: a unique sparse index still counts an explicit null, so
    // Stripe payments must leave this field missing, not null.
    cheqpayExternalId: { type: String, index: { unique: true, sparse: true } },
    cheqpayInvoiceId: { type: String, default: null },
    // For Cheqpay payments this holds 'cheqpay:<externalId>': the field stays required
    // and unique so the existing index does not change.
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'canceled'],
      default: 'pending',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    comment: {
      // Optional note the client attaches while sending the tip
      type: String,
      maxlength: 500,
      default: '',
    },
    ratingCounted: {
      // True once this transaction's rating has been added to the worker's average
      type: Boolean,
      default: false,
    },
    thanked: {
      // The payer pressed "Enviar agradecimiento" without stars or words
      type: Boolean,
      default: false,
    },
    reviewAlias: {
      // Optional nickname shown instead of "Anónimo" next to the review
      type: String,
      maxlength: 30,
      default: '',
    },
    review: {
      // Written review left after the service, alongside the rating.
      // Shown publicly on the worker's profile as their track record.
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

transactionSchema.index({ worker: 1, createdAt: -1 });
transactionSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
