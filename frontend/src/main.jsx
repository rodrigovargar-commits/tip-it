import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import App from './App.jsx';
import ErrorBoundary, { reloadOnceForUpdate } from './components/ErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { captureSource } from './utils/attribution.js';

captureSource();

// When launched from the home-screen icon (standalone PWA), iOS/Android
// sometimes resume on the last route that was open instead of the app's
// start_url — e.g. landing straight on the QR scanner or camera. Force
// the app back to the main screen on real app launches only (this runs
// once at page load, not on in-app navigation).
try {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone && window.location.pathname !== '/') {
    window.history.replaceState(null, '', '/');
  }
} catch {
  // ignore (private mode / storage or matchMedia unavailable)
}

// Keep the app up to date. Without this, someone who already opened the site (or
// installed it on the home screen) keeps seeing the OLD version from the cache
// until they close everything. Now it checks for a new version when the app comes
// back to the foreground and every 30 minutes, and reloads once when one is ready.
let updateSW = () => {};
try {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
} catch {
  // no service worker support (some in-app browsers): the site works the same without it
}

// A lazy page whose file no longer exists (new version went live): reload once.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForUpdate()) event.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Analytics />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              border: '2px solid #0A2F2F',
              borderRadius: '9999px',
              background: '#fff',
              color: '#0A2F2F',
              fontWeight: 600,
              boxShadow: '3px 3px 0 0 #0A2F2F',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
