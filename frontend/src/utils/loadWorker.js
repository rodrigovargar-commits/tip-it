import api from '../services/api.js';
import { takeWorkerPrefetch } from './prefetch.js';

// Loads the public profile behind a QR. The API server can be asleep (the first request
// then takes ~20 s), so this never gives up on the first slow answer: it uses the request
// index.html already started, and if that did not produce a person it retries a few times.
// Only a real 404 ("that person does not exist") is reported as not-found.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function loadWorker(username, { isAlive = () => true } = {}) {
  const pre = takeWorkerPrefetch(username);
  if (pre) {
    try {
      const r = await pre;
      if (r.ok && r.data?.worker) return r.data.worker;
      if (r.status === 404) {
        const e = new Error('not-found');
        e.notFound = true;
        throw e;
      }
    } catch (err) {
      if (err.notFound) throw err;
      // network error or server still waking up: use the normal request below
    }
  }
  const delays = [0, 1500, 3000, 5000];
  let lastErr;
  for (const d of delays) {
    if (d) await wait(d);
    if (!isAlive()) return null;
    try {
      const { data } = await api.get(`/workers/${encodeURIComponent(username)}`, { timeout: 30000 });
      return data.worker;
    } catch (err) {
      lastErr = err;
      if (err.response?.status === 404) {
        const e = new Error('not-found');
        e.notFound = true;
        throw e;
      }
      // 4xx other than 404/429 will not get better by retrying
      const s = err.response?.status;
      if (s && s < 500 && s !== 429 && s !== 408) break;
    }
  }
  throw lastErr;
}
