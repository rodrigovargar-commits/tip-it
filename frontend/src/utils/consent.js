// Cookie consent + Google Analytics 4 loader.
// GA4 is only injected AFTER the visitor accepts; "Solo necesarias" keeps it
// off. The choice lives in localStorage (it is a preference, not a tracker).
const KEY = 'tipit_cookie_consent'; // 'granted' | 'denied'
const GA_ID = 'G-3WX1CMDGKW';

export function getConsent() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // private mode: the banner will simply ask again next visit
  }
  if (value === 'granted') loadAnalytics();
}

let loaded = false;
export function loadAnalytics() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
  };
  window.gtag('js', new Date());
  // Page views are sent by hand on every route change (single-page app).
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

export function analyticsAllowed() {
  return getConsent() === 'granted';
}
