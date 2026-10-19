const express = require('express');
const requireAdminKey = require('../middleware/adminKey');
const { getStats, getLeads, getSources, updateLead, testEmail, regenerateQrs, workerStatus, getRecognitions, moderateRecognition, otpStatus } = require('../controllers/adminController');

const router = express.Router();

router.use(requireAdminKey);

router.get('/stats', getStats);
router.get('/leads', getLeads);
router.get('/sources', getSources);
router.patch('/leads/:id', updateLead);
router.get('/test-email', testEmail);
router.get('/regenerate-qrs', regenerateQrs);
router.get('/worker-status', workerStatus);
router.get('/recognitions', getRecognitions);
router.get('/recognitions/:id/:decision', (req, res, next) => { req.body = { status: req.params.decision === 'approve' ? 'published' : 'rejected' }; moderateRecognition(req, res, next); });
router.get('/otp-status', otpStatus);

module.exports = router;
