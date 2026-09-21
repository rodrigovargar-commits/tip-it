const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const User = require('../models/User');
const Worker = require('../models/Worker');
const { logSecurityEvent } = require('../utils/logger');

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('worker');
  // Worker has no `name` field of its own — it lives on User. Without this,
  // every screen that reads worker.name (QR card, dashboard, reviews) falls
  // back to "@username" and shows the handle twice instead of the real name.
  const worker = user.worker
    ? { ...user.worker.toObject(), name: user.name, avatarUrl: user.avatarUrl }
    : null;
  res.json({ success: true, user: user.toPublicJSON(), worker });
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

// "Delete my account" (LFPDPPP right of cancellation). Personal data is erased
// and the account disabled; Transaction rows stay because they are the
// accounting record of real payments (see docs/CLASIFICACION_DATOS.md).
const deleteMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const id = String(user._id);

  user.name = 'Cuenta eliminada';
  user.email = user.isGuest ? undefined : `deleted-${id}@deleted.invalid`;
  user.phone = '0000000000';
  user.document = null;
  user.avatarUrl = null;
  user.active = false;
  user.isGuest = true; // no password/email requirements once erased
  user.password = crypto.randomBytes(24).toString('hex'); // unusable, hashed by the pre-save hook
  user.isWorker = false;
  await user.save();

  if (user.worker) {
    await Worker.findByIdAndUpdate(user.worker, {
      bio: '',
      experience: '',
      username: `deleted_${crypto.randomBytes(6).toString('hex')}`,
    });
  }

  logSecurityEvent({
    event: 'account.deleted',
    outcome: 'success',
    actorId: id,
    sourceIp: req.ip,
    target: `user:${id}`,
  });

  res.json({ success: true });
});

module.exports = { getMe, updateProfile, upgradeAccount, deleteMe };
