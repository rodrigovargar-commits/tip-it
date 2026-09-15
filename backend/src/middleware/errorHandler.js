const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Identificador inválido';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `El valor de "${field}" ya está en uso` : 'Registro duplicado';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  if (process.env.NODE_ENV !== 'production') {
    // Full stack trace stays out of production logs on purpose — this path
    // is for local/dev debugging only. §8.5: the client itself never gets
    // more than a generic message either way, regardless of env.
    logger.error({ err }, 'Unhandled error');
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
