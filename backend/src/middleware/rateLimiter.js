const rateLimit = require('express-rate-limit');

// Automated tests fire far more requests at these routes than any real IP
// would in the same window, and don't benefit from the protection anyway
// (there's no real attacker in a test run) — so the limiters are inert
// under NODE_ENV=test instead of producing flaky 429s. Production behavior
// is untouched.
const skipInTest = () => process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Demasiados intentos, intenta más tarde.' },
});

const tipLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Demasiadas propinas en poco tiempo, intenta más tarde.' },
});

// More generous than authLimiter: many different guests can legitimately pay
// from behind the same IP in a short window (e.g. a busy restaurant's wifi).
const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Demasiados intentos, intenta más tarde.' },
});

module.exports = { authLimiter, tipLimiter, guestLimiter };
