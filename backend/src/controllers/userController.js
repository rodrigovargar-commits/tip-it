const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('worker');
  res.json({ success: true, user: user.toPublicJSON(), worker: user.worker || null });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'phone', 'avatarUrl', 'document'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, user: user.toPublicJSON() });
});

// Turns a guest account (name + phone, no password) into a full account, so
// it can be protected by a password before it's allowed to receive money.
const upgradeAccount = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!req.user.isGuest) {
    throw new AppError('Tu cuenta ya está completa', 400);
  }

  const user = await User.findById(req.user._id);
  user.email = email.toLowerCase().trim();
  user.password = password;
  user.isGuest = false;
  await user.save();

  res.json({ success: true, user: user.toPublicJSON() });
});

module.exports = { getMe, updateProfile, upgradeAccount };
