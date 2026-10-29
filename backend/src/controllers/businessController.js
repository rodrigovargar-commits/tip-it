const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logSecurityEvent } = require('../utils/logger');
const Business = require('../models/Business');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Recognition = require('../models/Recognition');
const { publicBaseUrl } = require('../utils/publicUrl');
const { generateBusinessCode, normalizeBusinessCode, formatBusinessCode } = require('../utils/businessCode');

const PERIODS = [7, 30, 90, 365];

function joinUrl(code) {
  return `${publicBaseUrl()}/negocio/unirme?c=${code}`;
}

// Explicit output DTO: the raw document carries owner ids and internals that
// the screens do not need.
function toBusinessDTO(business, memberCount) {
  return {
    id: business._id,
    name: business.name,
    code: business.code,
    codeText: formatBusinessCode(business.code),
    joinUrl: joinUrl(business.code),
    memberCount,
    createdAt: business.createdAt,
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
    if (!(await Business.exists({ code }))) return code;
  }
  throw new AppError('No pudimos crear el código. Intenta de nuevo.', 500);
}

const createBusiness = asyncHandler(async (req, res) => {
  if (req.user.isGuest) {
    throw new AppError('Primero completa tu cuenta con contraseña para crear un negocio', 403);
  }
  if (req.user.ownedBusiness) throw new AppError('Ya tienes un negocio', 409);

  let business;
  try {
    business = await Business.create({
      name: req.body.name.trim(),
      owner: req.user._id,
      code: await uniqueCode(),
    });
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

  res.status(201).json({ success: true, business: toBusinessDTO(business, 0) });
});

const getMyBusiness = asyncHandler(async (req, res) => {
  if (!req.user.ownedBusiness) return res.json({ success: true, business: null });
  const business = await Business.findById(req.user.ownedBusiness);
  if (!business) return res.json({ success: true, business: null });
  const memberCount = await Worker.countDocuments({ business: business._id });
  return res.json({ success: true, business: toBusinessDTO(business, memberCount) });
});

const rotateCode = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  business.code = await uniqueCode();
  await business.save();
  logSecurityEvent({
    event: 'business.code_rotated',
    outcome: 'success',
    actorId: req.user._id,
    sourceIp: req.ip,
    target: `business:${business._id}`,
  });
  const memberCount = await Worker.countDocuments({ business: business._id });
  res.json({ success: true, business: toBusinessDTO(business, memberCount) });
});

// Numbers per person and for the whole team, for the last N days and overall.
// Counts, stars and reviews only: the business never sees how much money anyone received.
const getOverview = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  const days = PERIODS.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const workers = await Worker.find({ business: business._id }).populate('user', 'name avatarUrl');
  const ids = workers.map((w) => w._id);

  const [periodTx, periodRec] = ids.length
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
      ])
    : [[], []];
  const pendingCount = ids.length
    ? await Recognition.countDocuments({ worker: { $in: ids }, status: 'pending' })
    : 0;

  const txBy = new Map(periodTx.map((r) => [String(r._id), r]));
  const recBy = new Map(periodRec.map((r) => [String(r._id), r]));
  const avg = (sum, count) => (count ? Math.round((sum / count) * 10) / 10 : null);

  const members = workers.map((w) => {
    const t = txBy.get(String(w._id)) || { tips: 0, ratingSum: 0, ratingCount: 0, withWords: 0 };
    const r = recBy.get(String(w._id)) || { count: 0, ratingSum: 0, ratingCount: 0 };
    return {
      id: w._id,
      username: w.username,
      name: w.publicName || w.user?.name || w.username,
      avatarUrl: w.user?.avatarUrl || null,
      occupation: w.occupation,
      joinedAt: w.businessJoinedAt,
      period: {
        tips: t.tips,
        rating: avg(t.ratingSum + r.ratingSum, t.ratingCount + r.ratingCount),
        reviews: t.withWords + r.count,
      },
      total: {
        tips: w.tipCount,
        rating: w.ratingCount ? w.rating : null,
        ratingCount: w.ratingCount,
      },
    };
  });
  members.sort((a, b) => b.period.tips - a.period.tips || b.total.tips - a.total.tips);

  const sum = (arr, f) => arr.reduce((acc, m) => acc + f(m), 0);
  const rated = members.filter((m) => m.total.ratingCount > 0);
  const periodRatedCount = sum(periodTx, (r) => r.ratingCount) + sum(periodRec, (r) => r.ratingCount);
  const periodRatedSum = sum(periodTx, (r) => r.ratingSum) + sum(periodRec, (r) => r.ratingSum);

  res.json({
    success: true,
    days,
    business: toBusinessDTO(business, members.length),
    totals: {
      members: members.length,
      period: {
        tips: sum(members, (m) => m.period.tips),
        rating: avg(periodRatedSum, periodRatedCount),
        reviews: sum(members, (m) => m.period.reviews),
      },
      all: {
        tips: sum(members, (m) => m.total.tips),
        rating: avg(
          sum(rated, (m) => m.total.rating * m.total.ratingCount),
          sum(rated, (m) => m.total.ratingCount)
        ),
      },
      pendingReviews: pendingCount,
    },
    members,
  });
});

