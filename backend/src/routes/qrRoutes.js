const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, requireWorker } = require('../middleware/auth');
const { listQrs, createQr, renameQr, archiveQr } = require('../controllers/qrController');

const router = express.Router();
router.use(protect, requireWorker);

const nameRule = body('name').trim().isLength({ min: 2, max: 40 }).withMessage('El nombre debe tener de 2 a 40 caracteres');

router.get('/', listQrs);
router.post('/', [nameRule], validate, createQr);
router.patch('/:id', [nameRule], validate, renameQr);
router.delete('/:id', archiveQr);

module.exports = router;
