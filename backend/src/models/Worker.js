const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: [true, 'El username es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_.]+$/, 'El username solo puede tener letras, números, punto y guion bajo'],
    },
    bio: {
      type: String,
      maxlength: 280,
      default: '',
    },
    experience: {
      // Optional freeform "resume" text: where they've worked, years of experience, etc.
      type: String,
      maxlength: 600,
      default: '',
    },
    qrCode: {
      // Data URL (base64 PNG) of the QR pointing to this worker's public profile
      type: String,
      default: null,
    },
    stripeAccountId: {
      type: String,
      default: null,
    },
    stripeOnboardingComplete: {
      type: Boolean,
      default: false,
    },
    ratingSum: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    totalReceived: {
      // Net amount received by the worker, in cents
      type: Number,
      default: 0,
    },
    tipCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

workerSchema.virtual('rating').get(function getRating() {
  if (!this.ratingCount) return 0;
  return Math.round((this.ratingSum / this.ratingCount) * 10) / 10;
});

workerSchema.set('toJSON', { virtuals: true });
workerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Worker', workerSchema);
