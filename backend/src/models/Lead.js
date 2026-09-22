const mongoose = require('mongoose');

// A "lead" is someone who showed interest from the marketing landing page —
// NOT a User. No password, no login, no access to the platform. Just enough
// to follow up manually (WhatsApp/Instagram) and measure interest by
// category/zone before doing the real onboarding in person.
const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, 'El teléfono es obligatorio'],
      trim: true,
      maxlength: 30,
    },
    category: {
      type: String,
      enum: ['barbero_estilista', 'musico_artista', 'puesto_comida', 'otro'],
      required: true,
    },
    zone: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    source: {
      // Free-text tag for which campaign/channel sent them here (e.g. "instagram_bio",
      // "tiktok_video1"), read from ?src= on the landing page. Never trusted beyond display.
      type: String,
      trim: true,
      maxlength: 50,
      default: 'landing',
    },
    contacted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ category: 1 });

module.exports = mongoose.model('Lead', leadSchema);
