const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);
