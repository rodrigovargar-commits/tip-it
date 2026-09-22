const express = require('express');
const requireAdminKey = require('../middleware/adminKey');
const { getStats, getLeads, updateLead } = require('../controllers/adminController');

const router = express.Router();

router.use(requireAdminKey);

router.get('/stats', getStats);
router.get('/leads', getLeads);
router.patch('/leads/:id', updateLead);

module.exports = router;
