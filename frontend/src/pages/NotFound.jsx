import { Link } from 'react-router-dom';
import { Home, ScanLine } from 'lucide-react';
import Person from '../components/Person.jsx';

// Shown for any URL that doesn't exist. (The host still answers 200 for
// single-page apps, so the page is marked noindex in utils/pageMeta.js.)
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-xl flex-col items-center justify-center px-5 pb-24 text-center md:min-h-[calc(100dvh-4rem)]">
      <span className="flex h-36 w-36 items-end justify-center overflow-hidden rounded-full border-2 border-punch-ink bg-punch-pink shadow-[5px_5px_0_0_#0A2F2F]">
        <Person kind="rider" size={140} />
      </span>
      <p className="mt-6 font-display text-6xl font-extrabold text-punch-orange">404</p>
      <h1 className="mt-1 text-3xl font-extrabold">Esta página se fue sin dejar propina</h1>
      <p className="mt-3 font-medium text-slate-400">
        El enlace que abriste no existe o ya cambió. Te llevamos de regreso al inicio.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link to="/" className="btn-primary gap-2">
          <Home size={18} /> Ir al inicio
        </Link>
        <Link to="/scan" className="btn-secondary gap-2">
          <ScanLine size={18} /> Escanear un QR
        </Link>
      </div>
    </div>
  );
}
