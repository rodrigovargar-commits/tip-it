const Worker = require('../models/Worker');
const { generateWorkerQR } = require('./generateQR');
const { workerTipUrl } = require('./publicUrl');
const { logger } = require('./logger');

// Makes sure every stored QR encodes the CURRENT public address. A QR saved
// back when CLIENT_URL held a list (or an old domain) is rebuilt; QRs that are
// already right are left alone. Safe to run on every boot or on demand.
async function ensureWorkerQRs({ force = false } = {}) {
  let checked = 0;
  let regenerated = 0;
  const cursor = Worker.find({}).select('username qrCode qrUrl').cursor();
  // eslint-disable-next-line no-restricted-syntax
  for await (const worker of cursor) {
    checked += 1;
    const expected = workerTipUrl(worker.username);
    if (!force && worker.qrUrl === expected && worker.qrCode) continue;
    worker.qrCode = await generateWorkerQR(worker.username);
    worker.qrUrl = expected;
    await worker.save();
    regenerated += 1;
  }
  logger.info({ checked, regenerated }, 'worker QR codes checked');
  return { checked, regenerated };
}

module.exports = ensureWorkerQRs;
