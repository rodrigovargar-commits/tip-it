const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logSecurityEvent } = require('../utils/logger');
const Business = require('../models/Business');
const Location = require('../models/Location');
const Membership = require('../models/Membership');
const Qr = require('../models/Qr');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Recognition = require('../models/Recognition');
const { publicBaseUrl } = require('../utils/publicUrl');
const { avatarPath, etagOf } = require('../utils/avatar');
const { typeLabel, BUSINESS_TERMS_VERSION } = require('../utils/businessTypes');
const { logoPath, readLogo, logoBuffer } = require('../utils/businessLogo');
const { generateBusinessCode, normalizeBusinessCode, formatBusinessCode } = require('../utils/businessCode');
const { windowOf, mongoFilterFor } = require('../utils/membershipWindow');
const { newQrCode, qrUrl, qrImage } = require('../utils/qrCodes');

const PERIODS = [7, 30, 90, 365];
const DEFAULT_LOCATION = 'Principal';
const MAX_LOCATIONS = 50;
const MAX_EVENT_DAYS = 62;
const SCAN_LIMIT = 20000; // safety cap on how many payments one screen reads

const joinUrl = (code) => `${publicBaseUrl()}/negocio/unirme?c=${code}`;
const avg = (total, count) => (count ? Math.round((total / count) * 10) / 10 : null);
const sum = (arr, f) => arr.reduce((acc, x) => acc + f(x), 0);
const hasWords = (t) => Boolean((t.review && t.review.length) || (t.comment && t.comment.length));

function eventState(location, now = new Date()) {
  if (location.kind !== 'event' || !location.startsAt || !location.endsAt) return null;
  if (now < location.startsAt) return 'upcoming';
  if (now > location.endsAt) return 'ended';
  return 'live';
}

function toLocationDTO(location, memberCount) {
  return {
    id: location._id,
    name: location.name,
    kind: location.kind || 'team',
    startsAt: location.startsAt || null,
    endsAt: location.endsAt || null,
    state: eventState(location),
    code: location.code,
    codeText: formatBusinessCode(location.code),
    joinUrl: joinUrl(location.code),
    memberCount,
  };
}

// Explicit output DTO: the raw documents carry owner ids and internals that the
// screens do not need.
async function toBusinessDTO(business, locations) {
  const counts = await Membership.aggregate([
    { $match: { business: business._id } },
    { $group: { _id: '$location', n: { $sum: 1 } } },
  ]);
  const byLocation = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    id: business._id,
    name: business.name,
    type: business.type || 'otro',
    typeLabel: typeLabel(business.type),
    logoUrl: logoPath(business),
    termsVersion: business.termsVersion || null,
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

async function uniqueQrCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = newQrCode();
    // eslint-disable-next-line no-await-in-loop
    if (!(await Qr.exists({ code }))) return code;
  }
  throw new AppError('No pudimos crear el QR. Intenta de nuevo.', 500);
}

// Businesses created before places existed have one code on the business itself.
// The first time they are read, that code becomes the "Principal" place.
async function ensureLocations(business) {
  let locations = await Location.find({ business: business._id }).sort({ createdAt: 1 });
  if (locations.length) return locations;
  try {
    const principal = await Location.create({ business: business._id, name: DEFAULT_LOCATION, code: business.code });
    locations = [principal];
  } catch (err) {
    if (!err || err.code !== 11000) throw err;
    locations = await Location.find({ business: business._id }).sort({ createdAt: 1 }); // created by a parallel request
  }
  return locations;
}

