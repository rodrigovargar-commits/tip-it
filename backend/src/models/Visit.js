const mongoose = require('mongoose');

// One row per browsing session that reached the site — stored by our own
// server, with no cookie and no personal data, so it still counts people
// whose ad blocker or cookie choice keeps Google Analytics from seeing them.
// `source` is the campaign tag from the link (?src= or utm_source/utm_campaign),
// or the site they came from, or "directo".
const visitSchema = new mongoose.Schema(
  {
    source: { type: String, trim: true, maxlength: 50, default: 'directo' },
    path: { type: String, trim: true, maxlength: 100, default: '/' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

visitSchema.index({ createdAt: -1 });
visitSchema.index({ source: 1, createdAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);
