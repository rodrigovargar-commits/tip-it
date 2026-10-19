const mongoose = require('mongoose');
const { encryptField, decryptField } = require('../utils/fieldCrypto');
const { GIRO_IDS } = require('../utils/cheqpayGiro');

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
    publicName: {
      // Name shown on the public profile; may differ from the legal name
      type: String,
      maxlength: 60,
      trim: true,
      default: '',
    },
    activity: {
      type: String,
      enum: [...require('../utils/activities').ACTIVITY_IDS, ''],
      default: '',
    },
    occupation: {
      // Free text, e.g. "Barbero" or "Manicurista"
      type: String,
      maxlength: 60,
      trim: true,
      default: '',
    },
    yearsExperience: {
      // Optional, entered by the person themselves
      type: Number,
      min: 0,
      max: 60,
      default: null,
    },
    establishment: {
      type: String,
      maxlength: 60,
      trim: true,
      default: '',
    },
    qrCode: {
      // Data URL (base64 PNG) of the QR pointing to this worker's public profile
      type: String,
      default: null,
    },
    qrUrl: {
      // The exact address encoded in qrCode, so a stale QR can be detected and rebuilt
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
    // Data Cheqpay's onboarding form asks for (Persona Física). Collected here so
    // the person fills it once; sent to Cheqpay when it gives us the way to do it.
    cheqpay: {
      status: { type: String, enum: ['none', 'collected', 'submitted', 'approved', 'rejected'], default: 'none' },
      // Cheqpay does each person's onboarding itself; once approved, the id of that
      // person's merchant there is saved by an admin (PATCH /api/admin/cheqpay/:username).
      merchantId: { type: String, maxlength: 60, trim: true, default: '' },
      legalName: { type: String, maxlength: 120, trim: true, default: '' },
      // RFC is optional for Persona Física; stored encrypted when DATA_ENCRYPTION_KEY is set.
      rfc: { type: String, maxlength: 200, default: '', set: encryptField, get: decryptField },
      nationality: { type: String, maxlength: 60, trim: true, default: '' },
      phone: { type: String, maxlength: 20, default: '' },
      email: { type: String, maxlength: 120, lowercase: true, trim: true, default: '' },
      giro: { type: String, enum: [...GIRO_IDS, ''], default: '' },
      giroOther: { type: String, maxlength: 100, trim: true, default: '' },
      termsAcceptedAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null },
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
