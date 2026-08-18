const QRCode = require('qrcode');

/**
 * Generates a QR code (base64 PNG data URL) that encodes the public
 * tipping URL for a worker's profile.
 */
async function generateWorkerQR(username) {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const targetUrl = `${baseUrl}/tip/${username}`;
  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
  });
}

module.exports = { generateWorkerQR };
