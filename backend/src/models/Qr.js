const mongoose = require('mongoose');

// An extra QR of a person. It points to the same public profile (and so to the same
// payment account) as their main QR, but carries its own code, so the tips and
// comments that come through it can be told apart: one per place they work part
// time, one per event, one per spot where they stand. The main QR needs no record.
const qrSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // 'personal' they made it; 'business' it was made when joining a business or event.
    kind: { type: String, enum: ['personal', 'business'], default: 'personal' },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Qr', qrSchema);
