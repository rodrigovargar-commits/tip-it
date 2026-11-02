const request = require('supertest');
const sharp = require('sharp');
const crypto = require('crypto');

jest.mock('../../src/config/stripe', () => ({}));

const app = require('../../src/app');
const User = require('../../src/models/User');
const { backfillAvatarFlags } = require('../../src/utils/avatar');

// A big, noisy photo like the ones people upload (hundreds of KB as text).
async function bigPhoto() {
  const w = 1600;
  const h = 1200;
  const raw = crypto.randomBytes(w * h * 3);
  const jpeg = await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

let n = 0;
async function makeWorker(username, { photo = null } = {}) {
  n += 1;
  const reg = await request(app).post('/api/auth/register').send({
    name: `Persona ${n}`, email: `p${n}@example.com`, phone: `55511111${String(n).padStart(2, '0')}`, password: 'password123',
  });
  const auth = { Authorization: `Bearer ${reg.body.token}` };
  await request(app).post('/api/workers/register').set(auth).send({ username });
  if (photo) await request(app).put('/api/users/profile').set(auth).send({ avatarUrl: photo });
  const user = await User.findOne({ email: `p${n}@example.com` }).select('+avatarUrl');
  return { auth, user };
}

describe('profile photos are served apart from the data', () => {
  it('keeps the photo out of the public profile and gives a short address instead', async () => {
    const photo = await bigPhoto();
    expect(photo.length).toBeGreaterThan(300000);
    const { user } = await makeWorker('fotogenica', { photo });

    const res = await request(app).get('/api/workers/fotogenica');
    expect(res.status).toBe(200);
    expect(res.body.worker.avatarUrl).toBe(`/api/users/${user._id}/avatar?v=${user.avatarVersion}`);
    expect(JSON.stringify(res.body)).not.toContain('data:image/jpeg'); // the photo (the small QR image stays inline)
    expect(Buffer.byteLength(JSON.stringify(res.body))).toBeLessThan(20000); // was ~370 KB with the photo inside
  });

  it('serves the photo resized and cacheable, and answers 304 when it has not changed', async () => {
    const { user } = await makeWorker('cacheable', { photo: await bigPhoto() });
    const url = `/api/users/${user._id}/avatar?v=${user.avatarVersion}`;

    const res = await request(app).get(url).buffer(true).parse((r, cb) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin'); // the page is on another address
    const meta = await sharp(res.body).metadata();
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(720);
    expect(res.body.length).toBeLessThan(user.avatarUrl.length / 3);

    const again = await request(app).get(url).set('If-None-Match', res.headers.etag);
    expect(again.status).toBe(304);
  });

  it('does not cache an old address for a year', async () => {
    const { user } = await makeWorker('versionada', { photo: await bigPhoto() });
    const res = await request(app).get(`/api/users/${user._id}/avatar?v=1`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });

  it('only shows photos of people with a public profile, and nothing for bad requests', async () => {
    const photo = await bigPhoto();
    const plain = await request(app).post('/api/auth/register').send({
      name: 'Solo Cliente', email: 'cliente@example.com', phone: '5550001111', password: 'password123',
    });
    await request(app).put('/api/users/profile').set('Authorization', `Bearer ${plain.body.token}`).send({ avatarUrl: photo });
    const client = await User.findOne({ email: 'cliente@example.com' });
    expect((await request(app).get(`/api/users/${client._id}/avatar`)).status).toBe(404);

    const { user } = await makeWorker('sinfoto');
    expect((await request(app).get(`/api/users/${user._id}/avatar`)).status).toBe(404);
    expect((await request(app).get('/api/users/no-es-un-id/avatar')).status).toBe(404);
  });

  it('gives the signed-in worker the same short address and keeps /users/me small', async () => {
    const { auth, user } = await makeWorker('yo_mismo', { photo: await bigPhoto() });
    const me = await request(app).get('/api/users/me').set(auth);
    expect(me.body.user.avatarUrl).toBe(`/api/users/${user._id}/avatar?v=${user.avatarVersion}`);
    expect(me.body.worker.avatarUrl).toBe(me.body.user.avatarUrl);
    expect(JSON.stringify(me.body)).not.toContain('data:image/jpeg');
  });

  it('marks photos that were saved before the flags existed', async () => {
    const { user } = await makeWorker('antigua');
    await User.collection.updateOne({ _id: user._id }, { $set: { avatarUrl: await bigPhoto() }, $unset: { hasAvatar: '', avatarVersion: '' } });
    await backfillAvatarFlags(User);
    const after = await User.findById(user._id);
    expect(after.hasAvatar).toBe(true);
    expect(after.avatarVersion).toBeGreaterThan(0);
    const res = await request(app).get('/api/workers/antigua');
    expect(res.body.worker.avatarUrl).toMatch(/^\/api\/users\/.+\/avatar\?v=\d+$/);
  });

  it('removes the flag when the account is erased', async () => {
    const { auth, user } = await makeWorker('borrable', { photo: await bigPhoto() });
    await request(app).delete('/api/users/me').set(auth);
    const after = await User.findById(user._id);
    expect(after.hasAvatar).toBe(false);
  });
});
