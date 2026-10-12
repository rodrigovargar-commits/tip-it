const stripe = require('../config/stripe');
const { logger } = require('./logger');

const lastCheck = new Map(); // workerId -> timestamp, so a busy QR doesn't hammer Stripe
const MIN_GAP_MS = 30 * 1000;

// A Tip-er who finished connecting their bank at Stripe stays "not ready" in
// our database until Stripe's webhook reaches us (or they open their own
// dashboard). When someone scans their QR in that gap, ask Stripe directly
// so the page doesn't say "can't receive payments" about an account that can.
async function refreshStripeReadiness(worker) {
  if (!worker || worker.stripeOnboardingComplete || !worker.stripeAccountId) return worker;

  const key = String(worker._id);
  const now = Date.now();
  if (now - (lastCheck.get(key) || 0) < MIN_GAP_MS) return worker;
  lastCheck.set(key, now);

  try {
    const account = await stripe.accounts.retrieve(worker.stripeAccountId);
    const ready = Boolean(account.details_submitted && account.charges_enabled);
    if (ready) {
      worker.stripeOnboardingComplete = true;
      await worker.save();
    }
  } catch (err) {
    logger.warn({ reason: err.type || err.name }, 'could not refresh Stripe readiness');
  }
  return worker;
}

module.exports = refreshStripeReadiness;
