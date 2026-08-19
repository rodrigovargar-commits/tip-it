const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { tipLimiter } = require('../middleware/rateLimiter');
const { getFeeInfo, createIntent, confirm, getHistory } = require('../controllers/tipController');

const router = express.Router();

router.get('/fee-info', getFeeInfo);

router.post(
  '/create-intent',
  protect,
  tipLimiter,
  [
    body('username').trim().notEmpty().withMessage('El username del trabajador es obligatorio'),
    body('amount').isFloat({ min: 1 }).withMessage('El monto mínimo es 1.00'),
    body('comment').optional().isLength({ max: 500 }),
    body('coverFee').optional().isBoolean(),
  ],
  validate,
  createIntent
);

router.post(
  '/confirm',
  protect,
  [
    body('paymentIntentId').trim().notEmpty(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('review').optional().isLength({ max: 500 }),
  ],
  validate,
  confirm
);

router.get('/history', protect, getHistory);

module.exports = router;
