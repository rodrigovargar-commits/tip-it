const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authLimiter, guestLimiter } = require('../middleware/rateLimiter');
const { register, login, guestLogin } = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('El teléfono es obligatorio'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
  ],
  validate,
  register
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