// People who joined before memberships existed (they only had worker.business) become
// full-time members from the day they joined, so nobody loses their place.
async function ensureMemberships(business, locations) {
  const legacy = await Worker.find({ business: business._id }).select('_id location businessJoinedAt createdAt');
  if (!legacy.length) return;
  const have = new Set((await Membership.find({ business: business._id }).select('worker')).map((m) => String(m.worker)));
  const fallback = locations[0];
  const valid = new Set(locations.map((l) => String(l._id)));
  await Promise.all(
    legacy
      .filter((w) => !have.has(String(w._id)))
      .map((w) =>
        Membership.create({
          worker: w._id,
          business: business._id,
          location: w.location && valid.has(String(w.location)) ? w.location : fallback._id,
          scope: 'all',
          joinedAt: w.businessJoinedAt || w.createdAt || new Date(),
        }).catch((err) => {
          if (!err || err.code !== 11000) throw err;
        })
      )
  );
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
  if (req.body.acceptTerms !== true) {
    throw new AppError('Para crear tu negocio acepta los términos y condiciones para negocios', 400);
  }
  let logo;
  try {
    logo = readLogo(req.body.logo);
  } catch (e) {
    throw new AppError(e.message, 400);
  }

  let business;
  let location;
  try {
    const code = await uniqueCode();
    business = await Business.create({
      name: req.body.name.trim(),
      owner: req.user._id,
      code,
      type: req.body.type || 'otro',
      logo,
      hasLogo: Boolean(logo),
      logoVersion: Date.now(),
      termsVersion: BUSINESS_TERMS_VERSION,
      termsAcceptedAt: new Date(),
    });
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

// The owner changes the kind of business or its picture later (send logo: null to remove it).
const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.user.ownedBusiness).select('+logo');
  if (!business) throw new AppError('Todavía no tienes un negocio', 404);
  if (req.body.type !== undefined) business.type = req.body.type;
  if (req.body.logo !== undefined) {
    let logo;
    try {
      logo = readLogo(req.body.logo);
    } catch (e) {
      throw new AppError(e.message, 400);
    }
    business.logo = logo;
    business.hasLogo = Boolean(logo);
    business.logoVersion = Date.now();
  }
  await business.save();
  const locations = await ensureLocations(business);
  res.json({ success: true, business: await toBusinessDTO(business, locations) });
});

// Public: the picture of a business, resized and cacheable (its address carries the version).
const getLogo = asyncHandler(async (req, res) => {
  const business = mongoose.isValidObjectId(req.params.id)
    ? await Business.findById(req.params.id).select('+logo hasLogo logoVersion')
    : null;
  if (!business || !business.hasLogo) throw new AppError('Sin imagen', 404);
  const img = await logoBuffer(business);
  if (!img) throw new AppError('Sin imagen', 404);
  const etag = etagOf(img.buffer);
  const current = String(req.query.v || '') === String(business.logoVersion || 0);
  res.set({
    'Content-Type': img.type,
    ETag: etag,
    'Cache-Control': current ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  return res.send(img.buffer);
});

const getMyBusiness = asyncHandler(async (req, res) => {
  if (!req.user.ownedBusiness) return res.json({ success: true, business: null });
  const business = await Business.findById(req.user.ownedBusiness);
  if (!business) return res.json({ success: true, business: null });
  const locations = await ensureLocations(business);
  await ensureMemberships(business, locations);
  return res.json({ success: true, business: await toBusinessDTO(business, locations) });
});

// ----- teams, places and events -------------------------------------------

const createLocation = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  if ((await Location.countDocuments({ business: business._id })) >= MAX_LOCATIONS) {
    throw new AppError(`Un negocio puede tener hasta ${MAX_LOCATIONS} equipos y eventos`, 409);
  }

  const data = { business: business._id, name: req.body.name.trim(), code: await uniqueCode(), kind: 'team' };
  if (req.body.kind === 'event') {
    const startsAt = new Date(req.body.startsAt);
    const endsAt = new Date(req.body.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new AppError('Pon la fecha y hora de inicio y de fin del evento', 400);
    }
    if (endsAt <= startsAt) throw new AppError('El evento debe terminar después de empezar', 400);
    if (endsAt <= new Date()) throw new AppError('El evento ya terminó. Elige fechas que no hayan pasado', 400);
    if (endsAt - startsAt > MAX_EVENT_DAYS * 24 * 60 * 60 * 1000) {
      throw new AppError(`Un evento puede durar hasta ${MAX_EVENT_DAYS} días. Para algo más largo crea un equipo.`, 400);
    }
    Object.assign(data, { kind: 'event', startsAt, endsAt });
  }

  const location = await Location.create(data);
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
  const memberCount = await Membership.countDocuments({ location: location._id });
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
  const memberCount = await Membership.countDocuments({ location: location._id });
  res.json({ success: true, location: toLocationDTO(location, memberCount) });
});

const deleteLocation = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  const location = await ownedLocationOr404(business, req.params.id);
  if (location.kind !== 'event' && (await Location.countDocuments({ business: business._id, kind: { $ne: 'event' } })) <= 1) {
    throw new AppError('Tu negocio necesita al menos un equipo', 409);
  }
  if (await Membership.exists({ location: location._id })) {
    throw new AppError(
      location.kind === 'event'
        ? 'Este evento ya tiene personas y resultados. Se conserva para que puedas revisarlo.'
        : 'Primero mueve o quita a las personas de este equipo',
      409
    );
  }
  await location.deleteOne();
  res.json({ success: true });
});

