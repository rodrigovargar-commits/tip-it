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
    currency: {
      type: String,
      default: 'mxn',
    },
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
