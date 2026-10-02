import { Link } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import Person from './Person.jsx';

// Login / sign-up frame: one centred column on phones, and a two-pane
// "desktop" layout (colourful brand side + the form) from md up.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)] md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r-2 border-punch-ink bg-punch-orange p-10 md:flex lg:p-14">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-2 border-punch-ink bg-punch-yellow" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full border-2 border-punch-ink bg-punch-pink" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-punch-ink bg-punch-yellow px-4 py-1.5 font-display text-sm font-extrabold">
            <Sparkles size={16} /> Únete a la revolución de las propinas
          </span>
          <h2 className="mt-6 font-display text-5xl font-extrabold leading-[0.95] tracking-tight lg:text-6xl">
            Que no se te vayan tus propinas.
          </h2>
          <p className="mt-5 max-w-sm text-lg font-medium leading-relaxed">
            Tu QR, tu perfil y tu lana directo a tu banco. Sin efectivo, sin fricción.
          </p>
        </div>

        <div className="relative mt-10 flex items-end gap-3">
          {['stylist', 'musician', 'cook', 'waiter'].map((k, i) => (
            <span
              key={k}
              className={`flex h-24 w-24 items-end justify-center overflow-hidden rounded-full border-2 border-punch-ink bg-punch-cream shadow-[4px_4px_0_0_#0A2F2F] lg:h-28 lg:w-28 ${
                i % 2 ? 'mb-6' : ''
              }`}
            >
              <Person kind={k} size={112} />
            </span>
          ))}
          <span className="mb-16 ml-2 inline-flex -rotate-3 items-center gap-2 rounded-2xl border-2 border-punch-ink bg-white px-3.5 py-2 font-display text-sm font-extrabold shadow-[4px_4px_0_0_#0A2F2F]">
            <Heart size={15} fill="currentColor" /> ¡Gracias!
          </span>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 md:px-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 hidden text-sm font-semibold text-slate-400 hover:text-punch-ink md:inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400 md:text-base">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
