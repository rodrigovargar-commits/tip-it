const mongoose = require('mongoose');

// A person's place in a team or an event of a business. The business only ever
// sees what happened inside this membership's time window (see utils/membershipWindow.js),
// never what came before it.
//   scope 'all': works there full time: every tip counts from the day they joined.
//   scope 'qr' : part time or an event: only tips and comments that came through the
//                QR made for this membership count.
const membershipSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true, index: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    scope: { type: String, enum: ['all', 'qr'], default: 'all' },
    qr: { type: mongoose.Schema.Types.ObjectId, ref: 'Qr', default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

membershipSchema.index({ worker: 1, location: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema);
