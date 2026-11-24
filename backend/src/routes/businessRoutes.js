const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, requireWorker } = require('../middleware/auth');
const { businessCodeLimiter } = require('../middleware/rateLimiter');
const { BUSINESS_TYPE_IDS } = require('../utils/businessTypes');
const {
  createBusiness,
  updateBusiness,
  getLogo,
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
  getMemberships,
} = require('../controllers/businessController');

const router = express.Router();

// Public: the picture of a business, shown on the profile of its team.
router.get('/:id/logo', getLogo);

router.use(protect);

// Owner: create the business, see the team and its reviews.
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('El nombre del negocio debe tener de 2 a 60 caracteres'),
    body('type').optional().isIn(BUSINESS_TYPE_IDS).withMessage('Elige un tipo de negocio de la lista'),
  ],
  validate,
  createBusiness
);
router.patch('/me', [body('type').optional().isIn(BUSINESS_TYPE_IDS).withMessage('Elige un tipo de negocio de la lista')], validate, updateBusiness);
router.get('/me', getMyBusiness);
router.get('/overview', getOverview);
router.get('/reviews', getReviews);

// Teams / places of the business, each with its own name and code.
const nameRule = body('name').trim().isLength({ min: 2, max: 60 }).withMessage('El nombre debe tener de 2 a 60 caracteres');
router.post(
  '/locations',
  [
    nameRule,
    body('kind').optional().isIn(['team', 'event']).withMessage('Tipo de equipo inválido'),
    body('startsAt').optional({ nullable: true }).isISO8601().withMessage('Fecha de inicio inválida'),
    body('endsAt').optional({ nullable: true }).isISO8601().withMessage('Fecha de fin inválida'),
  ],
  validate,
  createLocation
);
router.patch('/locations/:id', [nameRule], validate, renameLocation);
router.post('/locations/:id/code/rotate', rotateLocationCode);
router.delete('/locations/:id', deleteLocation);

router.delete('/members/:membershipId', removeMember);
router.patch('/members/:membershipId', [body('locationId').isString().notEmpty()], validate, moveMember);

// Team member: look up a code, join with consent, leave.
router.get('/lookup', businessCodeLimiter, lookupCode);
router.post(
  '/join',
  businessCodeLimiter,
  requireWorker,
  [body('mode').optional().isIn(['full', 'part'])],
  validate,
  joinBusiness
);
router.post('/leave', requireWorker, leaveBusiness);
router.get('/membership', getMembership);
router.get('/memberships', requireWorker, getMemberships);

module.exports = router;
