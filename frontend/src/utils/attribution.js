import api from '../services/api.js';

// Remembers which ad/link brought the visitor (first one wins) and tells our own
// server once per session. No cookie and nothing personal: just a short tag like
// "ig_anuncio1". It is sent along when they sign up so we can tell which ads work.
const KEY = 'tipit_src';

function slug(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\-./]/g, '')
    .slice(0, 50);
}

function fromUrl() {
  const p = new URLSearchParams(window.location.search);
  const src = slug(p.get('src'));
  if (src) return src;
  const utm = slug(p.get('utm_source'));
  if (utm) {
    const camp = slug(p.get('utm_campaign'));
    return camp ? `${utm}/${camp}` : utm;
  }
  try {
    const host = new URL(document.referrer).hostname.replace(/^(www|l|m)\./, '');
    if (host && host !== window.location.hostname) return slug(host.split('.')[0]);
  } catch {
    // no referrer
  }
  return '';
}

export function getSource() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function captureSource() {
  try {
    const found = fromUrl();
    if (found && !getSource()) localStorage.setItem(KEY, found);
    // A tag in the link always counts for this visit, even if an older one is saved.
    const tag = (new URLSearchParams(window.location.search).get('src') && found) || getSource() || found;
    if (sessionStorage.getItem('tipit_visit_sent')) return;
    sessionStorage.setItem('tipit_visit_sent', '1');
    api.post('/track/visit', { source: tag || 'directo', path: window.location.pathname }).catch(() => {});
  } catch {
    // storage blocked: the site works the same, the visit is just not counted
  }
}
