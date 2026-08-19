import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';

export default function ScanQR() {
  const navigate = useNavigate();
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

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!isMounted) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            scanner.stop().catch(() => {});
            goToUsername(decodedText);
          },
          () => {}
        )
        .catch(() => setCameraError(true));
    });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
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
    <div className="page-shell pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enviar pago</h1>
          <p className="mt-1 text-sm text-slate-400">Escanea un QR o busca por username.</p>
        </div>
        <Link
          to="/contacts"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-brand-500 hover:text-brand-400"
          aria-label="Mis contactos"
        >
          <Users size={18} />
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-black">
        <div id={containerId} className="aspect-square w-full" />
      </div>
      {cameraError && (
        <p className="mt-2 text-center text-sm text-rose-400">
          No pudimos acceder a la cámara. Usa la búsqueda por username.
        </p>
      )}

      <div className="mt-6 flex items-center gap-3 text-slate-600">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-xs uppercase">o</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <div className="flex flex-1 items-center rounded-xl border border-slate-700 bg-slate-900 px-4 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
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
