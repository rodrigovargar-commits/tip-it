const mongoose = require('mongoose');

// A team or place inside a business (sucursal, turno, área). Each one has its
// own name and its own code, so a business with several places can see how each
// one does and compare them. People join a location with its code.
const locationSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // 'event' is a short activity (a weekend, a festival) with dates; its results stay visible after it ends.
    kind: { type: String, enum: ['team', 'event'], default: 'team' },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Location', locationSchema);