// ----- reading what happened ----------------------------------------------

// Loads every membership of the business with the data needed to read its numbers.
async function loadMemberships(business, locations) {
  const memberships = await Membership.find({ business: business._id }).populate({
    path: 'worker',
    populate: { path: 'user', select: 'name hasAvatar avatarVersion isWorker' },
  });
  const locById = new Map(locations.map((l) => [String(l._id), l]));
  const qrs = await Qr.find({ _id: { $in: memberships.map((m) => m.qr).filter(Boolean) } }).select('code name');
  const qrById = new Map(qrs.map((q) => [String(q._id), q]));
  return memberships
    .filter((m) => m.worker && locById.has(String(m.location)))
    .map((m) => {
      const location = locById.get(String(m.location));
      const qr = m.qr ? qrById.get(String(m.qr)) : null;
      const win = windowOf(m, location);
      return { m, worker: m.worker, location, qrCode: qr ? qr.code : null, win, filter: mongoFilterFor(m, win, qr ? qr.code : null) };
    });
}

// A payment or comment is read by the membership whose window and QR fit it; if two fit
// (someone full time who also has an event), the more specific one (the QR) takes it.
function indexByWorker(rows) {
  const byWorker = new Map();
  rows.forEach((r) => {
    const k = String(r.worker._id);
    if (!byWorker.has(k)) byWorker.set(k, []);
    byWorker.get(k).push(r);
  });
  byWorker.forEach((list) => list.sort((a, b) => (a.m.scope === 'qr' ? 0 : 1) - (b.m.scope === 'qr' ? 0 : 1)));
  return byWorker;
}

function owner(item, list) {
  const at = new Date(item.createdAt).getTime();
  return list.find((r) => {
    if (at < r.win.start.getTime()) return false;
    if (r.win.end && at > r.win.end.getTime()) return false;
    if (r.m.scope === 'qr') return Boolean(r.qrCode) && item.qr === r.qrCode;
    return true;
  });
}

// Numbers per person, per team and for the whole business, for the last N days
// and over the whole time each person was enrolled. Counts, stars and reviews
// only: the business never sees how much money anyone received, and never sees
// anything from before a person joined.
const getOverview = asyncHandler(async (req, res) => {
  // The portal opens with this single request. Someone with no business yet gets a plain
  // "no business" answer (not an error), so opening the page never logs a failed request.
  const business = req.user.ownedBusiness ? await Business.findById(req.user.ownedBusiness) : null;
  if (!business) return res.json({ success: true, business: null });

  const locations = await ensureLocations(business);
  await ensureMemberships(business, locations);
  const days = PERIODS.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await loadMemberships(business, locations);
  const byWorker = indexByWorker(rows);
  const stats = new Map(
    rows.map((r) => [
      String(r.m._id),
      { all: { tips: 0, rs: 0, rc: 0, reviews: 0 }, p: { tips: 0, rs: 0, rc: 0, reviews: 0 } },
    ])
  );
  let pending = 0;

  if (rows.length) {
    const or = rows.map((r) => r.filter);
    const [txs, recs] = await Promise.all([
      Transaction.find({ status: 'succeeded', $or: or }).select('worker qr rating review comment createdAt').limit(SCAN_LIMIT).lean(),
      Recognition.find({ status: { $in: ['published', 'pending'] }, $or: or }).select('worker qr rating status createdAt').limit(SCAN_LIMIT).lean(),
    ]);
    const add = (r, item, isTip, isReview) => {
      const s = stats.get(String(r.m._id));
      const buckets = new Date(item.createdAt) >= since ? [s.all, s.p] : [s.all];
      buckets.forEach((b) => {
        if (isTip) b.tips += 1;
        if (item.rating) {
          b.rs += item.rating;
          b.rc += 1;
        }
        if (isReview) b.reviews += 1;
      });
    };
    txs.forEach((t) => {
      const r = owner(t, byWorker.get(String(t.worker)) || []);
      if (r) add(r, t, true, hasWords(t));
    });
    recs.forEach((x) => {
      const r = owner(x, byWorker.get(String(x.worker)) || []);
      if (!r) return;
      if (x.status === 'pending') pending += 1;
      else add(r, x, false, true);
    });
  }

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
      reviews: sum(list, (x) => x.all.reviews),
    },
  });

  const items = rows.map((r) => ({ r, ...stats.get(String(r.m._id)) }));
  const members = items
    .map((x) => {
      const w = x.r.worker;
      const s = shape([x]);
      return {
        id: x.r.m._id,
        username: w.username,
        name: w.publicName || w.user?.name || w.username,
        avatarUrl: avatarPath(w.user),
        occupation: w.occupation,
        joinedAt: x.r.m.joinedAt,
        scope: x.r.m.scope,
        window: { start: x.r.win.start, end: x.r.win.end },
        location: { id: x.r.location._id, name: x.r.location.name, kind: x.r.location.kind || 'team' },
        period: s.period,
        total: s.total,
      };
    })
    .sort((a, b) => b.period.tips - a.period.tips || b.total.tips - a.total.tips);

  const locationStats = locations.map((l) => {
    const list = items.filter((x) => String(x.r.location._id) === String(l._id));
    return { ...toLocationDTO(l, list.length), members: list.length, ...shape(list) };
  });

  const focus =
    req.query.location && locations.some((l) => String(l._id) === String(req.query.location))
      ? String(req.query.location)
      : null;
  const scoped = focus ? items.filter((x) => String(x.r.location._id) === focus) : items;

  res.json({
    success: true,
    days,
    business: await toBusinessDTO(business, locations),
    totals: { members: scoped.length, ...shape(scoped), pendingReviews: pending },
    locations: locationStats,
    members: focus ? members.filter((m) => String(m.location.id) === focus) : members,
  });
});

