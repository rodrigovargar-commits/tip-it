// index.html starts asking the API for a person the moment a QR link opens.
// Whichever page needs that answer first takes it (once), so it isn't fetched twice.
export function takeWorkerPrefetch(username) {
  const pre = typeof window !== 'undefined' ? window.__tipPrefetch : null;
  if (pre && pre.username === String(username).toLowerCase()) {
    window.__tipPrefetch = null;
    return pre.p;
  }
  return null;
}
