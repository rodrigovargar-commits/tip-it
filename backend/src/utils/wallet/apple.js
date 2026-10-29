const fs = require('fs');
const path = require('path');
const { env } = require('./config');
const { workerProfileUrl } = require('../publicUrl');

const ASSETS = path.join(__dirname, '../../../assets/wallet');
const FILES = ['icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png', 'logo@3x.png'];
const fromBase64 = (k) => Buffer.from(env(k), 'base64');

// A .pkpass file: a generic pass whose barcode is the person's QR. It has to be
// signed with the owner's Apple certificate, so it only works once configured.
async function buildApplePass({ worker, name }) {
  const { PKPass } = require('passkit-generator'); // loaded only when needed
  const files = {};
  FILES.forEach((f) => {
    files[f] = fs.readFileSync(path.join(ASSETS, f));
  });

  const pass = new PKPass(
    files,
    {
      wwdr: fromBase64('APPLE_WALLET_WWDR_PEM_BASE64'),
      signerCert: fromBase64('APPLE_WALLET_CERT_PEM_BASE64'),
      signerKey: fromBase64('APPLE_WALLET_KEY_PEM_BASE64'),
      signerKeyPassphrase: env('APPLE_WALLET_KEY_PASSPHRASE') || undefined,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: env('APPLE_WALLET_PASS_TYPE_ID'),
      teamIdentifier: env('APPLE_WALLET_TEAM_ID'),
      organizationName: 'TIP-IT',
      description: 'QR para recibir propinas',
      serialNumber: String(worker._id),
      logoText: 'TIP-IT',
      backgroundColor: 'rgb(255, 248, 236)',
      foregroundColor: 'rgb(10, 47, 47)',
      labelColor: 'rgb(255, 130, 67)',
    }
  );
  pass.type = 'generic';
  pass.setBarcodes({
    message: workerProfileUrl(worker.username),
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: `@${worker.username}`,
  });
  pass.primaryFields.push({ key: 'name', label: 'PROPINAS PARA', value: name });
  pass.secondaryFields.push({ key: 'user', label: 'USUARIO', value: `@${worker.username}` });
  pass.backFields.push({
    key: 'how',
    label: 'Cómo funciona',
    value: 'Quien te quiera dar propina o dejarte un comentario escanea este QR desde su celular.',
  });
  return pass.getAsBuffer();
}

module.exports = { buildApplePass };
