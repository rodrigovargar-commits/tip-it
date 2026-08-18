const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new AppError('No autorizado, token requerido', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError('Token inválido o expirado', 401);
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.active) {
    throw new AppError('Usuario no encontrado o inactivo', 401);
  }

  req.user = user;
  next();
});

const requireWorker = asyncHandler(async (req, res, next) => {
  if (!req.user.isWorker || !req.user.worker) {
    throw new AppError('Esta acción requiere una cuenta de trabajador', 403);
  }
  next();
});

module.exports = { protect, requireWorker };
