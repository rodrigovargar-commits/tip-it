const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encryptField, decryptField } = require('../utils/fieldCrypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 100,
    },
    email: {
      // Optional for guest accounts (created from the quick-pay flow), required otherwise
      type: String,
      required: [function emailRequired() { return !this.isGuest; }, 'El email es obligatorio'],
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },
    phone: {
      type: String,
      required: [true, 'El teléfono es obligatorio'],
      trim: true,
    },
    password: {
      // Optional for guest accounts: they authenticate by phone via /auth/guest, never by password
      type: String,
      required: [function passwordRequired() { return !this.isGuest; }, 'La contraseña es obligatoria'],
      minlength: 8,
      select: false,
    },
    isGuest: {
      // Created from the quick-pay flow (name + phone only, no password/email needed)
      type: Boolean,
      default: false,
    },
    // Basic KYC — an official ID number (INE/passport). Personal data:
    // classified per RV Mejores Prácticas §7. Never returned by
    // toPublicJSON() below, and excluded from logs (never referenced by the
    // logger/morgan config, which only sees request metadata, not bodies).
    document: {
      type: String,
      trim: true,
      // Ciphertext is longer than the 30-char plain value; the 30-char limit is
      // enforced at the route validator, not here.
      maxlength: 200,
      default: null,
      set: encryptField,
      get: decryptField,
    },
    isWorker: {
      type: Boolean,
      default: false,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1, isGuest: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    hasDocument: Boolean(this.document),
    isWorker: this.isWorker,
    worker: this.worker,
    avatarUrl: this.avatarUrl,
    isGuest: this.isGuest,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
