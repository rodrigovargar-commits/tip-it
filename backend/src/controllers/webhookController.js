const stripe = require('../config/stripe');
const Worker = require('../models/Worker');
const Transaction = require('../models/Transaction');

async function markSucceeded(transaction) {
  if (transaction.status === 'succeeded') return;
  transaction.status = 'succeeded';
  await transaction.save();

  const update = { $inc: { totalReceived: transaction.netAmount, tipCount: 1 } };
  if (transaction.rating) {
    update.$inc.ratingSum = transaction.rating;
    update.$inc.ratingCount = 1;
  }
  await Worker.findByIdAndUpdate(transaction.worker, update);
}

const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const transaction = await Transaction.findOne({ stripePaymentIntentId: pi.id });
        if (transaction) await markSucceeded(transaction);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await Transaction.findOneAndUpdate(
          { stripePaymentIntentId: pi.id, status: { $ne: 'succeeded' } },
          { status: 'failed' }
        );
        break;
      }
      case 'account.updated': {
        const account = event.data.object;
        await Worker.findOneAndUpdate(
          { stripeAccountId: account.id },
          { stripeOnboardingComplete: Boolean(account.details_submitted && account.charges_enabled) }
        );
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook event:', err);
    res.status(500).json({ received: false });
  }
};

module.exports = { handleStripeWebhook };
