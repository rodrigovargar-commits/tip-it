const pino = require('pino');

// Base structured logger. Redaction is centralized here — RV Mejores
// Prácticas §8.3: the list of forbidden fields is part of the logger's own
// contract, not something every call site has to remember on its own.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.pan',
      '*.cardNumber',
      '*.cvv',
      '*.cvc',
      '*.pin',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.apiKey',
      '*.secret',
      '*.email',
      '*.phone',
      '*.curp',
      '*.rfc',
      '*.address',
      '*.document',
    ],
    censor: '[REDACTED]',
    remove: false,
  },
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Closed catalog (§8.1) — an event type outside this list is a mistake to
// catch in review, not something to log silently under a free-text name.
const SECURITY_EVENTS = new Set([
  'auth.register',
  'auth.login',
  'authz.denied',
  'worker.privilege_granted',
  'admin.access',
  'payment.succeeded',
  'account.deleted',
]);

// One JSON line per event, with exactly the six PCI 10.2.2 fields (§8.2):
// ts, event, outcome, actor_id, source_ip, target — plus trace_id and reason.
// `reason` is always a short code from a closed set at the call site, never
// free text that could carry PII (§8.3).
function logSecurityEvent({ event, outcome, actorId, sourceIp, target, reason, traceId }) {
  if (!SECURITY_EVENTS.has(event)) {
    logger.warn({ attemptedEvent: event }, 'security event outside the declared catalog — not logged as one');
    return;
  }
  logger.info({
    ts: new Date().toISOString(),
    event,
    outcome,
    actor_id: actorId ? String(actorId) : 'anonymous',
    source_ip: sourceIp || null,
    target: target || null,
    trace_id: traceId || null,
    reason: reason || null,
  });
}

module.exports = { logger, logSecurityEvent, SECURITY_EVENTS };
