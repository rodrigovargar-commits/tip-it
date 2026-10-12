import { useEffect, useState } from 'react';
import api from '../services/api.js';

// Asks the server once which ways of getting a code it offers. Until it
// answers (or if it can't), the app behaves as before: email + password.
let cached;
export default function useOtpConfig() {
  const [config, setConfig] = useState(cached || null);
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    api
      .get('/auth/otp/config')
      .then(({ data }) => {
        cached = { enabled: data.enabled, required: data.required, channels: data.channels };
        if (alive) setConfig(cached);
      })
      .catch(() => {
        cached = { enabled: false, required: false, channels: [] };
        if (alive) setConfig(cached);
      });
    return () => {
      alive = false;
    };
  }, []);
  return config; // null while loading
}
