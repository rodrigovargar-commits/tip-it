const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logSecurityEvent } = require('../utils/logger');
const Business = require('../models/Business');
const Location = require('../models/Location');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Recognition = require('../models/Recognition');
const { publicBaseUrl } = require('../utils/publicUrl');
const { generateBusinessCode, normalizeBusinessCode, formatBusinessCode } = require('../utils/businessCode');

const PERIODS = [7, 30, 90, 365];
const DEFAULT_LOCATION = 'Principal';

const joinUrl = (code) => `${publicBaseUrl()}/negocio/unirme?c=${code}`;
const avg = (total, count) => (count ? Math.round((total / count) * 10) / 10 : null);
const sum = (arr, f) => arr.reduce((acc, x) => acc + f(x), 0);

function toLocationDTO(location, memberCount) {
  return {
    id: location._id,
    name: location.name,
    code: location.code,
    codeText: formatBusinessCode(location.code),
    joinUrl: joinUrl(location.code),
    memberCount,
  };
}

// Explicit output DTO: the raw documents carry owner ids and internals that the
// screens do not need.
async function toBusinessDTO(business, locations) {
  const counts = await Worker.aggregate([
    { $match: { business: business._id } },
    { $group: { _id: '$location', n: { $sum: 1 } } },
  ]);
  const byLocation = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    id: business._id,
    name: business.name,
    createdAt: business.createdAt,
    memberCount: sum(counts, (c) => c.n),
    locations: locations.map((l) => toLocationDTO(l, byLocation.get(String(l._id)) || 0)),
  };
}

// Owner routes answer 404 (not 403) when the caller owns no business, so the
// routes never confirm anything about someone else's business.
async function ownedBusinessOr404(user) {
  const business = user.ownedBusiness ? await Business.findById(user.ownedBusiness) : null;
  if (!business) throw new AppError('Todavía no tienes un negocio', 404);
  return business;
}

async function uniqueCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = generateBusinessCode();
    // eslint-disable-next-line no-await-in-loop
    const taken = (await Location.exists({ code })) || (await Business.exists({ code }));
    if (!taken) return code;
  }
  throw new AppError('No pudimos crear el código. Intenta de nuevo.', 500);
}

// Businesses created before places existed have one code on the business itself.
// The first time they are read, that code becomes the "Principal" place and the
// people already in it are attached to it, so nobody has to do anything.
async function ensureLocations(business) {
  let locations = await Location.find({ business: business._id }).sort({ createdAt: 1 });
  if (locations.length) return locations;
  try {
    const principal = await Location.create({ business: business._id, name: DEFAULT_LOCATION, code: business.code });
    await Worker.updateMany({ business: business._id, location: null }, { $set: { location: principal._id } });
    locations = [principal];
  } catch (err) {
    if (!err || err.code !== 11000) throw err;
    locations = await Location.find({ business: business._id }).sort({ createdAt: 1 }); // created by a parallel request
  }
  return locations;
}

async function ownedLocationOr404(business, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Equipo no encontrado', 404);
  const location = await Location.findOne({ _id: id, business: business._id });
  if (!location) throw new AppError('Equipo no encontrado', 404);
  return location;
}

const createBusiness = asyncHandler(async (req, res) => {
  if (req.user.isGuest) {
    throw new AppError('Primero completa tu cuenta con contraseña para crear un negocio', 403);
  }
  if (req.user.ownedBusiness) throw new AppError('Ya tienes un negocio', 409);

  let business;
  let location;
  try {
    const code = await uniqueCode();
    business = await Business.create({ name: req.body.name.trim(), owner: req.user._id, code });
    location = await Location.create({ business: business._id, name: DEFAULT_LOCATION, code });
  } catch (err) {
    // Two taps on "Crear" at once: the second one hits the one-business-per-owner rule.
    if (err && err.code === 11000) throw new AppError('Ya tienes un negocio', 409);
    throw err;
  }
  req.user.ownedBusiness = business._id;
  await req.user.save();

  logSecurityEvent({
    event: 'business.created',
    outcome: 'success',
    actorId: req.user._id,
    sourceIp: req.ip,
    target: `business:${business._id}`,
  });

  res.status(201).json({ success: true, business: await toBusinessDTO(business, [location]) });
});

const getMyBusiness = asyncHandler(async (req, res) => {
  if (!req.user.ownedBusiness) return res.json({ success: true, business: null });
  const business = await Business.findById(req.user.ownedBusiness);
  if (!business) return res.json({ success: true, business: null });
  const locations = await ensureLocations(business);
  return res.json({ success: true, business: await toBusinessDTO(business, locations) });
});

// ----- teams / places ----------------------------------------------------

const MAX_LOCATIONS = 50;

