const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const { logSecurityEvent } = require('../utils/logger');
const { availableChannels } = require('../utils/otp/providers');
const { sendCode, checkCode, signVerificationToken, accountFor } = require('../utils/otp/service');
const { maskDestination } = require('../utils/otp/normalize');

const otpRequired = () => process.env.OTP_REQUIRED === 'true';

// Tells the app which ways of getting a code this server can really offer, so
// it only shows the new sign-up flow when it will work.
const getConfig = asyncHandler(async (req, res) => {
  const channels = availableChannels();
  res.json({ success: true, enabled: channels.length > 0, required: otpRequired(), channels });
});

const send = asyncHandler(async (req, res) => {
  const { channel, destination, purpose } = req.body;
  const result = await sendCode({ channel, destination, purpose });

  logSecurityEvent({
    event: 'auth.otp_sent',
    outcome: 'success',
    sourceIp: req.ip,
    target: `channel:${channel}`,
    reason: purpose,
  });

  res.json({
    success: true,
    sentTo: maskDestination(channel, result.destination),
    expiresInSec: result.expiresInSec,
    resendInSec: result.resendInSec,
  });
});

const verify = asyncHandler(async (req, res) => {
  const { channel, destination, purpose, code } = req.body;

  let checked;
  try {
    checked = await checkCode({ channel, destination, purpose, code });
  } catch (err) {
    logSecurityEvent({
      event: 'auth.otp_check',
      outcome: 'failure',
      sourceIp: req.ip,
      target: `channel:${channel}`,
      reason: purpose,
    });
    throw err;
  }

  if (purpose === 'login') {
    const user = await accountFor(channel, checked.destination);
    if (!user) throw new AppError('Código incorrecto o vencido', 400);
    logSecurityEvent({
      event: 'auth.login',
      outcome: 'success',
      actorId: user._id,
      sourceIp: req.ip,
      reason: 'otp',
    });
    return res.json({ success: true, token: generateToken(user._id), user: user.toPublicJSON() });
  }

  logSecurityEvent({
    event: 'auth.otp_check',
    outcome: 'success',
    sourceIp: req.ip,
    target: `channel:${channel}`,
    reason: purpose,
  });
  res.json({
    success: true,
    verificationToken: signVerificationToken({ channel, destination: checked.destination, purpose }),
  });
});

module.exports = { getConfig, send, verify, otpRequired };
