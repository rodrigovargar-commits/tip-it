const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const { logSecurityEvent } = require('../utils/logger');
const User = require('../models/User');

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('Ya existe una cuenta con ese email', 409);
  }

  const user = await User.create({ name, email, phone, password });
  const token = generateToken(user._id);

  logSecurityEvent({
    event: 'auth.register',
    outcome: 'success',
    actorId: user._id,
    sourceIp: req.ip,
    target: `user:${user._id}`,
  });

  res.status(201).json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
});

// Quick-pay entry point: no password, just enough to identify who's paying.
// Only ever reuses/creates guest accounts (isGuest: true) — never touches a
// full password-protected account, so a phone number alone can't be used to
// sign in as someone else.
const guestLogin = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;

  let user = await User.findOne({ phone: phone.trim(), isGuest: true });
  if (user) {
    user.name = name;
    if (email) user.email = email.toLowerCase().trim();
    await user.save();
  } else {
    user = await User.create({
      name,
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      isGuest: true,
    });
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  const validPassword = user && (await user.comparePassword(password));

  if (!user || !validPassword) {
    // actorId stays "anonymous" — we never log an email/identifier for a
    // failed attempt against an account that may not even exist (§8.3: no
    // PII in logs; and logging the attempted email would let the log itself
    // become an account-enumeration oracle).
    logSecurityEvent({
      event: 'auth.login',
      outcome: 'failure',
      sourceIp: req.ip,
      reason: !user ? 'no_such_account' : 'bad_password',
    });
    throw new AppError('Credenciales inválidas', 401);
  }
  if (!user.active) {
    logSecurityEvent({
      event: 'auth.login',
      outcome: 'failure',
      actorId: user._id,
      sourceIp: req.ip,
      reason: 'account_disabled',
    });
    throw new AppError('Cuenta desactivada', 403);
  }

  logSecurityEvent({
    event: 'auth.login',
    outcome: 'success',
    actorId: user._id,
    sourceIp: req.ip,
  });

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
});

module.exports = { register, login, guestLogin };
