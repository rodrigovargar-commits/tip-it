const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, requireWorker } = require('../middleware/auth');
const {
  registerWorker,
  getByUsername,
  getStats,
  updateWorkerProfile,
  createStripeOnboardingLink,
  getStripeAccountStatus,
} = require('../controllers/workerController');

const router = express.Router();

router.post(
  '/register',
  protect,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-z0-9_.]+$/i)
      .withMessage('Username inválido (solo letras, números, punto y guion bajo)'),
    body('bio').optional().isLength({ max: 280 }),
  ],
  validate,
  registerWorker
);

router.get('/stripe/status', protect, requireWorker, getStripeAccountStatus);
router.post('/stripe/onboarding-link', protect, requireWorker, createStripeOnboardingLink);

router.put(
  '/profile',
  protect,
  requireWorker,
  [
    body('bio').optional().isLength({ max: 280 }),
    body('experience').optional().isLength({ max: 600 }),
  ],
  validate,
  updateWorkerProfile
);

router.get('/:username', getByUsername);
router.get('/:id/stats', protect, requireWorker, getStats);

module.exports = router;