// Every review left for the people of the business, newest first, only from the time
// each person was enrolled. Paid ones are marked as such (never with the amount); the
// ones left without paying only appear once TIP-IT moderation has published them. The
// owner can read them but cannot hide or edit them.
const getReviews = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  const locations = await ensureLocations(business);
  await ensureMemberships(business, locations);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
  const before = req.query.before ? new Date(req.query.before) : null;
  const stars = Number(req.query.stars) || null;

  let rows = await loadMemberships(business, locations);
  if (req.query.member) rows = rows.filter((r) => r.worker.username === String(req.query.member).toLowerCase());
  if (req.query.location) rows = rows.filter((r) => String(r.location._id) === String(req.query.location));
  if (!rows.length) return res.json({ success: true, reviews: [], next: null });
  const byWorker = indexByWorker(rows);

  const cursor = before && !Number.isNaN(before.getTime()) ? before : null;
  // each membership's own window/QR filter, narrowed by the screen's date cursor
  const or = rows.map((r) => {
    const f = { ...r.filter, createdAt: { ...r.filter.createdAt } };
    if (cursor) f.createdAt.$lt = cursor;
    return f;
  });

  const [paid, free] = await Promise.all([
    Transaction.find({
      status: 'succeeded',
      $or: or,
      $and: [{ $or: [{ review: { $ne: '' } }, { comment: { $ne: '' } }, { rating: { $ne: null } }] }],
      ...(stars ? { rating: stars } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .select('worker qr rating review comment reviewAlias createdAt')
      .lean(),
    Recognition.find({ status: 'published', $or: or, ...(stars ? { rating: stars } : {}) })
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .select('worker qr rating comment alias createdAt')
      .lean(),
  ]);

  const describe = (item, base) => {
    const r = owner(item, byWorker.get(String(item.worker)) || []);
    if (!r) return null;
    return {
      ...base,
      member: {
        username: r.worker.username,
        name: r.worker.publicName || r.worker.user?.name || r.worker.username,
        location: r.location.name,
        kind: r.location.kind || 'team',
      },
      createdAt: item.createdAt,
    };
  };

  const merged = [
    ...paid.map((t) => describe(t, { id: t._id, kind: 'paid', rating: t.rating, text: t.review || t.comment || '', author: t.reviewAlias || 'Anónimo' })),
    ...free.map((x) => describe(x, { id: x._id, kind: 'unpaid', rating: x.rating, text: x.comment || '', author: x.alias || 'Anónimo' })),
  ]
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);

  res.json({
    success: true,
    reviews: merged,
    next: merged.length === limit ? merged[merged.length - 1].createdAt : null,
  });
});

// ----- people -------------------------------------------------------------

async function endMembership(membership) {
  if (membership.qr) await Qr.updateOne({ _id: membership.qr }, { $set: { archivedAt: new Date() } });
  await membership.deleteOne();
}

const removeMember = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  if (!mongoose.isValidObjectId(req.params.membershipId)) throw new AppError('Persona no encontrada', 404);
  const membership = await Membership.findOne({ _id: req.params.membershipId, business: business._id });
  if (!membership) throw new AppError('Persona no encontrada', 404);
  await endMembership(membership);
  logSecurityEvent({
    event: 'business.member_removed',
    outcome: 'success',
    actorId: req.user._id,
    sourceIp: req.ip,
    target: `worker:${membership.worker}`,
  });
  res.json({ success: true });
});

