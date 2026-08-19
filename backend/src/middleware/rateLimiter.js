const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos, intenta más tarde.' },
});

const tipLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas propinas en poco tiempo, intenta más tarde.' },
});

// More generous than authLimiter: many different guests can legitimately pay
// from behind the same IP in a short window (e.g. a busy restaurant's wifi).
const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos, intenta más tarde.' },
});

module.exports = { authLimiter, tipLimiter, guestLimiter };
