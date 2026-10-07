const mongoose = require('mongoose');
const Worker = require('../../src/models/Worker');
const ensureWorkerQRs = require('../../src/utils/ensureWorkerQRs');
const { workerTipUrl } = require('../../src/utils/publicUrl');

describe('ensureWorkerQRs', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('rebuilds a stale QR and leaves a correct one alone', async () => {
    process.env.CLIENT_URL = 'https://a.app,https://www.tipit.com.mx';
    delete process.env.PUBLIC_URL;
    const stale = await Worker.create({ user: new mongoose.Types.ObjectId(), username: 'vieja', qrCode: 'data:old', qrUrl: 'https://a.app,https://www.tipit.com.mx/tip/vieja' });
    const good = await Worker.create({ user: new mongoose.Types.ObjectId(), username: 'buena', qrCode: 'data:keep', qrUrl: workerTipUrl('buena') });

    const result = await ensureWorkerQRs();
    expect(result).toEqual({ checked: 2, regenerated: 1 });

    const s = await Worker.findById(stale._id);
    expect(s.qrUrl).toBe('https://www.tipit.com.mx/tip/vieja');
    expect(s.qrCode).toMatch(/^data:image\/png;base64,/);
    expect((await Worker.findById(good._id)).qrCode).toBe('data:keep');

    // second pass: nothing left to do
    expect((await ensureWorkerQRs()).regenerated).toBe(0);
  });
});
