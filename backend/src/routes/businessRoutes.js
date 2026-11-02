const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, requireWorker } = require('../middleware/auth');
const { businessCodeLimiter } = require('../middleware/rateLimiter');
const {
  createBusiness,
  getMyBusiness,
  createLocation,
  renameLocation,
  rotateLocationCode,
  deleteLocation,
  getOverview,
  getReviews,
  removeMember,
  moveMember,
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
router.get('/overview', getOverview);
router.get('/reviews', getReviews);

// Teams / places of the business, each with its own name and code.
const nameRule = body('name').trim().isLength({ min: 2, max: 60 }).withMessage('El nombre debe tener de 2 a 60 caracteres');
router.post('/locations', [nameRule], validate, createLocation);
router.patch('/locations/:id', [nameRule], validate, renameLocation);
router.post('/locations/:id/code/rotate', rotateLocationCode);
router.delete('/locations/:id', deleteLocation);

router.delete('/members/:workerId', removeMember);
router.patch('/members/:workerId', [body('locationId').isString().notEmpty()], validate, moveMember);

// Team member: look up a code, join with consent, leave.
router.get('/lookup', businessCodeLimiter, lookupCode);
router.post('/join', businessCodeLimiter, requireWorker, joinBusiness);
router.post('/leave', requireWorker, leaveBusiness);
router.get('/membership', getMembership);

module.exports = router;
