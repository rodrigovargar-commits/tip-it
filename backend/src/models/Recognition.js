const mongoose = require('mongoose');

// A thank-you / rating left for someone WITHOUT paying. It is kept apart from
// Transaction on purpose: no payment id, no charge, and it never counts toward
// the rating average (a payment proves a service happened; this doesn't).
// New ones wait for review before showing on the public profile.
const recognitionSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, maxlength: 200, default: '' },
    alias: { type: String, maxlength: 30, default: '' },
    status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },
    // Keyed hash of the sender's IP, only to stop the same person repeating
    // themselves; the IP itself is never stored.
    senderHash: { type: String, required: true },
  },
  { timestamps: true }
);

recognitionSchema.index({ worker: 1, status: 1, createdAt: -1 });
recognitionSchema.index({ worker: 1, senderHash: 1, createdAt: -1 });

module.exports = mongoose.model('Recognition', recognitionSchema);
