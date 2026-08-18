const asyncHandler = require('../utils/asyncHandler');
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

module.exports = { getMe, updateProfile };
