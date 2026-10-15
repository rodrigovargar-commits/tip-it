const Transaction = require('../models/Transaction');
const markTransactionSucceeded = require('../utils/markTransactionSucceeded');
const { verifyWebhookSignature } = require('../payments/cheqpay/webhookSignature');
const { logger } = require('../utils/logger');

// Cheqpay payment webhooks. It must answer 200 fast, so only cheap, idempotent
// work happens here; a repeated event does nothing new.
const handleCheqpayWebhook = async (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-webhook-signature'];

  if (!verifyWebhookSignature(payload, signature)) {
    logger.warn({ event: payload?.event }, 'Cheqpay webhook signature verification failed');
    return res.status(401).json({ success: false, message: 'Firma inválida' });
  }

  try {
    const externalId = payload.data?.paymentOrder?.externalId;
    const transaction = externalId ? await Transaction.findOne({ cheqpayExternalId: externalId }) : null;

    if (!transaction) {
      // Valid signature but nothing of ours matches: acknowledge so it is not retried.
      logger.info({ event: payload.event }, 'Cheqpay webhook for an unknown order');
      return res.json({ received: true });
    }

    switch (payload.event) {
      case 'payment.capture.success':
        await markTransactionSucceeded(transaction._id);
        break;
      case 'payment.auth.failed':
        await Transaction.findOneAndUpdate({ _id: transaction._id, status: { $ne: 'succeeded' } }, { status: 'failed' });
        break;
      default:
        // auth.pending, refunds, etc.: nothing to do yet.
        break;
    }
    return res.json({ received: true });
  } catch (err) {
    logger.error({ err: err.message, event: payload.event }, 'Cheqpay webhook handler failed');
    // 500 makes Cheqpay retry (up to 10 times); our handler is idempotent.
    return res.status(500).json({ success: false });
  }
};

module.exports = { handleCheqpayWebhook };
