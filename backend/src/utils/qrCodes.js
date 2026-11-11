const crypto = require('crypto');
const QRCode = require('qrcode');
const { workerProfileUrl } = require('./publicUrl');

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function newQrCode() {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const cleanQrCode = (v) => (typeof v === 'string' && /^[a-z0-9]{8}$/i.test(v) ? v.toLowerCase() : null);

// The address an extra QR encodes: the same public profile, plus its own code.
function qrUrl(username, code) {
  return code ? `${workerProfileUrl(username)}?q=${code}` : workerProfileUrl(username);
}

function qrImage(username, code) {
  return QRCode.toDataURL(qrUrl(username, code), { errorCorrectionLevel: 'M', margin: 2, width: 400 });
}

module.exports = { newQrCode, cleanQrCode, qrUrl, qrImage };
