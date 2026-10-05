const express = require('express');
const requireAdminKey = require('../middleware/adminKey');
const { getStats, getLeads, updateLead, testEmail } = require('../controllers/adminController');

const router = express.Router();

router.use(requireAdminKey);

router.get('/stats', getStats);
router.get('/leads', getLeads);
router.patch('/leads/:id', updateLead);
router.get('/test-email', testEmail);

module.exports = router;
