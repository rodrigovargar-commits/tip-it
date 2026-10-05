import { analyticsAllowed } from './consent.js';

// Thin wrapper around gtag — safe to call at any time: it does nothing until
// the visitor has accepted cookies and the script has loaded (or if an ad
// blocker removed it), so callers never need to guard it.
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || !analyticsAllowed() || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

export function trackPageView(path) {
  trackEvent('page_view', {
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : path,
    page_title: typeof document !== 'undefined' ? document.title : '',
  });
}
