const express = require('express');
const { handleStripeWebhook } = require('../controllers/webhookController');
const { handleCheqpayWebhook } = require('../controllers/cheqpayWebhookController');

const router = express.Router();

// raw body required for Stripe signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Cheqpay signs fields of the parsed JSON body, so this one uses the JSON parser.
router.post('/cheqpay', express.json({ limit: '100kb' }), handleCheqpayWebhook);

module.exports = router;
