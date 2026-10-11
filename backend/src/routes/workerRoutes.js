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
  getConnectedBalance,
  createInstantPayout,
  createRecognition,
} = require('../controllers/workerController');
const { ACTIVITY_IDS } = require('../utils/activities');
const { recognitionLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const profileFieldRules = [
  body('publicName').optional({ nullable: true }).trim().isLength({ max: 60 }),
  body('activity').optional({ nullable: true, checkFalsy: true }).isIn(ACTIVITY_IDS).withMessage('Actividad inválida'),
  body('occupation').optional({ nullable: true }).trim().isLength({ max: 60 }),
  body('establishment').optional({ nullable: true }).trim().isLength({ max: 60 }),
];

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
    ...profileFieldRules,
  ],
  validate,
  registerWorker
);

router.get('/stripe/status', protect, requireWorker, getStripeAccountStatus);
router.post('/stripe/onboarding-link', protect, requireWorker, createStripeOnboardingLink);
router.get('/stripe/balance', protect, requireWorker, getConnectedBalance);
router.post('/stripe/instant-payout', protect, requireWorker, createInstantPayout);

router.put(
  '/profile',
  protect,
  requireWorker,
  [
    body('bio').optional().isLength({ max: 280 }),
    body('experience').optional().isLength({ max: 600 }),
    ...profileFieldRules,
  ],
  validate,
  updateWorkerProfile
);

router.post(
  '/:username/recognitions',
  recognitionLimiter,
  [
    body('rating').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 5 }).withMessage('Las estrellas van de 1 a 5'),
    body('comment').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('El comentario puede tener hasta 200 caracteres'),
    body('alias').optional({ nullable: true }).isString().isLength({ max: 30 }),
  ],
  validate,
  createRecognition
);

router.get('/:username', getByUsername);
router.get('/:id/stats', protect, requireWorker, getStats);

module.exports = router;
