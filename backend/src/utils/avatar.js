const crypto = require('crypto');

// Profile photos are stored as a data URL inside the user (up to ~360 KB of text).
// Sending that inside every profile / contact / team answer made each QR scan
// heavy. Now the answers only carry a short address for the photo, and the photo
// itself is served here: resized once, kept in memory, and cached by the browser.
const MAX_WIDTH = 720;
const CACHE_LIMIT = 100;
const cache = new Map(); // key -> Buffer (insertion order = oldest first)

// The address other answers carry. Only people with a public profile (a tip QR)
// have a public photo; for everyone else the field is simply absent.
function avatarPath(user) {
  if (!user || !user.hasAvatar || !user.isWorker) return null;
  return `/api/users/${user._id}/avatar?v=${user.avatarVersion || 0}`;
}

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  return m ? { type: m[1], buffer: Buffer.from(m[2], 'base64') } : null;
}

// Returns { buffer, type } or null. If the image library cannot load on some server, the original
// photo is served as it was saved (slower, but never a broken page or a server that will not start).
async function avatarBuffer(user) {
  const key = `${user._id}:${user.avatarVersion || 0}`;
  if (cache.has(key)) {
    const hit = cache.get(key);
    cache.delete(key);
    cache.set(key, hit); // most recently used goes last
    return hit;
  }
  const raw = parseDataUrl(user.avatarUrl);
  if (!raw) return null;

  let out;
  try {
    const sharp = require('sharp'); // eslint-disable-line global-require
    const buffer = await sharp(raw.buffer, { failOn: 'none' })
      .rotate() // respect the phone's orientation
      .resize({ width: MAX_WIDTH, height: MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    out = { buffer, type: 'image/jpeg' };
  } catch {
    out = raw;
  }
  cache.set(key, out);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return out;
}

const etagOf = (buf) => `"${crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 20)}"`;

// Photos saved before the flags existed: mark them once so answers can skip the image itself.
function backfillAvatarFlags(UserModel) {
  return UserModel.collection.updateMany(
    { avatarUrl: { $nin: [null, ''] }, hasAvatar: { $ne: true } },
    [{ $set: { hasAvatar: true, avatarVersion: { $toLong: '$$NOW' } } }]
  );
}

module.exports = { avatarPath, avatarBuffer, etagOf, parseDataUrl, backfillAvatarFlags };
