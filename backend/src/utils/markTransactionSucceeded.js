const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');
const { logSecurityEvent } = require('./logger');

// Atomically flips a transaction to "succeeded" and updates the worker's
// aggregate stats exactly once, even if Stripe's webhook and the client's
// own confirm() call arrive within milliseconds of each other. The
// status-check happens inside the update filter itself, so only one caller
// can ever win the transition — the other gets `null` back and does nothing.
// Adds a succeeded transaction's rating to the worker's average, exactly once.
// The rating can arrive before or after the payment is confirmed (the review
// step comes after paying), so both paths call this and the flag decides.
async function countRating(transactionId) {
  const counted = await Transaction.findOneAndUpdate(
    { _id: transactionId, status: 'succeeded', rating: { $ne: null }, ratingCounted: false },
    { ratingCounted: true },
    { new: true }
  );
  if (!counted) return null;
  await Worker.findByIdAndUpdate(counted.worker, {
    $inc: { ratingSum: counted.rating, ratingCount: 1 },
  });
  return counted;
}

async function markTransactionSucceeded(transactionId) {
  const updated = await Transaction.findOneAndUpdate(
    { _id: transactionId, status: { $ne: 'succeeded' } },
    { status: 'succeeded' },
    { new: true }
  );
  if (!updated) return null;

  await Worker.findByIdAndUpdate(updated.worker, {
    $inc: { totalReceived: updated.netAmount, tipCount: 1 },
  });
  await countRating(updated._id);

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
module.exports.countRating = countRating;
