// Thin wrapper around gtag — safe to call even if the script hasn't loaded
// yet or is blocked (ad blockers, etc.), so callers never need to guard it.
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
