import { Link } from 'react-router-dom';
import { QrCode, ScanLine, Star, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import Person from '../components/Person.jsx';

// Home of the installed iOS/Android app (the web gets the full marketing page
// in Home.jsx). Same look: orange hero, chunky stickers, big friendly type.
const POINTS = [
  { icon: ScanLine, title: 'Escanea y envía', body: 'Apunta la cámara al QR y listo.', bg: 'bg-punch-yellow' },
  { icon: Star, title: 'Califica y reseña', body: 'Construye la reputación de quien te atendió.', bg: 'bg-punch-pink' },
  { icon: Wallet, title: 'Directo a su banco', body: 'Nunca guardamos tu tarjeta.', bg: 'bg-white' },
];

export default function Landing() {
  const { user, worker } = useAuth();

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col">
      <section className="border-b-2 border-punch-ink bg-punch-orange px-5 pb-10 pt-8">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <span className="font-display text-2xl font-extrabold">TIP-IT</span>
        </div>
        <h1 className="mt-8 font-display text-[2.6rem] font-extrabold leading-[0.97]">
          Propinas digitales,{' '}
          <span className="inline-block -rotate-1 rounded-2xl bg-punch-yellow px-2.5 pb-0.5">
            simples y directas.
          </span>
        </h1>
        <p className="mt-4 font-medium">
          Recibe pagos con tu QR único o busca a alguien por su usuario. Sin efectivo, sin fricción.
        </p>
        <div className="mt-6 flex -space-x-3">
          {['stylist', 'musician', 'cook', 'waiter'].map((k) => (
            <span
              key={k}
              className="flex h-14 w-14 items-end justify-center overflow-hidden rounded-full border-2 border-punch-ink bg-punch-cream"
            >
              <Person kind={k} size={56} />
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-3 px-5 py-6">
        {POINTS.map(({ icon: Icon, title, body, bg }) => (
          <div key={title} className={`card flex items-center gap-3 !p-4 ${bg}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-cream">
              <Icon size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold leading-tight">{title}</p>
              <p className="text-sm font-medium text-slate-400">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-3 px-5 pb-10">
        {user ? (
          <Link to={worker ? '/worker/dashboard' : '/scan'} className="btn-primary w-full">
            Ir a mi cuenta
          </Link>
        ) : (
          <>
            <Link to="/scan" className="btn-primary flex w-full items-center justify-center gap-2">
              <QrCode size={18} />
              Quiero dar una propina
            </Link>
            <Link to="/register?role=worker" className="btn-secondary w-full">
              Crear cuenta gratis
            </Link>
            <Link to="/login" className="block text-center text-sm font-semibold text-slate-400">
              Ya tengo cuenta
            </Link>
          </>
        )}
        <p className="pt-2 text-center text-xs text-slate-500">
          <Link to="/como-funciona">Cómo funciona</Link>
          {' · '}
          <Link to="/terminos">Términos</Link>
          {' · '}
          <Link to="/privacidad">Aviso de privacidad</Link>
        </p>
      </div>
    </div>
  );
}
