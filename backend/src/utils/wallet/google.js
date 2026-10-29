const jwt = require('jsonwebtoken');
const { env } = require('./config');
const { publicBaseUrl, workerProfileUrl } = require('../publicUrl');

// "Save to Google Wallet" link: a signed token that already carries the pass,
// so nothing has to be created ahead of time in Google's servers.
function buildGoogleSaveUrl({ worker, name }) {
  const issuer = env('GOOGLE_WALLET_ISSUER_ID');
  const classId = `${issuer}.tipit_qr`;
  const text = (value) => ({ defaultValue: { language: 'es-MX', value } });

  const claims = {
    iss: env('GOOGLE_WALLET_CLIENT_EMAIL'),
    aud: 'google',
    typ: 'savetowallet',
    origins: [publicBaseUrl()],
    payload: {
      genericClasses: [{ id: classId }],
      genericObjects: [
        {
          id: `${issuer}.worker_${worker._id}`,
          classId,
          state: 'ACTIVE',
          cardTitle: text('TIP-IT'),
          header: text(name),
          subheader: text('Escanea para dejar propina'),
          hexBackgroundColor: '#FFF8EC',
          logo: { sourceUri: { uri: `${publicBaseUrl()}/icons/icon-192.png` } },
          barcode: { type: 'QR_CODE', value: workerProfileUrl(worker.username), alternateText: `@${worker.username}` },
        },
      ],
    },
  };

  const key = env('GOOGLE_WALLET_PRIVATE_KEY').replace(/\\n/g, '\n');
  const token = jwt.sign(claims, key, { algorithm: 'RS256' });
  return `https://pay.google.com/gp/v/save/${token}`;
}

module.exports = { buildGoogleSaveUrl };
