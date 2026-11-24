const mongoose = require('mongoose');
const { BUSINESS_TYPE_IDS } = require('../utils/businessTypes');

// A business (barbería, clínica, restaurante...) that groups several people
// who receive tips. The owner creates it, gets a short code and shares it with
// the people on their team; each of them joins from their own account. This
// only groups and reports: tips still go straight to each person.
const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    // Shown as XXXX-XXXX; stored without the dash, uppercase.
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Hotel, parking, golf club, pharmacy, catering, one-off event...
    type: { type: String, enum: BUSINESS_TYPE_IDS, default: 'otro' },
    // The picture of the place, shown on the profile of everyone on the team. A data URL, kept out of
    // normal queries (select: false); answers carry hasLogo/logoVersion and a short address instead.
    logo: { type: String, default: null, select: false },
    hasLogo: { type: Boolean, default: false },
    logoVersion: { type: Number, default: 0 },
    // Which business terms the owner accepted, and when.
    termsVersion: { type: String, default: null },
    termsAcceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);
