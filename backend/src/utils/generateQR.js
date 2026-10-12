const QRCode = require('qrcode');
const { workerProfileUrl } = require('./publicUrl');

/**
 * Generates a QR code (base64 PNG data URL) that encodes the person's public
 * PROFILE address (photo, ratings, and the two buttons: leave a tip or leave
 * a comment) — a plain, single https address that any phone camera can open
 * without our app. Older QR codes pointed straight at the payment page; those
 * links still work, because the app now sends them to the profile first.
 */
async function generateWorkerQR(username) {
  return QRCode.toDataURL(workerProfileUrl(username), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
  });
}

module.exports = { generateWorkerQR };
