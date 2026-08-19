import { Link } from 'react-router-dom';
import { ScanLine, Star, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function Landing() {
  const { user, worker } = useAuth();

  return (
    <div className="page-shell justify-between pb-10">
      <div>
        <div className="mt-6 flex items-center gap-2">
          <Logo size={40} />
          <span className="text-xl font-bold">TIP-IT</span>
        </div>

        <h1 className="mt-12 text-4xl font-extrabold leading-tight">
          Propinas digitales,
          <br />
          <span className="text-brand-400">simples y directas.</span>
        </h1>
        <p className="mt-4 text-slate-400">
          Recibe pagos con tu QR único o busca a alguien por su usuario. Sin efectivo, sin
          fricción.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3">
          <div className="card flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
              <ScanLine size={20} strokeWidth={2} />
            </span>
            <div>
              <p className="font-semibold">Escanea y envía</p>
              <p className="text-sm text-slate-400">Apunta la cámara al QR y listo.</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <Star size={20} strokeWidth={2} />
            </span>
            <div>
              <p className="font-semibold">Califica y deja tu reseña</p>
              <p className="text-sm text-slate-400">Construye tu reputación con cada servicio.</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <ShieldCheck size={20} strokeWidth={2} />
            </span>
            <div>
              <p className="font-semibold">Pagos seguros con Stripe</p>
              <p className="text-sm text-slate-400">Nunca guardamos tu tarjeta.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        {user ? (
          <Link to={worker ? '/worker/dashboard' : '/scan'} className="btn-primary w-full">
            Ir a mi cuenta
          </Link>
        ) : (
          <>
            <Link to="/register" className="btn-primary w-full">
              Crear cuenta gratis
            </Link>
            <Link to="/login" className="btn-secondary w-full">
              Ya tengo cuenta
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
