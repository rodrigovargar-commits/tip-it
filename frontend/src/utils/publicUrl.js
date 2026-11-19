// The one address people should share and print. Opened from the apex domain or a Vercel
// preview address, shared links would otherwise carry that other address; the QR image
// itself always comes from the server with the official one.
const OFFICIAL = 'https://www.tipit.com.mx';

export function publicOrigin() {
  try {
    const h = window.location.hostname;
    if (h === 'tipit.com.mx' || h.endsWith('.vercel.app')) return OFFICIAL;
    return window.location.origin;
  } catch {
    return OFFICIAL;
  }
}

export const profileLink = (username) => `${publicOrigin()}/p/${username}`;
