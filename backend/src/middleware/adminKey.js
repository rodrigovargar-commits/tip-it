const AppError = require('../utils/AppError');
const { logSecurityEvent } = require('../utils/logger');

// Shared key check for every /api/admin/* route — not a full admin/RBAC
// system, just enough to gate a handful of internal endpoints behind a
// shared secret (ADMIN_STATS_KEY, set as an env var, never committed).
const requireAdminKey = (req, res, next) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!process.env.ADMIN_STATS_KEY || key !== process.env.ADMIN_STATS_KEY) {
    // No actor_id — this route has no concept of an authenticated user,
    // only a shared key. source_ip is the only identity we have for it.
    logSecurityEvent({
      event: 'admin.access',
      outcome: 'failure',
      sourceIp: req.ip,
      target: `admin:${req.baseUrl}${req.path}`,
      reason: 'bad_or_missing_key',
    });
    throw new AppError('No autorizado', 401);
  }

  logSecurityEvent({
    event: 'admin.access',
    outcome: 'success',
    sourceIp: req.ip,
    target: `admin:${req.baseUrl}${req.path}`,
  });
  next();
};

module.exports = requireAdminKey;
