const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');
const { logSecurityEvent } = require('./logger');

// Atomically flips a transaction to "succeeded" and updates the worker's
// aggregate stats exactly once, even if Stripe's webhook and the client's
// own confirm() call arrive within milliseconds of each other. The
// status-check happens inside the update filter itself, so only one caller
// can ever win the transition — the other gets `null` back and does nothing.
async function markTransactionSucceeded(transactionId) {
  const updated = await Transaction.findOneAndUpdate(
    { _id: transactionId, status: { $ne: 'succeeded' } },
    { status: 'succeeded' },
    { new: true }
  );
  if (!updated) return null;

  const update = { $inc: { totalReceived: updated.netAmount, tipCount: 1 } };
  if (updated.rating) {
    update.$inc.ratingSum = updated.rating;
    update.$inc.ratingCount = 1;
  }
  await Worker.findByIdAndUpdate(updated.worker, update);

  // Never the amount or any party's identity in the log line itself — just
  // that a payment succeeded and which transaction/worker it was, so this
  // can be correlated against Stripe's own records without duplicating
  // financial data into the log stream (§8.3).
  logSecurityEvent({
    event: 'payment.succeeded',
    outcome: 'success',
    actorId: updated.client,
    target: `transaction:${updated._id}`,
  });

  return updated;
}

module.exports = markTransactionSucceeded;
