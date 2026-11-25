const { parseDataUrl } = require('./avatar');

// A business picture is saved as a data URL inside the business (the app already shrinks it before
// sending). Answers only carry a short address for it; the picture is served from one public route,
// resized once, kept in memory and cached by the browser, exactly like profile photos.
const MAX_WIDTH = 480;
const MAX_CHARS = 450000; // ~330 KB of image
const CACHE_LIMIT = 100;
const cache = new Map();

function logoPath(business) {
  if (!business || !business.hasLogo) return null;
  return `/api/business/${business._id}/logo?v=${business.logoVersion || 0}`;
}

// Returns the cleaned data URL, or null when empty. Throws a plain Error with a message people can read.
function readLogo(dataUrl) {
  if (dataUrl === undefined || dataUrl === null || dataUrl === '') return null;
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_CHARS || !parseDataUrl(dataUrl)) {
    throw new Error('La imagen debe ser PNG, JPG o WebP y pesar menos de 300 KB');
  }
  return dataUrl;
}

async function logoBuffer(business) {
  const key = `${business._id}:${business.logoVersion || 0}`;
  if (cache.has(key)) {
    const hit = cache.get(key);
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const raw = parseDataUrl(business.logo);
  if (!raw) return null;
  let out;
  try {
    const sharp = require('sharp'); // eslint-disable-line global-require
    const buffer = await sharp(raw.buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: MAX_WIDTH, height: MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    out = { buffer, type: 'image/jpeg' };
  } catch {
    out = raw;
  }
  cache.set(key, out);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return out;
}

module.exports = { logoPath, readLogo, logoBuffer };