// Every review left for the people of the business, newest first. Paid ones
// are marked as such (never with the amount); the ones left without paying only appear once TIP-IT
// moderation has published them. The owner can read them but cannot hide or edit
// them, so a business can't curate its own reputation.
const getReviews = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
  const before = req.query.before ? new Date(req.query.before) : null;
  const stars = Number(req.query.stars) || null;

  const workers = await Worker.find({ business: business._id }).populate('user', 'name');
  let scope = workers;
  if (req.query.member) {
    scope = workers.filter((w) => w.username === String(req.query.member).toLowerCase());
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
    return { username: w.username, name: w.publicName || w.user?.name || w.username };
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

const removeMember = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  if (!mongoose.isValidObjectId(req.params.workerId)) throw new AppError('Persona no encontrada', 404);
  const worker = await Worker.findOne({ _id: req.params.workerId, business: business._id });
  if (!worker) throw new AppError('Persona no encontrada', 404);
  worker.business = null;
  worker.businessJoinedAt = null;
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

// A person asks what business a code belongs to before agreeing to share
// their numbers with it.
const lookupCode = asyncHandler(async (req, res) => {
  const code = normalizeBusinessCode(req.query.code);
  const business = code ? await Business.findOne({ code }) : null;
  if (!business) throw new AppError('Ese código no es válido', 404);
  res.json({ success: true, business: { name: business.name } });
});

const joinBusiness = asyncHandler(async (req, res) => {
  if (req.body.accept !== true) {
    throw new AppError('Para unirte debes aceptar que el negocio vea tus propinas, calificaciones y reseñas', 400);
  }
  const code = normalizeBusinessCode(req.body.code);
  const business = code ? await Business.findOne({ code }) : null;
  if (!business) throw new AppError('Ese código no es válido', 404);

  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Primero crea tu cuenta para recibir propinas', 403);
  if (worker.business && String(worker.business) !== String(business._id)) {
    throw new AppError('Ya perteneces a otro negocio. Sal de ese primero.', 409);
  }
  if (!worker.business) {
    worker.business = business._id;
    worker.businessJoinedAt = new Date();
    await worker.save();
    logSecurityEvent({
      event: 'business.member_joined',
      outcome: 'success',
      actorId: req.user._id,
      sourceIp: req.ip,
      target: `business:${business._id}`,
    });
  }
  res.json({ success: true, business: { name: business.name } });
});

const leaveBusiness = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (worker && worker.business) {
    worker.business = null;
    worker.businessJoinedAt = null;
    await worker.save();
  }
  res.json({ success: true });
});

// What business the signed-in person belongs to (if any), for their own panel.
const getMembership = asyncHandler(async (req, res) => {
  const worker = req.user.worker ? await Worker.findById(req.user.worker) : null;
  const business = worker && worker.business ? await Business.findById(worker.business) : null;
  res.json({
    success: true,
    business: business ? { name: business.name, joinedAt: worker.businessJoinedAt } : null,
  });
});

// Called when an account is erased: the team is released, the business closes.
async function releaseBusinessOf(user) {
  if (!user.ownedBusiness) return;
  await Worker.updateMany(
    { business: user.ownedBusiness },
    { $set: { business: null, businessJoinedAt: null } }
  );
  await Business.deleteOne({ _id: user.ownedBusiness });
  await User.updateOne({ _id: user._id }, { $set: { ownedBusiness: null } });
}

module.exports = {
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
  releaseBusinessOf,
};
