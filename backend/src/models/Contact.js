const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
    },
  },
  { timestamps: true }
);

contactSchema.index({ owner: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);
