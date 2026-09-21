const Stripe = require('stripe');
const { logger } = require('../utils/logger');

if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn('STRIPE_SECRET_KEY is not set — Stripe calls will fail until configured.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'not-configured', {
  apiVersion: '2024-06-20',
});

module.exports = stripe;
