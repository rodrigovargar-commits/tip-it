const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { tipLimiter } = require('../middleware/rateLimiter');
const { getFeeInfo, createIntent, createCheckoutLink, confirm, getHistory } = require('../controllers/tipController');

const router = express.Router();

router.get('/fee-info', getFeeInfo);

router.post(
  '/create-intent',
  optionalAuth,
  tipLimiter,
  [
    body('username').trim().notEmpty().withMessage('El username es obligatorio'),
    body('amount').isFloat({ min: 1 }).withMessage('El monto mínimo es 1.00'),
    body('comment').optional().isLength({ max: 500 }),
    body('coverFee').optional().isBoolean(),
  ],
  validate,
  createIntent
);

router.post(
  '/create-link',
  optionalAuth,
  tipLimiter,
  [
    body('username').trim().notEmpty().withMessage('El username es obligatorio'),
    body('amount').isFloat({ min: 1 }).withMessage('El monto mínimo es 1.00'),
    body('comment').optional().isLength({ max: 500 }),
    body('coverFee').optional().isBoolean(),
  ],
  validate,
  createCheckoutLink
);

router.post(
  '/confirm',
  optionalAuth,
  [
    body('paymentIntentId').trim().notEmpty(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('review').optional().isLength({ max: 200 }).withMessage('La reseña puede tener hasta 200 caracteres'),
    body('alias').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
    body('thanks').optional().isBoolean(),
    body('invoiceId').optional({ checkFalsy: true }).matches(/^[a-fA-F0-9]{24}$/),
  ],
  validate,
  confirm
);

router.get('/history', protect, getHistory);

module.exports = router;
