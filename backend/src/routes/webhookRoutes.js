const express = require('express');
const { handleStripeWebhook } = require('../controllers/webhookController');

const router = express.Router();

// raw body required for Stripe signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = router;
