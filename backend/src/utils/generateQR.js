const QRCode = require('qrcode');
const { workerTipUrl } = require('./publicUrl');

/**
 * Generates a QR code (base64 PNG data URL) that encodes the public
 * tipping URL for a worker's profile — a plain, single https address that
 * any phone camera can open without our app.
 */
async function generateWorkerQR(username) {
  return QRCode.toDataURL(workerTipUrl(username), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
  });
}

module.exports = { generateWorkerQR };
