import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
