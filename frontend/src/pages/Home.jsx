import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  Bike,
  Calculator,
  Check,
  HandCoins,
  Heart,
  Mic2,
  Plus,
  QrCode,
  ScanLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { trackEvent } from '../utils/analytics.js';
import Logo from '../components/Logo.jsx';

// Public marketing landing for tipit.com.mx — the "friendly" face of TIP-IT.
// Palette: "Tropical punch" (orange / pink / yellow / teal) on warm cream with a
// deep teal ink. Deliberately light and playful, unlike the dark in-app UI.
// It creates nothing itself: every CTA sends people into the real app.

const REGISTER_URL = '/register?role=worker';

const NAV = [
  { href: '#que-es', label: 'Qué es' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#para-quien', label: 'Para quién' },
  { href: '#preguntas', label: 'Preguntas' },
];

const PAINS = [
  { quote: '“No traigo cambio.”', note: 'Y ahí se fue la propina.', bg: 'bg-punch-pink' },
  { quote: '“Al rato te paso.”', note: 'Ese “al rato” casi nunca llega.', bg: 'bg-punch-yellow' },
  { quote: '“Pago con tarjeta.”', note: 'Lo normal hoy… pero la propina no cabe en la terminal.', bg: 'bg-white' },
];

const STEPS = [
  {
    n: '1',
    title: 'Crea tu cuenta',
    body: 'Elige tu username único. Con él generamos tu código QR automáticamente.',
    bg: 'bg-punch-orange',
  },
  {
    n: '2',
    title: 'Conecta tu banco',
    body: 'Una sola vez, con una verificación rápida, para que el dinero llegue directo a tu cuenta.',
    bg: 'bg-punch-pink',
  },
  {
    n: '3',
    title: 'Comparte tu QR',
    body: 'Imprímelo, pégalo donde trabajas o compártelo por WhatsApp. Cada pago te llega directo.',
    bg: 'bg-punch-teal text-white',
  },
  {
    n: '4',
    title: 'Cobra y crece',
    body: 'Ve tu total recibido, tus reseñas y tu reputación desde un solo panel.',
    bg: 'bg-white',
  },
];

// What the person tipping does (same words as the in-app guide).
const CLIENT_STEPS = [
  { icon: ScanLine, title: 'Escanea o busca', body: 'Apunta la cámara al QR o busca el username. No hace falta descargar nada.' },
  { icon: Calculator, title: 'Elige el monto', body: 'Monto fijo o % de la cuenta, tú decides. No pedimos nombre ni ningún dato.' },
  { icon: ShieldCheck, title: 'Paga seguro', body: 'Con tarjeta o Apple Pay. TIP-IT nunca ve ni guarda tu tarjeta.' },
  { icon: Star, title: 'Califica (opcional)', body: 'Deja estrellas y una reseña: le ayudas a construir su reputación.' },
];

const NUMBERS = [
  { big: '$0', title: 'para crear tu cuenta', body: 'Tu cuenta y tu QR son gratis. No hay terminal que comprar.' },
  { big: '6% + $4', title: 'por propina recibida', body: 'Una comisión pequeña, siempre visible antes de pagar.' },
  { big: '100%', title: 'si tu cliente cubre la comisión', body: 'Puede elegir cubrirla para que recibas todo lo que te quiso dejar.' },
];

const WHO = [
  { icon: Scissors, label: 'Barberos y estilistas', bg: 'bg-punch-orange' },
  { icon: Mic2, label: 'Músicos y artistas de calle', bg: 'bg-punch-pink' },
  { icon: UtensilsCrossed, label: 'Puestos de comida', bg: 'bg-punch-yellow' },
  { icon: Wine, label: 'Meseros y bartenders', bg: 'bg-punch-teal text-white' },
  { icon: Bike, label: 'Repartidores', bg: 'bg-punch-pink' },
  { icon: HandCoins, label: 'Todo el que recibe propinas', bg: 'bg-white' },
];

const FAQ = [
  {
    q: '¿Necesito crear una cuenta para pagar?',
    a: 'No. Escaneas, eliges el monto y pagas. No pedimos nombre ni ningún dato.',
  },
  {
    q: '¿TIP-IT guarda mi tarjeta?',
    a: 'Nunca. El pago lo procesa Stripe directamente: TIP-IT no ve ni almacena números de tarjeta.',
  },
  {
    q: '¿Cuánto cobra TIP-IT?',
    a: 'Una comisión pequeña por transacción (6% + $4), siempre visible antes de pagar. Quien envía el pago puede elegir cubrirla para que el trabajador reciba el 100%.',
  },
  {
    q: '¿Cómo recibo mi dinero?',
    a: 'Se transfiere directo a tu cuenta bancaria. TIP-IT no retiene el dinero en ningún momento. Tus primeros pagos pueden tardar unos días en liberarse; es normal en toda cuenta nueva.',
  },
  {
    q: 'No soy muy de apps… ¿me ayudan?',
    a: 'Claro. Déjanos tu WhatsApp y te ayudamos a armar tu cuenta y tu QR en persona, en unos 10 minutos.',
  },
];

function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown];
}

