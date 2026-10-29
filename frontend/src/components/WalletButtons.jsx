import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';

// "Add to Apple Wallet / Google Wallet" for the person's own QR. They only
// appear once the server has the keys for them (see /api/wallet/config), so
// nobody ever sees a button that cannot work.
const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
const IS_APPLE = /iPhone|iPad|iPod|Macintosh/.test(ua);
const IS_ANDROID = /Android/.test(ua);

export default function WalletButtons() {
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .get('/wallet/config')
      .then(({ data }) => alive && setCfg(data))
      .catch(() => alive && setCfg({ apple: false, google: false }));
    return () => {
      alive = false;
    };
  }, []);

  const showApple = cfg?.apple && !IS_ANDROID;
  const showGoogle = cfg?.google && !(IS_APPLE && !IS_ANDROID && cfg?.apple);
  if (!showApple && !showGoogle) return null;

  const go = async (kind) => {
    setBusy(kind);
    try {
      const { data } = await api.get(`/wallet/${kind}`);
      if (kind === 'apple') window.location.href = data.url;
      else window.open(data.url, '_blank', 'noopener');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mt-6 w-full rounded-2xl border-2 border-punch-ink/25 bg-white p-4 text-left">
      <p className="flex items-center gap-2 font-display font-extrabold">
        <Wallet size={18} /> Tu QR en el Wallet
      </p>
      <p className="mt-0.5 text-sm text-slate-400">
        Tenlo a la mano en tu celular, sin buscar la aplicación, para mostrarlo a tus clientes.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {showApple && (
          <button type="button" onClick={() => go('apple')} disabled={busy === 'apple'} className="btn-primary !py-2 text-sm">
            {busy === 'apple' ? 'Abriendo...' : 'Añadir a Apple Wallet'}
          </button>
        )}
        {showGoogle && (
          <button type="button" onClick={() => go('google')} disabled={busy === 'google'} className="btn-secondary !py-2 text-sm">
            {busy === 'google' ? 'Abriendo...' : 'Añadir a Google Wallet'}
          </button>
        )}
      </div>
    </div>
  );
}
