const express = require('express');
const { protect, requireWorker } = require('../middleware/auth');
const { getConfig, googleLink, appleLink, applePass } = require('../controllers/walletController');

const router = express.Router();

router.get('/config', getConfig);
router.get('/google', protect, requireWorker, googleLink);
router.get('/apple', protect, requireWorker, appleLink);
// Opened by the phone itself (no login header); protected by the signed token.
router.get('/apple/pass/:token.pkpass', applePass);

module.exports = router;
