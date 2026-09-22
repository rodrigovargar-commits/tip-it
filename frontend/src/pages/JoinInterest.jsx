import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Scissors,
  Mic2,
  UtensilsCrossed,
  HandCoins,
  QrCode,
  Smartphone,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import Logo from '../components/Logo.jsx';

// Public marketing landing — intentionally NOT the mobile app shell
// (page-shell / bottom nav / phone-width). This is a real, wide, scrollable
// website page meant to be shared on social media and printed flyers: hero,
// how-it-works, who-it's-for, and a lead-capture form. It creates NO
// account and grants NO access — /register (inside the app) still does
// that, in person. Real onboarding happens later, one-on-one.
const CATEGORIES = [
  { id: 'barbero_estilista', label: 'Barbero / estilista', icon: Scissors },
  { id: 'musico_artista', label: 'Músico / artista callejero', icon: Mic2 },
  { id: 'puesto_comida', label: 'Puesto de comida', icon: UtensilsCrossed },
  { id: 'otro', label: 'Otro servicio', icon: HandCoins },
];

const STEPS = [
  {
    icon: Smartphone,
    title: 'Nos dejas tus datos',
    body: 'Llenas este formulario en un minuto. No es un registro, no crea ninguna cuenta.',
  },
  {
    icon: QrCode,
    title: 'Te configuramos tu QR en persona',
    body: 'Te contactamos por WhatsApp y te ayudamos a activar tu cuenta y tu código, en 10 minutos.',
  },
  {
    icon: Wallet,
    title: 'Recibes propinas sin efectivo',
    body: 'Tus clientes escanean, pagan con tarjeta o Apple Pay / Google Pay, y el dinero llega a tu cuenta.',
  },
];

function scrollToForm() {
  document.getElementById('registro-interes')?.scrollIntoView({ behavior: 'smooth' });
}

export default function JoinInterest() {
  const [searchParams] = useSearchParams();
  const source = searchParams.get('src') || 'landing';

  const [form, setForm] = useState({ name: '', phone: '', category: '', zone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) {
      toast.error('Elige a qué te dedicas');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leads', { ...form, source });
      setDone(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Logo size={36} />
          <span className="text-lg font-bold">TIP-IT</span>
        </div>
        <button onClick={scrollToForm} className="btn-primary !px-4 !py-2 text-sm">
          Quiero mi QR
        </button>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-gradient-to-b from-brand-500/20 via-brand-500/5 to-transparent blur-2xl"
        />
        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-10 text-center sm:pt-16">
          <span className="inline-block rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1 text-xs font-semibold text-brand-300">
            Programa piloto en CDMX
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl">
            ¿Trabajas dando servicio?
            <br />
            <span className="text-brand-400">Que te dejen propina sin efectivo.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
            Barberos, músicos callejeros, puestos de comida: te instalamos gratis un código QR
            para que tus clientes te dejen propina con tarjeta, Apple Pay o Google Pay.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={scrollToForm} className="btn-primary w-full sm:w-auto">
              Quiero mi QR gratis
            </button>
            <Link to="/como-funciona" className="text-sm font-semibold text-slate-400 hover:text-slate-200">
              ¿Cómo funciona la app? →
            </Link>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Así de simple</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="card relative">
              <span className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                <Icon size={22} />
              </span>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para quién es */}
      <section className="border-y border-slate-900 bg-slate-900/30 py-14">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">¿Es para ti?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-4">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <div key={id} className="card flex flex-col items-center gap-2 py-6 text-center">
                <Icon size={28} className="text-brand-400" />
                <p className="text-sm font-semibold">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" /> Pagos seguros con Stripe
            </span>
            <span className="flex items-center gap-2">
              <Wallet size={18} className="text-brand-400" /> Nada que comprar
            </span>
            <span className="flex items-center gap-2">
              <QrCode size={18} className="text-amber-400" /> Tu QR queda listo el mismo día
            </span>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="registro-interes" className="mx-auto max-w-md px-5 py-16">
        {done ? (
          <div className="card text-center">
            <CheckCircle2 size={48} className="mx-auto text-brand-400" />
            <h3 className="mt-4 text-xl font-bold">¡Listo, {form.name.split(' ')[0]}!</h3>
            <p className="mt-2 text-sm text-slate-400">
              Ya quedaste en la lista. Te contactamos por WhatsApp para configurar tu QR en
              persona — toma unos 10 minutos.
            </p>
            <Link to="/" className="btn-secondary mt-6 w-full">
              Conocer la app
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-center text-2xl font-bold">Regístrate para tu QR gratis</h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Sin compromiso. Solo para que te contactemos y coordinar la instalación en persona.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs text-slate-500">Tu nombre</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Como te dicen tus clientes"
                  className="input-field mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">WhatsApp</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  maxLength={30}
                  placeholder="55 1234 5678"
                  className="input-field mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">¿A qué te dedicas?</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CATEGORIES.map(({ id, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setForm((f) => ({ ...f, category: id }))}
                      className={`card flex flex-col items-center gap-1.5 !p-3 text-center text-xs font-semibold transition ${
                        form.category === id
                          ? 'border-brand-400 bg-brand-500/10 text-brand-300'
                          : 'text-slate-300'
                      }`}
                    >
                      <Icon size={20} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Zona o colonia (opcional)</label>
                <input
                  name="zone"
                  value={form.zone}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="Ej. Coyoacán centro"
                  className="input-field mt-1"
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Enviando...' : 'Quiero mi QR'}
              </button>
            </form>
          </>
        )}
      </section>

      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600">
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-400">
            Inicia sesión
          </Link>
          {' · '}
          <Link to="/" className="hover:text-slate-400">
            Conoce la app
          </Link>
        </p>
        <p className="mt-2">TIP-IT · Propinas digitales</p>
      </footer>
    </div>
  );
}
