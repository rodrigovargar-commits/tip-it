// A person's public profile (the page behind a QR) is read far more often than it changes, and
// one busy QR can be scanned by many people at once. Keeping the answer for a few seconds spares
// the database and keeps the page fast during a rush. Editing the profile clears it right away.
const TTL_MS = 10 * 1000;
const MAX_ENTRIES = 500;
const store = new Map();
const enabled = () => process.env.NODE_ENV !== 'test';

function get(username) {
  if (!enabled()) return null;
  const hit = store.get(username);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(username);
    return null;
  }
  return hit.body;
}

function set(username, body) {
  if (!enabled()) return;
  if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
  store.set(username, { at: Date.now(), body });
}

function clear(username) {
  store.delete(String(username || '').toLowerCase());
}

module.exports = { get, set, clear };
