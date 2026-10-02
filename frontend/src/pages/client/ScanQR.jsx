import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ScanQR() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const containerId = 'qr-reader';
  const [cameraError, setCameraError] = useState(false);
  const [username, setUsername] = useState('');

  const goToUsername = (raw) => {
    if (!raw) return;
    let value = raw.trim();
    const match = value.match(/\/tip\/([a-zA-Z0-9_.]+)/);
    if (match) value = match[1];
    value = value.replace(/^@/, '');
    if (!value) return;
    navigate(`/tip/${value.toLowerCase()}`);
  };

  useEffect(() => {
    let isMounted = true;

    // html5-qrcode's stop() throws synchronously (not just a rejected
    // promise) when the scanner never reached a running state — e.g. camera
    // access was denied — so a plain .catch() doesn't protect against it.
    // Left unguarded, that throw crashes the whole component on unmount.
    const safeStop = (scanner) => {
      try {
        scanner.stop()?.catch(() => {});
      } catch {
        // scanner wasn't running — nothing to stop
      }
    };

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!isMounted) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            safeStop(scanner);
            goToUsername(decodedText);
          },
          () => {}
        )
        .catch(() => setCameraError(true));
    });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        safeStop(scannerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Escribe un username');
      return;
    }
    goToUsername(username);
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Dar propina"
        title="Escanea y listo"
        subtitle="Apunta la cámara al QR de quien te atendió, o búscalo por su username."
        action={
          user && (
            <Link
              to="/contacts"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-white transition hover:bg-punch-yellow"
              aria-label="Mis contactos"
            >
              <Users size={19} strokeWidth={2.4} />
            </Link>
          )
        }
      />

      <div className="mx-auto mt-6 w-full max-w-sm overflow-hidden rounded-[2rem] border-2 border-punch-ink bg-black shadow-[6px_6px_0_0_#0A2F2F] md:max-w-md">
        <div id={containerId} className="aspect-square w-full" />
      </div>
      {cameraError && (
        <p className="mt-2 text-center text-sm text-rose-600">
          No pudimos acceder a la cámara. Usa la búsqueda por username.
        </p>
      )}

      <div className="mx-auto mt-6 flex w-full max-w-sm items-center gap-3 text-punch-ink/60 md:max-w-md">
        <div className="h-0.5 flex-1 rounded bg-punch-ink/20" />
        <span className="font-display text-xs font-extrabold uppercase">o búscalo</span>
        <div className="h-0.5 flex-1 rounded bg-punch-ink/20" />
      </div>

      <form onSubmit={handleSearch} className="mx-auto mt-6 flex w-full max-w-sm gap-2 md:max-w-md">
        <div className="flex flex-1 items-center rounded-2xl border-2 border-punch-ink/30 bg-white px-4 focus-within:border-punch-ink focus-within:ring-2 focus-within:ring-punch-yellow">
          <span className="text-slate-500">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full bg-transparent px-2 py-3 text-slate-100 outline-none"
          />
        </div>
        <button type="submit" className="btn-primary !px-5">
          Buscar
        </button>
      </form>
    </div>
  );
}
