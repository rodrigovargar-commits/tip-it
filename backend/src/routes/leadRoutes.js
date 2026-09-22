const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { guestLimiter } = require('../middleware/rateLimiter');
const { createLead } = require('../controllers/leadController');

const router = express.Router();

// Public: anyone sharing the landing link (social media, in-person QR) can
// hit this without an account. guestLimiter reused — same "many different
// people behind one IP" shape as guest tipping, no need for a stricter one.
router.post(
  '/',
  guestLimiter,
  [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 100 }),
    body('phone').trim().notEmpty().withMessage('El teléfono es obligatorio').isLength({ max: 30 }),
    body('category')
      .isIn(['barbero_estilista', 'musico_artista', 'puesto_comida', 'otro'])
      .withMessage('Categoría inválida'),
    body('zone').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('source').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  ],
  validate,
  createLead
);

module.exports = router;