const createLocation = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  if ((await Location.countDocuments({ business: business._id })) >= MAX_LOCATIONS) {
    throw new AppError(`Un negocio puede tener hasta ${MAX_LOCATIONS} equipos`, 409);
  }
  const location = await Location.create({
    business: business._id,
    name: req.body.name.trim(),
    code: await uniqueCode(),
  });
  logSecurityEvent({
    event: 'business.location_created',
    outcome: 'success',
    actorId: req.user._id,
    sourceIp: req.ip,
    target: `location:${location._id}`,
  });
  res.status(201).json({ success: true, location: toLocationDTO(location, 0) });
});

const renameLocation = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  const location = await ownedLocationOr404(business, req.params.id);
  location.name = req.body.name.trim();
  await location.save();
  const memberCount = await Worker.countDocuments({ location: location._id });
  res.json({ success: true, location: toLocationDTO(location, memberCount) });
});

const rotateLocationCode = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  const location = await ownedLocationOr404(business, req.params.id);
  location.code = await uniqueCode();
  await location.save();
  logSecurityEvent({
    event: 'business.code_rotated',
    outcome: 'success',
    actorId: req.user._id,
    sourceIp: req.ip,
    target: `location:${location._id}`,
  });
  const memberCount = await Worker.countDocuments({ location: location._id });
  res.json({ success: true, location: toLocationDTO(location, memberCount) });
});

const deleteLocation = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  const location = await ownedLocationOr404(business, req.params.id);
  if ((await Location.countDocuments({ business: business._id })) <= 1) {
    throw new AppError('Tu negocio necesita al menos un equipo', 409);
  }
  if (await Worker.exists({ location: location._id })) {
    throw new AppError('Primero mueve o quita a las personas de este equipo', 409);
  }
  await location.deleteOne();
  res.json({ success: true });
});

// ----- numbers -----------------------------------------------------------

// Numbers per person, per team and for the whole business, for the last N days
// and overall. Counts, stars and reviews only: the business never sees how
// much money anyone received.
const getOverview = asyncHandler(async (req, res) => {
  // The portal opens with this single request. Someone with no business yet gets a plain
  // "no business" answer (not an error), so opening the page never logs a failed request.
  const business = req.user.ownedBusiness ? await Business.findById(req.user.ownedBusiness) : null;
  if (!business) return res.json({ success: true, business: null });
  const locations = await ensureLocations(business);
  const days = PERIODS.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const workers = await Worker.find({ business: business._id }).populate('user', 'name avatarUrl');
  const ids = workers.map((w) => w._id);

  const [periodTx, periodRec, pendingCount] = ids.length
    ? await Promise.all([
        Transaction.aggregate([
          { $match: { worker: { $in: ids }, status: 'succeeded', createdAt: { $gte: since } } },
          {
            $group: {
              _id: '$worker',
              tips: { $sum: 1 },
              ratingSum: { $sum: { $cond: [{ $ne: ['$rating', null] }, '$rating', 0] } },
              ratingCount: { $sum: { $cond: [{ $ne: ['$rating', null] }, 1, 0] } },
              withWords: {
                $sum: {
                  $cond: [{ $or: [{ $ne: ['$review', ''] }, { $ne: ['$comment', ''] }] }, 1, 0],
                },
              },
            },
          },
        ]),
        Recognition.aggregate([
          { $match: { worker: { $in: ids }, status: 'published', createdAt: { $gte: since } } },
          {
            $group: {
              _id: '$worker',
              count: { $sum: 1 },
              ratingSum: { $sum: { $cond: [{ $ne: ['$rating', null] }, '$rating', 0] } },
              ratingCount: { $sum: { $cond: [{ $ne: ['$rating', null] }, 1, 0] } },
            },
          },
        ]),
        Recognition.countDocuments({ worker: { $in: ids }, status: 'pending' }),
      ])
    : [[], [], 0];
  const txBy = new Map(periodTx.map((r) => [String(r._id), r]));
  const recBy = new Map(periodRec.map((r) => [String(r._id), r]));
  const nameOf = new Map(locations.map((l) => [String(l._id), l.name]));

  // One row per person with the raw sums, so teams and the business can add them up exactly.
  const rows = workers.map((w) => {
    const t = txBy.get(String(w._id)) || { tips: 0, ratingSum: 0, ratingCount: 0, withWords: 0 };
    const r = recBy.get(String(w._id)) || { count: 0, ratingSum: 0, ratingCount: 0 };
    return {
      worker: w,
      locationId: w.location ? String(w.location) : null,
      p: { tips: t.tips, rs: t.ratingSum + r.ratingSum, rc: t.ratingCount + r.ratingCount, reviews: t.withWords + r.count },
      all: { tips: w.tipCount, rs: w.ratingSum, rc: w.ratingCount },
    };
  });

  const shape = (list) => ({
    period: {
      tips: sum(list, (x) => x.p.tips),
      rating: avg(sum(list, (x) => x.p.rs), sum(list, (x) => x.p.rc)),
      reviews: sum(list, (x) => x.p.reviews),
    },
    total: {
      tips: sum(list, (x) => x.all.tips),
      rating: avg(sum(list, (x) => x.all.rs), sum(list, (x) => x.all.rc)),
      ratingCount: sum(list, (x) => x.all.rc),
    },
  });

  const members = rows
    .map((x) => {
      const s = shape([x]);
      return {
        id: x.worker._id,
        username: x.worker.username,
        name: x.worker.publicName || x.worker.user?.name || x.worker.username,
        avatarUrl: x.worker.user?.avatarUrl || null,
        occupation: x.worker.occupation,
        joinedAt: x.worker.businessJoinedAt,
        location: x.locationId ? { id: x.locationId, name: nameOf.get(x.locationId) || '' } : null,
        period: s.period,
        total: s.total,
      };
    })
    .sort((a, b) => b.period.tips - a.period.tips || b.total.tips - a.total.tips);

  const locationStats = locations.map((l) => {
    const list = rows.filter((x) => x.locationId === String(l._id));
    return { id: l._id, name: l.name, members: list.length, ...shape(list) };
  });

  // Optional focus on one team: the person list and totals narrow down, but the
  // team comparison always shows every team.
  const focus =
    req.query.location && locations.some((l) => String(l._id) === String(req.query.location))
      ? String(req.query.location)
      : null;
  const scoped = focus ? rows.filter((x) => x.locationId === focus) : rows;

  res.json({
    success: true,
    days,
    business: await toBusinessDTO(business, locations),
    totals: { members: scoped.length, ...shape(scoped), pendingReviews: pendingCount },
    locations: locationStats,
    members: focus ? members.filter((m) => m.location && m.location.id === focus) : members,
  });
});

