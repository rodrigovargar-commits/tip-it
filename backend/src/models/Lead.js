const mongoose = require('mongoose');

const LEAD_STAGES = ['nuevo', 'contactado', 'interesado', 'registrado', 'activo', 'descartado'];

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
    // At least one way to reach them is required: WhatsApp/phone, email or
    // Instagram (people who write by DM through ManyChat often leave only that).
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
      validate: {
        validator(v) {
          return Boolean(v) || Boolean(this.email) || Boolean(this.instagram);
        },
        message: 'Déjanos un WhatsApp o un correo para contactarte',
      },
    },
    instagram: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 60,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      default: '',
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
    // Follow-up pipeline used by the admin portal. `contacted` is kept in
    // step with it (anything past "nuevo" counts as contacted) so the older
    // stats keep meaning the same thing.
    stage: {
      type: String,
      enum: LEAD_STAGES,
      default: 'nuevo',
    },
    nextFollowUp: { type: Date, default: null },
    // The main reason they gave for not signing up, in their own words.
    objection: { type: String, trim: true, maxlength: 200, default: '' },
    notes: {
      type: [
        {
          text: { type: String, trim: true, maxlength: 500, required: true },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ category: 1 });
leadSchema.index({ stage: 1, nextFollowUp: 1 });

leadSchema.pre('save', function syncContacted(next) {
  if (this.isModified('stage')) this.contacted = this.stage !== 'nuevo';
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
module.exports.LEAD_STAGES = LEAD_STAGES;
