const asyncHandler = require('../utils/asyncHandler');
const Visit = require('../models/Visit');
const cleanSource = require('../utils/cleanSource');

// Public, no auth. Always answers 204 so the page never waits on or reacts to it.
const trackVisit = asyncHandler(async (req, res) => {
  const source = cleanSource(req.body.source) || 'directo';
  const path = typeof req.body.path === 'string' ? req.body.path.slice(0, 100) : '/';
  await Visit.create({ source, path });
  res.status(204).end();
});

module.exports = { trackVisit };