// Move a person to another team of the same business (events keep who took part).
const moveMember = asyncHandler(async (req, res) => {
  const business = await ownedBusinessOr404(req.user);
  if (!mongoose.isValidObjectId(req.params.membershipId)) throw new AppError('Persona no encontrada', 404);
  const membership = await Membership.findOne({ _id: req.params.membershipId, business: business._id }).populate('location');
  if (!membership) throw new AppError('Persona no encontrada', 404);
  const target = await ownedLocationOr404(business, req.body.locationId);
  if (target.kind === 'event' || (membership.location && membership.location.kind === 'event')) {
    throw new AppError('Las personas de un evento no se mueven: el evento conserva quién participó', 409);
  }
  membership.location = target._id;
  await membership.save();
  res.json({ success: true, location: { id: target._id, name: target.name } });
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

const placeName = (found) => (found.places > 1 || found.location.kind === 'event' ? found.location.name : null);

// A person asks what a code belongs to before agreeing to share their numbers.
const lookupCode = asyncHandler(async (req, res) => {
  const found = await resolveCode(req.query.code);
  if (!found) throw new AppError('Ese código no es válido', 404);
  const { location } = found;
  res.json({
    success: true,
    business: {
      name: found.business.name,
      type: found.business.type || 'otro',
      typeLabel: typeLabel(found.business.type),
      logoUrl: logoPath(found.business),
      location: placeName(found),
      kind: location.kind || 'team',
      startsAt: location.startsAt || null,
      endsAt: location.endsAt || null,
      state: eventState(location),
    },
  });
});

async function membershipDTO(membership, business, location, qr, worker) {
  return {
    id: membership._id,
    business: business.name,
    location: location.name,
    kind: location.kind || 'team',
    state: eventState(location),
    scope: membership.scope,
    joinedAt: membership.joinedAt,
    window: windowOf(membership, location),
    qr: qr
      ? { id: qr._id, name: qr.name, code: qr.code, url: qrUrl(worker.username, qr.code), image: await qrImage(worker.username, qr.code) }
      : null,
  };
}

const joinBusiness = asyncHandler(async (req, res) => {
  if (req.body.accept !== true) {
    throw new AppError('Para unirte debes aceptar que el negocio vea tus propinas, estrellas y reseñas desde hoy', 400);
  }
  const found = await resolveCode(req.body.code);
  if (!found) throw new AppError('Ese código no es válido', 404);
  const { business, location } = found;

  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Primero crea tu cuenta para recibir propinas', 403);

  const isEvent = location.kind === 'event';
  if (isEvent && location.endsAt && location.endsAt < new Date()) {
    throw new AppError('Este evento ya terminó', 410);
  }
  // Events always count only what came through their own QR; a team lets the person choose.
  const scope = isEvent || req.body.mode === 'part' ? 'qr' : 'all';

  let membership = await Membership.findOne({ worker: worker._id, location: location._id });
  let qr = membership && membership.qr ? await Qr.findById(membership.qr) : null;

  if (!membership && !isEvent) {
    // A team is one place in a business: joining another team of the same business moves the person.
    const current = await Membership.findOne({ worker: worker._id, business: business._id }).populate('location');
    if (current && current.location && current.location.kind !== 'event') {
      current.location = location._id;
      await current.save();
      membership = current;
      qr = current.qr ? await Qr.findById(current.qr) : null;
    }
  }

  if (!membership) {
    const label = `${business.name}${found.places > 1 || isEvent ? ` · ${location.name}` : ''}`.slice(0, 80);
    qr = await Qr.create({ worker: worker._id, name: label, code: await uniqueQrCode(), kind: 'business' });
    try {
      membership = await Membership.create({
        worker: worker._id,
        business: business._id,
        location: location._id,
        scope,
        qr: qr._id,
        joinedAt: new Date(),
      });
    } catch (err) {
      await qr.deleteOne();
      if (!err || err.code !== 11000) throw err;
      membership = await Membership.findOne({ worker: worker._id, location: location._id });
      qr = membership && membership.qr ? await Qr.findById(membership.qr) : null;
    }
    logSecurityEvent({
      event: 'business.member_joined',
      outcome: 'success',
      actorId: req.user._id,
      sourceIp: req.ip,
      target: `location:${location._id}`,
    });
  }

  res.json({
    success: true,
    business: { name: business.name, location: placeName(found) },
    membership: await membershipDTO(membership, business, location, qr, worker),
  });
});

// The person leaves one business, team or event. Its QR stops being counted.
const leaveBusiness = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) return res.json({ success: true });
  let list = [];
  if (req.body && req.body.membershipId) {
    if (!mongoose.isValidObjectId(req.body.membershipId)) throw new AppError('No encontramos esa pertenencia', 404);
    list = await Membership.find({ _id: req.body.membershipId, worker: worker._id });
    if (!list.length) throw new AppError('No encontramos esa pertenencia', 404);
  } else {
    // Older screens sent nothing: fine when there is exactly one.
    list = await Membership.find({ worker: worker._id });
    if (list.length > 1) throw new AppError('Elige de cuál negocio o evento quieres salir', 400);
  }
  await Promise.all(list.map(endMembership));
  await Worker.updateOne({ _id: worker._id }, { $set: { business: null, businessJoinedAt: null, location: null } });
  res.json({ success: true });
});