function Reveal({ children, className = '', delay = 0 }) {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition duration-700 ease-out motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

// "Pill" button with a hard offset shadow. `tone` picks the surface it sits on.
function Cta({ to, href, children, tone = 'ink', where, className = '' }) {
  const tones = {
    ink: 'bg-punch-ink text-punch-yellow shadow-[4px_4px_0_0_#FCE883] hover:shadow-[2px_2px_0_0_#FCE883]',
    orange: 'bg-punch-orange text-punch-ink shadow-[4px_4px_0_0_#0A2F2F] hover:shadow-[2px_2px_0_0_#0A2F2F]',
    ghost: 'bg-transparent text-punch-ink hover:bg-punch-ink/10',
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-full border-2 border-punch-ink px-6 py-3.5 font-display text-base font-extrabold transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 ${tones[tone]} ${className}`;
  const onClick = () => trackEvent('landing_cta', { where });
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} onClick={onClick} className={cls}>
      {children}
    </Link>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[310px]">
      {/* sun + blobs behind */}
      <div className="absolute -left-10 top-10 h-64 w-64 rounded-full border-2 border-punch-ink bg-punch-yellow sm:h-72 sm:w-72" />
      <div className="absolute -bottom-6 -right-8 h-40 w-40 rounded-full border-2 border-punch-ink bg-punch-pink" />

      <div className="relative rotate-2 rounded-[2.6rem] border-2 border-punch-ink bg-punch-ink p-2.5 shadow-[8px_8px_0_0_#0A2F2F]">
        <div className="rounded-[2.1rem] bg-punch-cream px-5 pb-6 pt-8 text-punch-ink">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-pink font-display text-3xl font-extrabold">
              R
            </span>
            <p className="mt-3 font-display text-xl font-extrabold">Rafa</p>
            <p className="text-sm text-punch-ink/70">Barbero · Coyoacán</p>
            <div className="mt-1.5 flex gap-0.5 text-punch-orange">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={15} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm font-semibold">¿Cuánto le dejas?</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center font-display text-lg font-extrabold">
            <span className="rounded-2xl border-2 border-punch-ink bg-white py-2">$20</span>
            <span className="rounded-2xl border-2 border-punch-ink bg-punch-orange py-2 shadow-[3px_3px_0_0_#0A2F2F]">
              $50
            </span>
            <span className="rounded-2xl border-2 border-punch-ink bg-white py-2">$100</span>
          </div>

          <div className="mt-5 rounded-full border-2 border-punch-ink bg-punch-teal py-3 text-center font-display text-base font-extrabold text-white">
            Dejar propina
          </div>
          <p className="mt-3 text-center text-[11px] text-punch-ink/60">
            Tarjeta · Apple Pay · Google Pay
          </p>
        </div>
      </div>

      {/* floating stickers */}
      <div
        style={{ '--r': '-6deg' }}
        className="absolute -left-6 top-24 z-10 flex animate-floaty items-center gap-2 rounded-2xl border-2 border-punch-ink bg-white px-3.5 py-2.5 shadow-[4px_4px_0_0_#0A2F2F] motion-reduce:animate-none sm:-left-12"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-punch-yellow">
          <Sparkles size={16} />
        </span>
        <span className="font-display text-sm font-extrabold leading-tight text-punch-ink">
          +$50
          <br />
          <span className="font-sans text-[11px] font-medium text-punch-ink/60">propina nueva</span>
        </span>
      </div>
      <div
        style={{ '--r': '5deg' }}
        className="absolute -right-4 -bottom-5 z-10 animate-floaty rounded-2xl border-2 border-punch-ink bg-punch-pink px-3.5 py-2.5 shadow-[4px_4px_0_0_#0A2F2F] [animation-delay:1.5s] motion-reduce:animate-none sm:-right-10"
      >
        <span className="flex items-center gap-2 font-display text-sm font-extrabold text-punch-ink">
          <Heart size={15} fill="currentColor" /> ¡Gracias por el corte!
        </span>
      </div>
    </div>
  );
}

function Marquee() {
  const words = ['Sin cambio', 'Sin efectivo', 'Sin complicaciones', 'Más propinas', 'Con tu QR'];
  const row = [...words, ...words];
  return (
    <div className="overflow-hidden border-y-2 border-punch-ink bg-punch-ink py-3.5" aria-hidden>
      <div className="flex w-max animate-marquee whitespace-nowrap motion-reduce:animate-none">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {row.map((w, i) => (
              <span
                key={`${k}-${i}`}
                className="flex items-center font-display text-xl font-extrabold uppercase tracking-wide text-punch-yellow"
              >
                {w}
                <Sparkles size={18} className="mx-6 text-punch-orange" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, children, className = '' }) {
  return (
    <div className={className}>
      <span className="inline-block -rotate-1 rounded-full border-2 border-punch-ink bg-white px-4 py-1 font-display text-sm font-extrabold uppercase tracking-wider text-punch-ink">
        {eyebrow}
      </span>
      <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1] tracking-tight sm:text-5xl lg:text-6xl">
        {children}
      </h2>
    </div>
  );
}

export default function Home() {
  const { user, worker } = useAuth();
  const myAccount = worker ? '/worker/dashboard' : '/scan';

  return (
    <div className="min-h-screen overflow-x-hidden bg-punch-cream font-sans text-punch-ink">
      {/* ---------- Nav + Hero ---------- */}
      <div className="bg-punch-orange">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <a href="#top" className="flex items-center gap-2.5" id="top">
            <Logo size={40} />
            <span className="font-display text-2xl font-extrabold tracking-tight">TIP-IT</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:underline hover:decoration-2 hover:underline-offset-4">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {!user && (
              <Link to="/login" className="hidden text-sm font-semibold hover:underline sm:inline">
                Iniciar sesión
              </Link>
            )}
            <Cta
              to={user ? myAccount : REGISTER_URL}
              where="nav"
              tone="ink"
              className="!px-5 !py-2.5 !text-sm"
            >
              {user ? 'Mi cuenta' : 'Crea tu cuenta'}
            </Cta>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-8 md:grid-cols-[1.15fr_1fr] md:pb-28 md:pt-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-punch-ink bg-punch-yellow px-4 py-1.5 font-display text-sm font-extrabold">
              <Banknote size={16} /> Únete a la revolución de las propinas
            </span>
            <h1 className="mt-6 font-display text-[2.6rem] font-extrabold leading-[0.97] tracking-tight sm:text-6xl lg:text-7xl">
              Cada vez hay menos cash.{' '}
              <span className="relative inline-block -rotate-1 rounded-2xl bg-punch-yellow px-3 pb-1">
                Que no se te vayan tus propinas.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg font-medium leading-relaxed sm:text-xl">
              Propinas digitales, simples y directas. Cada vez más gente paga con el celular o con
              tarjeta y ya nadie carga cambio. Con tu QR único de TIP-IT, tus clientes te dejan
              propina en segundos y tú ganas más.
            </p>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Cta to={user ? myAccount : REGISTER_URL} where="hero" tone="ink" className="text-lg">
                {user ? 'Ir a mi cuenta' : 'Crea tu cuenta'} <ArrowRight size={20} />
              </Cta>
              <a
                href="#como-funciona"
                className="font-display text-base font-extrabold underline decoration-2 underline-offset-4"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-5 text-sm font-semibold">Gratis · Sin efectivo, sin fricción · Hecho en CDMX</p>
          </div>

          <Reveal>
            <PhoneMock />
          </Reveal>
        </section>
      </div>

      <Marquee />

      {/* ---------- Qué es ---------- */}
      <section id="que-es" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <SectionTitle eyebrow="¿Qué es TIP-IT?">
              Tu propina, aunque nadie traiga efectivo.
            </SectionTitle>
            <p className="mt-6 text-lg font-medium leading-relaxed sm:text-xl">
              TIP-IT es una forma sencilla de recibir propinas sin efectivo. Es un proyecto hecho
              en la CDMX para la gente que vive de dar buen servicio: barberos, estilistas,
              músicos de calle, puestos de comida y más.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-punch-ink/80">
              Recibes pagos con tu QR único, o te buscan por tu username. Tu cliente escanea,
              elige cuánto dejarte y paga. Y con cada servicio bien calificado vas construyendo
              tu reputación, que con el tiempo funciona como tu currículum.
            </p>
          </Reveal>

          <div className="grid gap-4">
            <p className="font-display text-xl font-extrabold">¿Te suena?</p>
            {PAINS.map((p, i) => (
              <Reveal key={p.quote} delay={i * 90}>
                <div
                  className={`${p.bg} ${i % 2 ? 'sm:ml-10' : 'sm:mr-10'} rounded-3xl border-2 border-punch-ink p-5 shadow-[5px_5px_0_0_#0A2F2F]`}
                >
                  <p className="font-display text-2xl font-extrabold">{p.quote}</p>
                  <p className="mt-1 text-punch-ink/80">{p.note}</p>
                </div>
              </Reveal>
            ))}
            <p className="mt-2 font-display text-lg font-extrabold">
              Cada propina que no te dejan por falta de cash es dinero que se queda en la
              cartera de alguien más. Con TIP-IT eso se acaba.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Cómo funciona ---------- */}
      <section id="como-funciona" className="border-y-2 border-punch-ink bg-punch-yellow py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <SectionTitle eyebrow="Cómo funciona">Cuatro pasos y ya estás cobrando.</SectionTitle>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div
                  className={`${s.bg} ${i % 2 ? 'lg:mt-8' : ''} h-full rounded-3xl border-2 border-punch-ink p-6 shadow-[6px_6px_0_0_#0A2F2F]`}
                >
                  <span className="font-display text-7xl font-extrabold leading-none">{s.n}</span>
                  <p className="mt-4 font-display text-2xl font-extrabold leading-tight">{s.title}</p>
                  <p className="mt-2 text-base font-medium leading-relaxed opacity-90">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-16">
            <p className="font-display text-2xl font-extrabold sm:text-3xl">Y tu cliente, ¿qué hace?</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CLIENT_STEPS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-3xl border-2 border-punch-ink bg-punch-cream p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-pink">
                    <Icon size={20} />
                  </span>
                  <p className="mt-3 font-display text-lg font-extrabold">{title}</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal className="mt-12 text-center">
            <Cta to={user ? myAccount : REGISTER_URL} where="steps" tone="ink" className="text-lg">
              {user ? 'Ir a mi cuenta' : 'Empieza ahora'} <ArrowRight size={20} />
            </Cta>
          </Reveal>
        </div>
      </section>

      {/* ---------- Para quién ---------- */}
      <section id="para-quien" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Reveal>
          <SectionTitle eyebrow="¿Para quién?">Si das buen servicio, es para ti.</SectionTitle>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {WHO.map(({ icon: Icon, label, bg }, i) => (
            <Reveal key={label} delay={(i % 3) * 80}>
              <div
                className={`${bg} flex h-full flex-col items-start gap-5 rounded-3xl border-2 border-punch-ink p-5 shadow-[5px_5px_0_0_#0A2F2F] transition hover:-translate-y-1 sm:p-7`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-cream text-punch-ink">
                  <Icon size={26} />
                </span>
                <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Por qué ---------- */}
      <section className="border-y-2 border-punch-ink bg-punch-teal py-20 text-white sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <span className="inline-block -rotate-1 rounded-full border-2 border-punch-ink bg-white px-4 py-1 font-display text-sm font-extrabold uppercase tracking-wider text-punch-ink">
              Los números
            </span>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1] tracking-tight sm:text-5xl lg:text-6xl">
              Menos cash no tiene que significar <span className="text-punch-yellow">menos propina.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {NUMBERS.map((c, i) => (
              <Reveal key={c.big} delay={i * 90}>
                <div className="h-full rounded-3xl border-2 border-punch-ink bg-punch-teal p-7 shadow-[6px_6px_0_0_#0A2F2F] ring-2 ring-white/20">
                  <p className="font-display text-5xl font-extrabold text-punch-yellow sm:text-6xl">{c.big}</p>
                  <p className="mt-2 font-display text-xl font-extrabold">{c.title}</p>
                  <p className="mt-3 text-lg leading-relaxed text-white/90">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Precio claro ---------- */}
      <section className="bg-punch-pink py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2">
          <Reveal>
            <SectionTitle eyebrow="Un ejemplo">Así se ve en tu bolsillo.</SectionTitle>
            <p className="mt-6 text-lg font-medium leading-relaxed">
              Solo ganamos cuando tú ganas: si no te llegan propinas, no pagas nada.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="rounded-3xl border-2 border-punch-ink bg-white p-7 shadow-[8px_8px_0_0_#0A2F2F] sm:p-9">
              <div className="rounded-2xl border-2 border-dashed border-punch-ink bg-punch-cream p-5">
                <p className="font-display text-sm font-extrabold uppercase tracking-wider text-punch-teal">
                  Con una propina de $100
                </p>
                <p className="mt-1 text-lg font-medium">
                  Te dejan <b>$100</b> → te llegan <b>$90</b>. Si tu cliente cubre la comisión,
                  te llegan los <b>$100</b> completos.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="preguntas" className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
        <Reveal>
          <SectionTitle eyebrow="Preguntas">Lo que todos nos preguntan.</SectionTitle>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border-2 border-punch-ink bg-white px-5 py-4 shadow-[4px_4px_0_0_#0A2F2F] open:bg-punch-yellow"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-extrabold [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus size={22} className="shrink-0 transition group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-base font-medium leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- CTA final ---------- */}
      <section className="border-t-2 border-punch-ink bg-punch-orange py-20 text-center sm:py-28">
        <div className="mx-auto max-w-3xl px-5">
          <Reveal>
            <QrCode size={44} className="mx-auto" />
            <h2 className="mt-5 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
              Que tu próxima propina llegue aunque nadie traiga cash.
            </h2>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Cta to={user ? myAccount : REGISTER_URL} where="final" tone="ink" className="text-lg">
                {user ? 'Ir a mi cuenta' : 'Crea tu cuenta gratis'} <ArrowRight size={20} />
              </Cta>
              <Cta to="/unete?src=landing_ayuda" where="final_help" tone="ghost" className="text-base">
                Prefiero que me ayuden
              </Cta>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bg-punch-ink text-punch-cream">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={36} />
              <span className="font-display text-2xl font-extrabold text-punch-yellow">TIP-IT</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-punch-cream/70">
              Propinas digitales para la gente que da buen servicio. Hecho en CDMX.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
            <Link to="/como-funciona" className="hover:text-punch-yellow">Guía de la app</Link>
            <Link to="/terminos" className="hover:text-punch-yellow">Términos</Link>
            <Link to="/privacidad" className="hover:text-punch-yellow">Aviso de privacidad</Link>
            <Link to="/login" className="hover:text-punch-yellow">Iniciar sesión</Link>
            <a href="tel:+525580075613" className="hover:text-punch-yellow">¿Dudas? 55 8007 5613</a>
          </nav>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-punch-cream/50">
          © {new Date().getFullYear()} TIP-IT · tipit.com.mx
        </p>
      </footer>
    </div>
  );
}
