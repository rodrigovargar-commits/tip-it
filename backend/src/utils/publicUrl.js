// The single public address that QR codes and shared links point to.
//
// CLIENT_URL is a comma-separated allow-list for CORS (the Vercel URL, the
// custom domain with and without www, ...). It must NEVER be pasted whole
// into a QR code: a camera app would read "https://a.app,https://b.com/tip/x"
// and fail to open it. PUBLIC_URL wins when set; otherwise pick the real
// production address out of the list.
const PRODUCTION_URL = 'https://www.tipit.com.mx';

function publicBaseUrl() {
  const clean = (u) => String(u).trim().replace(/\/+$/, '');

  if (process.env.PUBLIC_URL) return clean(process.env.PUBLIC_URL);

  const list = (process.env.CLIENT_URL || '')
    .split(',')
    .map(clean)
    .filter(Boolean);

  const pick =
    list.find((u) => u === PRODUCTION_URL) ||
    list.find((u) => /^https:\/\/([a-z0-9-]+\.)*tipit\.com\.mx$/i.test(u)) ||
    list.find((u) => u.startsWith('https://')) ||
    list[0];

  if (pick) return pick;
  return process.env.NODE_ENV === 'production' ? PRODUCTION_URL : 'http://localhost:5173';
}

function workerTipUrl(username) {
  return `${publicBaseUrl()}/tip/${encodeURIComponent(String(username).toLowerCase())}`;
}

module.exports = { publicBaseUrl, workerTipUrl, PRODUCTION_URL };
