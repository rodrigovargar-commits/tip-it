import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  // The server can take ~20 s to wake up; past 45 s something is really wrong.
  timeout: 45000,
});

// A GET that fails because of the network or a server that is waking up (timeout, 502/503/504)
// is repeated twice before the person sees an error. GETs only: they are safe to repeat.
const RETRY_STATUS = new Set([502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tipit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const src = localStorage.getItem('tipit_src');
    if (src) config.headers['X-Tipit-Source'] = src;
  } catch {
    // storage blocked
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error.config;
    const status = error.response?.status;
    const transient = !error.response || RETRY_STATUS.has(status) || error.code === 'ECONNABORTED';
    if (cfg && (cfg.method || 'get').toLowerCase() === 'get' && transient && (cfg.__retries || 0) < 2) {
      cfg.__retries = (cfg.__retries || 0) + 1;
      await sleep(1200 * cfg.__retries);
      return api(cfg);
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('tipit_token');
      localStorage.removeItem('tipit_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error) {
  return (
    error?.response?.data?.errors?.[0]?.message ||
    error?.response?.data?.message ||
    'Ocurrió un error inesperado. Intenta de nuevo.'
  );
}

export default api;

// Wake the server up as soon as the app opens (the first call after a pause is the slow one).
export function warmUpServer() {
  try {
    const base = api.defaults.baseURL;
    if (base) fetch(`${base}/health`, { cache: 'no-store', mode: 'cors' }).catch(() => {});
  } catch {
    // ignore
  }
}
