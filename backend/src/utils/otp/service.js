const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AppError = require('../AppError');
const OtpChallenge = require('../../models/OtpChallenge');
const User = require('../../models/User');
const { normalizeDestination } = require('./normalize');
const { deliver, checkWithProvider, providerFor } = require('./providers');

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const VERIFICATION_TTL = '20m';

const secret = () => `${process.env.JWT_SECRET}:otp`;

function hashCode(code, destination) {
  return crypto.createHmac('sha256', secret()).update(`${destination}:${code}`).digest('hex');
}

function newCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// Does this destination already belong to an account? Only used for the login
// purpose, to decide whether to actually send — the answer is never revealed.
async function accountFor(channel, destination) {
  if (channel === 'email') return User.findOne({ email: destination, active: true });
  return User.findOne({ phone: destination, phoneVerified: true, active: true });
}

async function sendCode({ channel, destination: rawDestination, purpose }) {
  if (!providerFor(channel)) {
    throw new AppError('El envío de códigos por ese medio no está disponible por ahora.', 503);
  }
  const destination = normalizeDestination(channel, rawDestination);
  if (!destination) {
    throw new AppError(channel === 'email' ? 'Correo inválido' : 'Número de teléfono inválido', 400);
  }

  const now = Date.now();
  const existing = await OtpChallenge.findOne({ channel, destination, purpose });

  if (existing && now - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt.getTime())) / 1000);
    throw new AppError(`Espera ${wait} segundos para pedir otro código.`, 429);
  }

  let windowStart = existing ? existing.sendWindowStart.getTime() : now;
  let sendCount = existing ? existing.sendCount : 0;
  if (now - windowStart > 60 * 60 * 1000) {
    windowStart = now;
    sendCount = 0;
  }
  if (sendCount >= MAX_SENDS_PER_HOUR) {
    throw new AppError('Pediste demasiados códigos. Intenta de nuevo en una hora.', 429);
  }

  // For logging in, nothing is sent to an address that has no account, but the
  // caller gets the exact same answer — so this can't be used to find out who
  // is registered.
  let delivered = { ok: true, ownsCode: true };
  let codeHash = null;
  if (purpose === 'register' || (await accountFor(channel, destination))) {
    const code = newCode();
    delivered = await deliver({ channel, destination, code });
    if (!delivered.ok) {
      throw new AppError('No pudimos enviar el código. Revisa el dato e intenta de nuevo.', 502);
    }
    codeHash = delivered.ownsCode ? hashCode(code, destination) : null;
  }

  await OtpChallenge.findOneAndUpdate(
    { channel, destination, purpose },
    {
      codeHash,
      provider: delivered.provider === 'twilio' ? 'twilio' : 'own',
      attempts: 0,
      lastSentAt: new Date(now),
      sendCount: sendCount + 1,
      sendWindowStart: new Date(windowStart),
      expiresAt: new Date(now + CODE_TTL_MS),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { destination, expiresInSec: CODE_TTL_MS / 1000, resendInSec: RESEND_COOLDOWN_MS / 1000 };
}

const INVALID = () => new AppError('Código incorrecto o vencido', 400);

async function checkCode({ channel, destination: rawDestination, purpose, code }) {
  const destination = normalizeDestination(channel, rawDestination);
  if (!destination || !/^\d{6}$/.test(String(code || ''))) throw INVALID();

  const challenge = await OtpChallenge.findOne({ channel, destination, purpose });
  if (!challenge || challenge.expiresAt.getTime() < Date.now() || challenge.attempts >= MAX_ATTEMPTS) {
    throw INVALID();
  }

  let ok;
  if (challenge.codeHash) {
    const a = Buffer.from(challenge.codeHash, 'hex');
    const b = Buffer.from(hashCode(code, destination), 'hex');
    ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  } else {
    ok = challenge.provider === 'twilio' ? await checkWithProvider({ destination, code: String(code) }) : false;
  }

  if (!ok) {
    challenge.attempts += 1;
    await challenge.save();
    throw INVALID();
  }

  await OtpChallenge.deleteOne({ _id: challenge._id }); // single use
  return { channel, destination };
}

function signVerificationToken({ channel, destination, purpose }) {
  return jwt.sign({ typ: 'otp', ch: channel, dest: destination, purpose }, secret(), {
    algorithm: 'HS256',
    expiresIn: VERIFICATION_TTL,
  });
}

// Returns { channel, destination } for a valid token for this purpose, else null.
function readVerificationToken(token, purpose = 'register') {
  try {
    const d = jwt.verify(token, secret(), { algorithms: ['HS256'] });
    if (d.typ !== 'otp' || d.purpose !== purpose) return null;
    return { channel: d.ch, destination: d.dest };
  } catch {
    return null;
  }
}

module.exports = { sendCode, checkCode, signVerificationToken, readVerificationToken, accountFor };
