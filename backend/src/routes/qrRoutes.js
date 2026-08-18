const express = require('express');
const { getQRByUserId } = require('../controllers/qrController');

const router = express.Router();

router.get('/:userid', getQRByUserId);

module.exports = router;
