const mongoose = require('mongoose');

// One row per (channel, destination, purpose): the pending code for a person
// who asked for one, plus the counters that keep it from being abused. The
// code itself is never stored — only a keyed hash — and a row disappears by
// itself after expiry (TTL index) or as soon as the code is used.
const otpChallengeSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['email', 'sms', 'whatsapp'], required: true },
    destination: { type: String, required: true }, // normalized: lowercase email or E.164 phone
    purpose: { type: String, enum: ['register', 'login'], required: true },
    codeHash: { type: String, default: null }, // null when the provider (Twilio Verify) holds the code
    provider: { type: String, default: 'own' },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    sendCount: { type: Number, default: 1 },
    sendWindowStart: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ channel: 1, destination: 1, purpose: 1 }, { unique: true });
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);
