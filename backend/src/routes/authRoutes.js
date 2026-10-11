const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authLimiter, guestLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { register, login, guestLogin } = require('../controllers/authController');
const otp = require('../controllers/otpController');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
    // With a verification token (the person already proved their phone/email
    // with a code) the contact data comes from the token and no password is
    // needed; without it, the classic email + phone + password form applies.
    body('email')
      .if((v, { req }) => !req.body.verificationToken)
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('phone')
      .if((v, { req }) => !req.body.verificationToken)
      .trim()
      .notEmpty()
      .withMessage('El teléfono es obligatorio'),
    body('password')
      .if((v, { req }) => !req.body.verificationToken)
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('verificationToken').optional().isString(),
  ],
  validate,
  register
);

router.get('/otp/config', otp.getConfig);

const otpBody = [
  body('channel').isIn(['email', 'sms', 'whatsapp']).withMessage('Medio inválido'),
  body('destination').trim().notEmpty().withMessage('Escribe tu teléfono o correo'),
  body('purpose').isIn(['register', 'login']).withMessage('Propósito inválido'),
];

router.post('/otp/send', otpLimiter, otpBody, validate, otp.send);

router.post(
  '/otp/verify',
  otpLimiter,
  [...otpBody, body('code').matches(/^\d{6}$/).withMessage('El código tiene 6 dígitos')],
  validate,
  otp.verify
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
  ],
  validate,
  login
);

router.post(
  '/guest',
  guestLimiter,
  [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('phone').trim().notEmpty().withMessage('El teléfono es obligatorio'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido').normalizeEmail(),
  ],
  validate,
  guestLogin
);

module.exports = router;
