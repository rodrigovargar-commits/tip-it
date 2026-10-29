const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, requireWorker } = require('../middleware/auth');
const { businessCodeLimiter } = require('../middleware/rateLimiter');
const {
  createBusiness,
  getMyBusiness,
  rotateCode,
  getOverview,
  getReviews,
  removeMember,
  lookupCode,
  joinBusiness,
  leaveBusiness,
  getMembership,
} = require('../controllers/businessController');

const router = express.Router();
router.use(protect);

// Owner: create the business, see the team and its reviews.
router.post(
  '/',
  [body('name').trim().isLength({ min: 2, max: 60 }).withMessage('El nombre del negocio debe tener de 2 a 60 caracteres')],
  validate,
  createBusiness
);
router.get('/me', getMyBusiness);
router.post('/code/rotate', rotateCode);
router.get('/overview', getOverview);
router.get('/reviews', getReviews);
router.delete('/members/:workerId', removeMember);

// Team member: look up a code, join with consent, leave.
router.get('/lookup', businessCodeLimiter, lookupCode);
router.post('/join', businessCodeLimiter, requireWorker, joinBusiness);
router.post('/leave', requireWorker, leaveBusiness);
router.get('/membership', getMembership);

module.exports = router;
