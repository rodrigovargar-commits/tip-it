const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const User = require('../models/User');

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('Ya existe una cuenta con ese email', 409);
  }

  const user = await User.create({ name, email, phone, password });
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Credenciales inválidas', 401);
  }
  if (!user.active) {
    throw new AppError('Cuenta desactivada', 403);
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
});

module.exports = { register, login };
