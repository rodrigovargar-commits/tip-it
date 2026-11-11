const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logSecurityEvent } = require('../utils/logger');
const Worker = require('../models/Worker');
const Qr = require('../models/Qr');
const Membership = require('../models/Membership');
const Business = require('../models/Business');
const Location = require('../models/Location');
const Transaction = require('../models/Transaction');
const Recognition = require('../models/Recognition');
const { newQrCode, qrUrl, qrImage } = require('../utils/qrCodes');
const { workerProfileUrl } = require('../utils/publicUrl');

const MAX_PERSONAL_QRS = 10;

// Does this code belong to one of the person's own QRs? Used when a tip or a comment arrives,
// so a made-up or someone else's code is simply ignored.
async function resolveQrCode(worker, raw) {
  if (typeof raw !== 'string' || !/^[a-z0-9]{8}$/i.test(raw)) return null;
  const code = raw.toLowerCase();
  return (await Qr.exists({ worker: worker._id, code })) ? code : null;
}

async function myWorker(req) {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Primero crea tu cuenta para recibir propinas', 403);
  return worker;
}

// All of the person's QRs with how each one is doing (their own numbers, money included, are theirs to see).
// They all lead to the same public profile and the same payment account.
const listQrs = asyncHandler(async (req, res) => {
  const worker = await myWorker(req);
  const qrs = await Qr.find({ worker: worker._id, archivedAt: null }).sort({ createdAt: 1 });

  const [tipCounts, commentCounts, memberships] = await Promise.all([
    Transaction.aggregate([
      { $match: { worker: worker._id, status: 'succeeded' } },
      { $group: { _id: '$qr', tips: { $sum: 1 }, cents: { $sum: '$netAmount' } } },
    ]),
    Recognition.aggregate([
      { $match: { worker: worker._id, status: 'published' } },
      { $group: { _id: '$qr', comments: { $sum: 1 } } },
    ]),
    Membership.find({ worker: worker._id, qr: { $in: qrs.map((q) => q._id) } }).select('qr business location scope'),
  ]);
  const tips = new Map(tipCounts.map((t) => [t._id || '', t]));
  const comments = new Map(commentCounts.map((c) => [c._id || '', c.comments]));
  const [businesses, locations] = await Promise.all([
    Business.find({ _id: { $in: memberships.map((m) => m.business) } }).select('name'),
    Location.find({ _id: { $in: memberships.map((m) => m.location) } }).select('name kind startsAt endsAt'),
  ]);
  const bName = new Map(businesses.map((b) => [String(b._id), b.name]));
  const lById = new Map(locations.map((l) => [String(l._id), l]));
  const memByQr = new Map(memberships.map((m) => [String(m.qr), m]));

  const shape = async (code, base) => ({
    ...base,
    code,
    url: qrUrl(worker.username, code),
    image: await qrImage(worker.username, code),
    tips: (tips.get(code || '') || {}).tips || 0,
    netCents: (tips.get(code || '') || {}).cents || 0,
    comments: comments.get(code || '') || 0,
  });

  const out = [await shape(null, { id: 'main', name: 'QR personal', kind: 'main' })];
  for (const q of qrs) {
    const m = memByQr.get(String(q._id));
    const loc = m ? lById.get(String(m.location)) : null;
    // eslint-disable-next-line no-await-in-loop
    out.push(await shape(q.code, {
      id: q._id,
      name: q.name,
      kind: q.kind,
      business: m ? bName.get(String(m.business)) || null : null,
      eventEndsAt: loc && loc.kind === 'event' ? loc.endsAt : null,
      scope: m ? m.scope : null,
    }));
  }
  res.json({ success: true, profileUrl: workerProfileUrl(worker.username), qrs: out });
});

const createQr = asyncHandler(async (req, res) => {
  const worker = await myWorker(req);
  const active = await Qr.countDocuments({ worker: worker._id, archivedAt: null, kind: 'personal' });
  if (active >= MAX_PERSONAL_QRS) throw new AppError(`Puedes tener hasta ${MAX_PERSONAL_QRS} QR propios`, 409);

  let qr;
  for (let i = 0; i < 6 && !qr; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      qr = await Qr.create({ worker: worker._id, name: req.body.name.trim(), code: newQrCode(), kind: 'personal' });
    } catch (err) {
      if (!err || err.code !== 11000) throw err;
    }
  }
  if (!qr) throw new AppError('No pudimos crear el QR. Intenta de nuevo.', 500);

  logSecurityEvent({ event: 'qr.created', outcome: 'success', actorId: req.user._id, sourceIp: req.ip, target: `qr:${qr._id}` });
  res.status(201).json({
    success: true,
    qr: { id: qr._id, name: qr.name, kind: qr.kind, code: qr.code, url: qrUrl(worker.username, qr.code), image: await qrImage(worker.username, qr.code), tips: 0, netCents: 0, comments: 0 },
  });
});

async function ownQrOr404(worker, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('QR no encontrado', 404);
  const qr = await Qr.findOne({ _id: id, worker: worker._id, archivedAt: null });
  if (!qr) throw new AppError('QR no encontrado', 404);
  return qr;
}

const renameQr = asyncHandler(async (req, res) => {
  const worker = await myWorker(req);
  const qr = await ownQrOr404(worker, req.params.id);
  if (qr.kind === 'business') throw new AppError('El nombre de un QR de empresa lo pone la empresa', 409);
  qr.name = req.body.name.trim();
  await qr.save();
  res.json({ success: true, qr: { id: qr._id, name: qr.name } });
});

// A personal QR is archived, not erased: the printed copy keeps opening the profile, and the
// tips that came through it keep their history. A company QR goes away by leaving the company.
const archiveQr = asyncHandler(async (req, res) => {
  const worker = await myWorker(req);
  const qr = await ownQrOr404(worker, req.params.id);
  if (qr.kind === 'business') throw new AppError('Este QR es de una empresa o evento. Para quitarlo, sal de ese negocio.', 409);
  qr.archivedAt = new Date();
  await qr.save();
  res.json({ success: true });
});

module.exports = { listQrs, createQr, renameQr, archiveQr, resolveQrCode };
