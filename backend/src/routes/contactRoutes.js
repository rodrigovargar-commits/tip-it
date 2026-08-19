const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { listContacts, addContact, removeContact } = require('../controllers/contactController');

const router = express.Router();

router.get('/', protect, listContacts);

router.post(
  '/',
  protect,
  [body('username').trim().notEmpty().withMessage('El username es obligatorio')],
  validate,
  addContact
);

router.delete('/:id', protect, removeContact);

module.exports = router;