// Every review left for the people of the business, newest first. Paid ones
// are marked as such (never with the amount); the ones left without paying only
// appear once TIP-IT moderation has published them. The owner can read them but
// cannot hide or edit them, so a business can't curate its own reputation.
const getReviews = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  const locations = await ensureLocations(business);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
  const before = req.query.before ? new Date(req.query.before) : null;
  const stars = Number(req.query.stars) || null;
  const nameOf = new Map(locations.map((l) => [String(l._id), l.name]));

  const workers = await Worker.find({ business: business._id }).populate('user', 'name');
  let scope = workers;
  if (req.query.member) {
    scope = scope.filter((w) => w.username === String(req.query.member).toLowerCase());
  }
  if (req.query.location) {
    scope = scope.filter((w) => w.location && String(w.location) === String(req.query.location));
  }
  const byId = new Map(scope.map((w) => [String(w._id), w]));
  const ids = scope.map((w) => w._id);
  if (!ids.length) return res.json({ success: true, reviews: [], next: null });

  const dateFilter = before && !Number.isNaN(before.getTime()) ? { createdAt: { $lt: before } } : {};
  const starFilter = stars ? { rating: stars } : {};

  const [paid, free] = await Promise.all([
    Transaction.find({
      worker: { $in: ids },
      status: 'succeeded',
      $or: [{ review: { $ne: '' } }, { comment: { $ne: '' } }, { rating: { $ne: null } }],
      ...dateFilter,
      ...starFilter,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('worker rating review comment reviewAlias createdAt'),
    Recognition.find({
      worker: { $in: ids },
      status: 'published',
      ...dateFilter,
      ...starFilter,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('worker rating comment alias createdAt'),
  ]);

  const memberOf = (id) => {
    const w = byId.get(String(id));
    return {
      username: w.username,
      name: w.publicName || w.user?.name || w.username,
      location: w.location ? nameOf.get(String(w.location)) || '' : '',
    };
  };
  const merged = [
    ...paid.map((t) => ({
      id: t._id,
      kind: 'paid',
      member: memberOf(t.worker),
      rating: t.rating,
      text: t.review || t.comment || '',
      author: t.reviewAlias || 'Anónimo',
      createdAt: t.createdAt,
    })),
    ...free.map((r) => ({
      id: r._id,
      kind: 'unpaid',
      member: memberOf(r.worker),
      rating: r.rating,
      text: r.comment || '',
      author: r.alias || 'Anónimo',
      createdAt: r.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);

  res.json({
    success: true,
    reviews: merged,
    next: merged.length === limit ? merged[merged.length - 1].createdAt : null,
  });
});

// ----- people ------------------------------------------------------------

const removeMember = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  if (!mongoose.isValidObjectId(req.params.workerId)) throw new AppError('Persona no encontrada', 404);
  const worker = await Worker.findOne({ _id: req.params.workerId, business: business._id });
  if (!worker) throw new AppError('Persona no encontrada', 404);
  worker.business = null;
  worker.businessJoinedAt = null;
  worker.location = null;
  await worker.save();
  logSecurityEvent({
    event: 'business.member_removed',
    outcome: 'success',
    actorId: req.user._id,
    sourceIp: req.ip,
    target: `worker:${worker._id}`,
  });
  res.json({ success: true });
});

// Move a person to another team of the same business.
const moveMember = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  if (!mongoose.isValidObjectId(req.params.workerId)) throw new AppError('Persona no encontrada', 404);
  const worker = await Worker.findOne({ _id: req.params.workerId, business: business._id });
  if (!worker) throw new AppError('Persona no encontrada', 404);
  const location = await ownedLocationOr404(business, req.body.locationId);
  worker.location = location._id;
  await worker.save();
  res.json({ success: true, location: { id: location._id, name: location.name } });
});

// Which place a code belongs to: a team's own code, or (businesses made before
// teams existed) the single code the business had.
async function resolveCode(rawCode) {
  const code = normalizeBusinessCode(rawCode);
  if (!code) return null;
  let location = await Location.findOne({ code });
  if (!location) {
    // Only a business that has no teams yet still answers to its old code; once it has
    // teams, a code that was rotated away must stop working.
    const legacy = await Business.findOne({ code });
    if (legacy && !(await Location.exists({ business: legacy._id }))) [location] = await ensureLocations(legacy);
  }
  if (!location) return null;
  const business = await Business.findById(location.business);
  if (!business) return null;
  const places = await Location.countDocuments({ business: business._id });
  return { business, location, places };
}

// A person asks what a code belongs to before agreeing to share their numbers.
const lookupCode = asyncHandler(async (req, res) => {
  const found = await resolveCode(req.query.code);
  if (!found) throw new AppError('Ese código no es válido', 404);
  res.json({
    success: true,
    business: { name: found.business.name, location: found.places > 1 ? found.location.name : null },
  });
});

const joinBusiness = asyncHandler(async (req, res) => {
  if (req.body.accept !== true) {
    throw new AppError('Para unirte debes aceptar que el negocio vea tus propinas, estrellas y reseñas', 400);
  }
  const found = await resolveCode(req.body.code);
  if (!found) throw new AppError('Ese código no es válido', 404);

  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Primero crea tu cuenta para recibir propinas', 403);
  if (worker.business && String(worker.business) !== String(found.business._id)) {
    throw new AppError('Ya perteneces a otro negocio. Sal de ese primero.', 409);
  }
  // Same business, another team: allowed, so the owner's own codes can be used to switch.
  const changed = !worker.business || String(worker.location) !== String(found.location._id);
  if (changed) {
    const firstTime = !worker.business;
    worker.business = found.business._id;
    worker.location = found.location._id;
    if (firstTime) worker.businessJoinedAt = new Date();
    await worker.save();
    logSecurityEvent({
      event: 'business.member_joined',
      outcome: 'success',
      actorId: req.user._id,
      sourceIp: req.ip,
      target: `location:${found.location._id}`,
    });
  }
  res.json({
    success: true,
    business: { name: found.business.name, location: found.places > 1 ? found.location.name : null },
  });
});

const leaveBusiness = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (worker && worker.business) {
    worker.business = null;
    worker.businessJoinedAt = null;
    worker.location = null;
    await worker.save();
  }
  res.json({ success: true });
});

// What business and team the signed-in person belongs to (if any), for their own panel.
const getMembership = asyncHandler(async (req, res) => {
  const worker = req.user.worker ? await Worker.findById(req.user.worker) : null;
  const business = worker && worker.business ? await Business.findById(worker.business) : null;
  if (!business) return res.json({ success: true, business: null });
  const places = await Location.countDocuments({ business: business._id });
  const location = worker.location && places > 1 ? await Location.findById(worker.location) : null;
  return res.json({
    success: true,
    business: { name: business.name, location: location ? location.name : null, joinedAt: worker.businessJoinedAt },
  });
});

// Called when an account is erased: the teams are released, the business closes.
async function releaseBusinessOf(user) {
  if (!user.ownedBusiness) return;
  await Worker.updateMany(
    { business: user.ownedBusiness },
    { $set: { business: null, businessJoinedAt: null, location: null } }
  );
  await Location.deleteMany({ business: user.ownedBusiness });
  await Business.deleteOne({ _id: user.ownedBusiness });
  await User.updateOne({ _id: user._id }, { $set: { ownedBusiness: null } });
}

module.exports = {
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
  releaseBusinessOf,
};
