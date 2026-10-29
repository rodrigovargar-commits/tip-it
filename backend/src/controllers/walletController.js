const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Worker = require('../models/Worker');
const User = require('../models/User');
const { isAppleConfigured, isGoogleConfigured } = require('../utils/wallet/config');
const { signWalletToken, readWalletToken } = require('../utils/wallet/token');
const { buildGoogleSaveUrl } = require('../utils/wallet/google');
const { buildApplePass } = require('../utils/wallet/apple');
const { logSecurityEvent } = require('../utils/logger');

const getConfig = (req, res) => {
  res.json({ success: true, apple: isAppleConfigured(), google: isGoogleConfigured() });
};

async function myWorker(req) {
  const worker = await Worker.findById(req.user.worker).populate('user', 'name');
  if (!worker) throw new AppError('Primero crea tu cuenta para recibir propinas', 403);
  return worker;
}
const displayName = (worker) => worker.publicName || worker.user?.name || worker.username;

const googleLink = asyncHandler(async (req, res) => {
  if (!isGoogleConfigured()) throw new AppError('Google Wallet todavía no está disponible', 503);
  const worker = await myWorker(req);
  res.json({ success: true, url: buildGoogleSaveUrl({ worker, name: displayName(worker) }) });
});

// Step 1 for Apple: a short-lived link the phone can open directly.
const appleLink = asyncHandler(async (req, res) => {
  if (!isAppleConfigured()) throw new AppError('Apple Wallet todavía no está disponible', 503);
  const worker = await myWorker(req);
  const base = `${req.protocol}://${req.get('host')}`;
  res.json({ success: true, url: `${base}/api/wallet/apple/pass/${signWalletToken(worker._id)}.pkpass` });
});

// Step 2: the signed .pkpass itself (the token in the address is the credential).
const applePass = asyncHandler(async (req, res) => {
  if (!isAppleConfigured()) throw new AppError('Apple Wallet todavía no está disponible', 503);
  const workerId = readWalletToken(req.params.token);
  if (!workerId) throw new AppError('El enlace venció. Pide uno nuevo desde tu QR.', 410);
  const worker = await Worker.findById(workerId).populate('user', 'name');
  if (!worker) throw new AppError('Persona no encontrada', 404);
  const buffer = await buildApplePass({ worker, name: displayName(worker) });
  logSecurityEvent({ event: 'wallet.apple_pass', outcome: 'success', sourceIp: req.ip, target: `worker:${worker._id}` });
  res.set('Content-Type', 'application/vnd.apple.pkpass');
  res.set('Content-Disposition', 'attachment; filename="tip-it-qr.pkpass"');
  res.send(buffer);
});

module.exports = { getConfig, googleLink, appleLink, applePass };