// Everything the signed-in person belongs to, for their own panel and QR page.
async function membershipsOf(worker) {
  const list = await Membership.find({ worker: worker._id }).sort({ joinedAt: -1 });
  if (!list.length) return [];
  const [businesses, locations, qrs] = await Promise.all([
    Business.find({ _id: { $in: list.map((m) => m.business) } }),
    Location.find({ _id: { $in: list.map((m) => m.location) } }),
    Qr.find({ _id: { $in: list.map((m) => m.qr).filter(Boolean) } }),
  ]);
  const bMap = new Map(businesses.map((b) => [String(b._id), b]));
  const lMap = new Map(locations.map((l) => [String(l._id), l]));
  const qMap = new Map(qrs.map((q) => [String(q._id), q]));
  const out = [];
  for (const m of list) {
    const b = bMap.get(String(m.business));
    const l = lMap.get(String(m.location));
    // eslint-disable-next-line no-await-in-loop
    if (b && l) out.push(await membershipDTO(m, b, l, m.qr ? qMap.get(String(m.qr)) : null, worker));
  }
  return out;
}

async function migrateIfLegacy(worker) {
  if (worker.business && !(await Membership.exists({ worker: worker._id, business: worker.business }))) {
    const business = await Business.findById(worker.business);
    if (business) await ensureMemberships(business, await ensureLocations(business));
  }
}

const getMemberships = asyncHandler(async (req, res) => {
  const worker = req.user.worker ? await Worker.findById(req.user.worker) : null;
  if (!worker) return res.json({ success: true, memberships: [] });
  await migrateIfLegacy(worker);
  res.json({ success: true, memberships: await membershipsOf(worker) });
});

// Older screens read a single "business" here; the new ones read the whole list.
const getMembership = asyncHandler(async (req, res) => {
  const worker = req.user.worker ? await Worker.findById(req.user.worker) : null;
  if (!worker) return res.json({ success: true, business: null, memberships: [] });
  await migrateIfLegacy(worker);
  const memberships = await membershipsOf(worker);
  const first = memberships[0];
  res.json({
    success: true,
    business: first ? { name: first.business, location: first.location, joinedAt: first.joinedAt } : null,
    memberships,
  });
});

// Called when an account is erased: the teams are released, the business closes.
async function releaseBusinessOf(user) {
  if (!user.ownedBusiness) return;
  const memberships = await Membership.find({ business: user.ownedBusiness }).select('qr');
  await Qr.updateMany({ _id: { $in: memberships.map((m) => m.qr).filter(Boolean) } }, { $set: { archivedAt: new Date() } });
  await Membership.deleteMany({ business: user.ownedBusiness });
  await Worker.updateMany({ business: user.ownedBusiness }, { $set: { business: null, businessJoinedAt: null, location: null } });
  await Location.deleteMany({ business: user.ownedBusiness });
  await Business.deleteOne({ _id: user.ownedBusiness });
  await User.updateOne({ _id: user._id }, { $set: { ownedBusiness: null } });
}

// Called when a person erases their account: they leave everything.
async function releaseMembershipsOf(workerId) {
  await Qr.updateMany({ worker: workerId }, { $set: { archivedAt: new Date() } });
  await Membership.deleteMany({ worker: workerId });
}

module.exports = {
  updateBusiness,
  getLogo,
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
  getMemberships,
  releaseBusinessOf,
  releaseMembershipsOf,
};
