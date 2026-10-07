const express = require('express');
const requireAdminKey = require('../middleware/adminKey');
const { getStats, getLeads, updateLead, testEmail, regenerateQrs, workerStatus } = require('../controllers/adminController');

const router = express.Router();

router.use(requireAdminKey);

router.get('/stats', getStats);
router.get('/leads', getLeads);
router.patch('/leads/:id', updateLead);
router.get('/test-email', testEmail);
router.get('/regenerate-qrs', regenerateQrs);
router.get('/worker-status', workerStatus);

module.exports = router;
