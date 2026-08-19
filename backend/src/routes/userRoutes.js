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
    body('avatarUrl')
      .optional({ nullable: true })
      .custom((value) => value === null || /^data:image\/(png|jpe?g|webp);base64,/.test(value))
      .withMessage('La foto debe ser una imagen (png, jpg o webp)'),
    body('document').optional().trim(),
  ],
  validate,
  updateProfile
);

module.exports = router;
