const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { getMe, updateProfile } = require('../controllers/userController');

const router = express.Router();

router.get('/me', protect, getMe);

router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim().notEmpty(),
    body('avatarUrl').optional().isURL().withMessage('URL de avatar inválida'),
    body('document').optional().trim(),
  ],
  validate,
  updateProfile
);

module.exports = router;
