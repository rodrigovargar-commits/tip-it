const express = require('express');
const { guestLimiter } = require('../middleware/rateLimiter');
const { trackVisit } = require('../controllers/trackController');

const router = express.Router();

router.post('/visit', guestLimiter, trackVisit);

module.exports = router;
