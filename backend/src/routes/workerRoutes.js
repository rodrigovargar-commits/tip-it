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
const { getApplication, saveApplication } = require('../controllers/cheqpayController');
const { GIRO_IDS } = require('../utils/cheqpayGiro');
const { ACTIVITY_IDS } = require('../utils/activities');
const { recognitionLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const profileFieldRules = [
  body('publicName').optional({ nullable: true }).trim().isLength({ max: 60 }),
  body('activity').optional({ nullable: true, checkFalsy: true }).isIn(ACTIVITY_IDS).withMessage('Actividad inválida'),
  body('occupation').optional({ nullable: true }).trim().isLength({ max: 60 }),
  body('establishment').optional({ nullable: true }).trim().isLength({ max: 60 }),
  body('yearsExperience').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 60 }).withMessage('Los años de experiencia van de 0 a 60'),
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

router.get('/cheqpay/application', protect, requireWorker, getApplication);
router.put(
  '/cheqpay/application',
  protect,
  requireWorker,
  [
    body('legalName').isString().trim().isLength({ min: 3, max: 120 }).withMessage('Escribe tu nombre completo'),
    body('rfc').optional({ nullable: true }).isString().isLength({ max: 20 }),
    body('nationality').isString().trim().isLength({ min: 2, max: 60 }).withMessage('Escribe tu nacionalidad'),
    body('phone').isString().custom((v) => /^\d{10,15}$/.test(String(v).replace(/\D/g, ''))).withMessage('Escribe un teléfono válido'),
    body('email').isEmail().withMessage('Escribe un correo válido'),
    body('giro').isIn(GIRO_IDS).withMessage('Elige un giro'),
    body('giroOther').optional({ nullable: true }).isString().isLength({ max: 100 }),
  ],
  validate,
  saveApplication
);

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
