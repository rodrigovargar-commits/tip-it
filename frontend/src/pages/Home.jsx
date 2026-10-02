import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  Check,
  HandCoins,
  Heart,
  MessageSquareQuote,
  Plus,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { trackEvent } from '../utils/analytics.js';
import Logo from '../components/Logo.jsx';
import Person from '../components/Person.jsx';
import RegisterForm from '../components/RegisterForm.jsx';

// TIP-IT's public site AND front door of the app, all in one: marketing on
// top, and the real thing (pay a tip, create an account, log in) inside the
// same page. Palette: "Tropical punch" on warm cream. Playful on purpose —
// the people using it are barbers, musicians and food stalls, not executives.

const PAINS = [
  { quote: '“No traigo cambio.”', note: 'Y ahí se fue la propina.', bg: 'bg-punch-pink', tilt: '-rotate-1' },
  { quote: '“Al rato te paso.”', note: 'Ese “al rato” casi nunca llega.', bg: 'bg-punch-yellow', tilt: 'rotate-1' },
  { quote: '“Pago con tarjeta.”', note: 'Normal hoy… pero la propina no cabe en la terminal.', bg: 'bg-white', tilt: '-rotate-1' },
];

const STEPS = [
  { n: '1', title: 'Crea tu cuenta', body: 'Elige tu username único. Con él generamos tu código QR automáticamente.', bg: 'bg-punch-orange' },
  { n: '2', title: 'Conecta tu banco', body: 'Una sola vez, con una verificación rápida, para que el dinero llegue directo a tu cuenta.', bg: 'bg-punch-pink' },
  { n: '3', title: 'Comparte tu QR', body: 'Imprímelo, pégalo donde chambeas o compártelo por WhatsApp. Cada pago te llega directo.', bg: 'bg-punch-teal text-white' },
  { n: '4', title: 'Cobra y crece', body: 'Ve tu total recibido, tus reseñas y tu reputación desde un solo panel.', bg: 'bg-white' },
];

const CLIENT_STEPS = [
  { icon: ScanLine, title: 'Escanea o busca', body: 'Apunta la cámara al QR o busca el username. No hace falta descargar nada.' },
  { icon: Calculator, title: 'Elige el monto', body: 'Monto fijo o % de la cuenta, tú decides. No pedimos nombre ni ningún dato.' },
  { icon: ShieldCheck, title: 'Paga seguro', body: 'Con tarjeta o Apple Pay. TIP-IT nunca ve ni guarda tu tarjeta.' },
  { icon: Star, title: 'Califica (opcional)', body: 'Deja estrellas y una reseña: le ayudas a construir su reputación.' },
];

const WHO = [
  { person: 'stylist', label: 'Barberos y estilistas', bg: 'bg-punch-orange' },
  { person: 'musician', label: 'Músicos y artistas de calle', bg: 'bg-punch-pink' },
  { person: 'cook', label: 'Puestos de comida', bg: 'bg-punch-yellow' },
  { person: 'waiter', label: 'Meseros y bartenders', bg: 'bg-punch-teal text-white' },
  { person: 'rider', label: 'Repartidores', bg: 'bg-punch-pink' },
  { person: null, label: 'Todo el que recibe propinas', bg: 'bg-white' },
];

const NUMBERS = [
  { big: '$0', title: 'para crear tu cuenta', body: 'Tu cuenta y tu QR son gratis. No hay terminal que comprar.' },
  { big: '1 QR', title: 'para todos tus clientes', body: 'Uno solo, con tu nombre. Lo escanean con la cámara del celular, sin descargar nada.' },
  { big: 'Directo', title: 'a tu banco', body: 'TIP-IT no retiene tu dinero: va de tu cliente a tu cuenta.' },
];

const FEATURES = [
  { icon: Star, title: 'Reseñas y estrellas', body: 'Cada servicio bien calificado suma a tu perfil público. Con el tiempo es tu currículum.' },
  { icon: MessageSquareQuote, title: 'Tu bio, a tu modo', body: 'Cuéntale a la gente a qué te dedicas y para qué juntas tus propinas.' },
  { icon: QrCode, title: 'Un QR que es tuyo', body: 'Descárgalo listo para imprimir, en español e inglés, o mándalo por WhatsApp.' },
  { icon: Wallet, title: 'Tu lana, a tu banco', body: 'Ves tu saldo y tus pagos en un solo panel. TIP-IT no retiene tu dinero.' },
];

const FAQ = [
  { q: '¿Necesito crear una cuenta para pagar?', a: 'No. Escaneas, eliges el monto y pagas. No pedimos nombre ni ningún dato.' },
  { q: '¿Cuánto cobra TIP-IT?', a: 'Una comisión pequeña por transacción (6% + $4), siempre visible antes de pagar. Quien envía el pago puede elegir cubrirla para que el trabajador reciba el 100%.' },
  { q: '¿Cómo recibo mi dinero?', a: 'Se transfiere directo a tu cuenta bancaria. TIP-IT no retiene el dinero en ningún momento. Tus primeros pagos pueden tardar unos días en liberarse; es normal en toda cuenta nueva.' },
  { q: '¿Dónde encuentro mi QR?', a: 'En tu cuenta, en “Mi código QR”. Lo descargas listo para imprimir o lo compartes por WhatsApp.' },
  { q: '¿TIP-IT guarda mi tarjeta?', a: 'Nunca. El pago lo procesa Stripe directamente: TIP-IT no ve ni almacena números de tarjeta.' },
  { q: '¿Y si quiero recibir pagos más adelante?', a: 'Sin problema. Pones una contraseña para proteger tu cuenta y conectas tu banco cuando quieras desde tu perfil.' },
  { q: 'No soy muy de apps… ¿me ayudan?', a: 'Claro. Déjanos tu WhatsApp y te ayudamos a armar tu cuenta y tu QR en persona, en unos 10 minutos.' },
];

/* ---------------------------------------------------------------- helpers */

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

// Wavy edge between two coloured bands. `className` sets the colour of the
// band BELOW the wave (via text-*), `bg-*` goes on the wrapper for the band above.
function Wave({ above, below, flip = false }) {
  return (
    <div className={above} aria-hidden>
      <svg
        viewBox="0 0 1440 70"
        preserveAspectRatio="none"
        className={`block h-8 w-full sm:h-14 ${below} ${flip ? 'scale-x-[-1]' : ''}`}
      >
        <path
          d="M0 30 C 180 70 360 0 540 28 S 900 66 1080 26 S 1340 10 1440 34 V70 H0Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function Squiggle({ className = '' }) {
  return (
    <svg
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      className={`absolute -bottom-2 left-0 h-2.5 w-full ${className}`}
      aria-hidden
    >
      <path
        d="M2 7 Q 14 0 26 7 T 50 7 T 74 7 T 98 7 T 122 7 T 146 7 T 170 7 T 198 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// "Pill" button with a hard offset shadow.
function Cta({ to, href, children, tone = 'ink', where, className = '' }) {
  const tones = {
    ink: 'bg-punch-ink text-punch-yellow shadow-[4px_4px_0_0_#FCE883] hover:shadow-[2px_2px_0_0_#FCE883]',
    orange: 'bg-punch-orange text-punch-ink shadow-[4px_4px_0_0_#0A2F2F] hover:shadow-[2px_2px_0_0_#0A2F2F]',
    white: 'bg-white text-punch-ink shadow-[4px_4px_0_0_#0A2F2F] hover:shadow-[2px_2px_0_0_#0A2F2F]',
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

function Eyebrow({ children, className = '' }) {
  return (
    <span
      className={`inline-block -rotate-2 rounded-full border-2 border-punch-ink bg-white px-4 py-1 font-display text-sm font-extrabold uppercase tracking-wider text-punch-ink ${className}`}
    >
      {children}
    </span>
  );
}

function SectionTitle({ eyebrow, children, className = '' }) {
  return (
    <div className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1] tracking-tight sm:text-5xl lg:text-6xl">
        {children}
      </h2>
    </div>
  );
}

/* ------------------------------------------------------------- phone mock */

// A worker's public tipping page, as the client sees it.
function PhoneMock() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[310px]">
      <div className="absolute -left-10 top-10 h-64 w-64 rounded-full border-2 border-punch-ink bg-punch-yellow sm:h-72 sm:w-72" />
      <div className="absolute -bottom-6 -right-8 h-40 w-40 rounded-full border-2 border-punch-ink bg-punch-pink" />

      <div className="relative rotate-2 rounded-[2.6rem] border-2 border-punch-ink bg-punch-ink p-2.5 shadow-[8px_8px_0_0_#0A2F2F]">
        <div className="rounded-[2.1rem] bg-punch-cream px-5 pb-6 pt-7 text-punch-ink">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-24 w-24 items-end justify-center overflow-hidden rounded-full border-2 border-punch-ink bg-punch-pink">
              <Person kind="stylist" size={92} />
            </span>
            <p className="mt-3 rounded-full border-2 border-punch-ink bg-punch-teal px-4 py-0.5 font-display text-lg font-extrabold text-white">
              Rafa
            </p>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-punch-ink/70">
              Barbero · Coyoacán
            </p>
            <p className="mt-1.5 text-xs leading-snug text-punch-ink/80">
              Cada propina me acerca a mi propia barbería. ¡Gracias por pasar!
            </p>
            <div className="mt-1.5 flex items-center gap-1 text-punch-orange">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
              ))}
              <span className="ml-1 text-xs font-semibold text-punch-ink/70">4.9</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center font-display text-base font-extrabold">
            <span className="rounded-2xl border-2 border-punch-ink bg-white py-1.5">$20</span>
            <span className="rounded-2xl border-2 border-punch-ink bg-punch-orange py-1.5 shadow-[3px_3px_0_0_#0A2F2F]">
              $50
            </span>
            <span className="rounded-2xl border-2 border-punch-ink bg-white py-1.5">$100</span>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-punch-ink/70">
            <span className="flex h-4 w-4 items-center justify-center rounded border-2 border-punch-ink bg-punch-yellow">
              <Check size={10} strokeWidth={4} />
            </span>
            Ayúdale a recibir el 100%
          </p>

          <div className="mt-3 rounded-full border-2 border-punch-ink bg-punch-teal py-2.5 text-center font-display text-base font-extrabold text-white">
            Dejar propina
          </div>
        </div>
      </div>

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
        className="absolute -bottom-5 -right-4 z-10 animate-floaty rounded-2xl border-2 border-punch-ink bg-punch-pink px-3.5 py-2.5 shadow-[4px_4px_0_0_#0A2F2F] [animation-delay:1.5s] motion-reduce:animate-none sm:-right-10"
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

/* ----------------------------------------------------------- pay-a-tip box */

// The "client" side of the app, right on the landing page: find someone by
// username or open the scanner.
function PayBox() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  const go = (e) => {
    e.preventDefault();
    const clean = username.trim().replace(/^@/, '');
    if (!clean) return;
    trackEvent('landing_find_worker');
    navigate(`/tip/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="relative z-20 mx-auto -mt-10 max-w-4xl px-5 sm:-mt-12">
      <div className="flex flex-col gap-5 rounded-[2rem] border-2 border-punch-ink bg-white p-5 shadow-[8px_8px_0_0_#0A2F2F] sm:flex-row sm:items-center sm:p-6">
        <div className="sm:w-2/5">
          <p className="font-display text-2xl font-extrabold leading-tight">¿Vas a dejar propina?</p>
          <p className="mt-1 text-sm font-medium text-punch-ink/70">
            Sin cuenta, sin descargar nada. Escanea o busca por username.
          </p>
        </div>
        <form onSubmit={go} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center rounded-full border-2 border-punch-ink bg-punch-cream px-4 focus-within:ring-2 focus-within:ring-punch-yellow">
            <Search size={18} className="shrink-0 text-punch-ink/60" />
            <span className="pl-2 text-punch-ink/50">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              aria-label="Username de quien quieres apoyar"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full bg-transparent px-1.5 py-3 text-punch-ink outline-none placeholder:text-punch-ink/40"
            />
          </div>
          <button
            type="submit"
            className="rounded-full border-2 border-punch-ink bg-punch-orange px-6 py-3 font-display font-extrabold shadow-[3px_3px_0_0_#0A2F2F] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#0A2F2F]"
          >
            Buscar
          </button>
          <Link
            to="/scan"
            onClick={() => trackEvent('landing_scan')}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-punch-ink bg-punch-yellow px-5 py-3 font-display font-extrabold transition hover:bg-punch-pink"
          >
            <ScanLine size={18} /> Escanear
          </Link>
        </form>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- the page */

export default function Home() {
  const { user, worker } = useAuth();
  const { hash } = useLocation();

  // Router hash links (#preguntas…) don't scroll by themselves.
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return undefined;
    }
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 60);
    return () => clearTimeout(t);
  }, [hash]);

  const myAccount = worker ? '/worker/dashboard' : '/scan';
  const signup = user ? myAccount : '/register?role=worker';

  return (
    <div className={`min-h-screen overflow-x-hidden bg-punch-cream font-sans text-punch-ink ${user ? 'pb-24 md:pb-0' : ''}`}>
      {/* ---------- Nav + Hero ---------- */}
      <div className="bg-punch-orange" id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-10 md:grid-cols-[1.15fr_1fr] md:pb-32 md:pt-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-punch-ink bg-punch-yellow px-4 py-1.5 font-display text-sm font-extrabold">
              <HandCoins size={16} />{' '}
              {user ? `Hola, ${user.name?.split(' ')[0] || 'bienvenido'}` : 'Únete a la revolución de las propinas'}
            </span>
            <h1 className="mt-6 font-display text-[2.6rem] font-extrabold leading-[0.97] tracking-tight sm:text-6xl lg:text-7xl">
              Cada vez hay menos cash.{' '}
              <span className="relative inline-block -rotate-1 rounded-2xl bg-punch-yellow px-3 pb-1">
                Que no se te vayan tus propinas.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg font-medium leading-relaxed sm:text-xl">
              Propinas digitales, simples y directas. Hoy casi nadie carga cambio: con tu QR único
              de TIP-IT tus clientes te dejan propina en segundos y tú ganas más.
            </p>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {user ? (
                <>
                  <Cta to={myAccount} where="hero" tone="ink" className="text-lg">
                    {worker ? 'Mi panel' : 'Pagar una propina'} <ArrowRight size={20} />
                  </Cta>
                  <Cta to={worker ? '/worker/qr' : '/history'} where="hero_2" tone="white" className="text-lg">
                    {worker ? 'Mi QR' : 'Mi historial'}
                  </Cta>
                </>
              ) : (
                <Cta to={signup} where="hero" tone="ink" className="text-lg">
                  Crea tu cuenta <ArrowRight size={20} />
                </Cta>
              )}
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

      <PayBox />

      <div className="mt-16">
        <Marquee />
      </div>

      {/* ---------- Qué es ---------- */}
      <section id="que-es" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <SectionTitle eyebrow="¿Qué es TIP-IT?">Tu propina, aunque nadie traiga efectivo.</SectionTitle>
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
                  className={`${p.bg} ${p.tilt} ${i % 2 ? 'sm:ml-10' : 'sm:mr-10'} rounded-3xl border-2 border-punch-ink p-5 shadow-[5px_5px_0_0_#0A2F2F]`}
                >
                  <p className="font-display text-2xl font-extrabold">{p.quote}</p>
                  <p className="mt-1 text-punch-ink/80">{p.note}</p>
                </div>
              </Reveal>
            ))}
            <p className="mt-2 font-display text-lg font-extrabold">
              Cada propina que no te dejan por falta de cash es dinero que se queda en la cartera
              de alguien más. Con TIP-IT eso se acaba.
            </p>
          </div>
        </div>
      </section>

      <Wave above="bg-punch-cream" below="text-punch-yellow" />

      {/* ---------- Cómo funciona ---------- */}
      <section id="como-funciona" className="bg-punch-yellow py-14 sm:py-20">
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
            <p className="mt-1 font-medium">Menos de un minuto, sin app y sin cuenta.</p>
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
            <Cta to={signup} where="steps" tone="ink" className="text-lg">
              {user ? 'Ir a mi cuenta' : 'Empieza ahora'} <ArrowRight size={20} />
            </Cta>
          </Reveal>
        </div>
      </section>

      <Wave above="bg-punch-yellow" below="text-punch-cream" flip />

      {/* ---------- Para quién ---------- */}
      <section id="para-quien" className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <Reveal>
          <SectionTitle eyebrow="¿Para quién?">
            Si das buen servicio,{' '}
            <span className="relative inline-block text-punch-teal">
              es para ti.
              <Squiggle className="text-punch-orange" />
            </span>
          </SectionTitle>
          <p className="mt-6 max-w-2xl text-lg font-medium">
            ¡Cualquiera que reciba propinas se beneficia! Estos son los que más nos escriben:
          </p>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {WHO.map(({ person, label, bg }, i) => (
            <Reveal key={label} delay={(i % 3) * 80}>
              <div
                className={`${bg} flex h-full flex-col items-start gap-4 rounded-3xl border-2 border-punch-ink p-5 shadow-[5px_5px_0_0_#0A2F2F] transition hover:-translate-y-1 hover:-rotate-1 sm:p-7`}
              >
                <span className="flex h-20 w-20 items-end justify-center overflow-hidden rounded-full border-2 border-punch-ink bg-punch-cream sm:h-24 sm:w-24">
                  {person ? (
                    <Person kind={person} size={96} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-punch-ink">
                      <HandCoins size={34} />
                    </span>
                  )}
                </span>
                <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Tu página ---------- */}
      <section className="border-y-2 border-punch-ink bg-punch-pink py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <SectionTitle eyebrow="Tu página">Tu perfil, tu estilo.</SectionTitle>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed">
              Cuando alguien escanea tu QR no ve un formulario aburrido: ve a ti.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="flex h-full items-start gap-4 rounded-3xl border-2 border-punch-ink bg-white p-5 shadow-[5px_5px_0_0_#0A2F2F]">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow">
                    <Icon size={22} />
                  </span>
                  <div>
                    <p className="font-display text-xl font-extrabold">{title}</p>
                    <p className="mt-1 font-medium leading-relaxed text-punch-ink/80">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Los números ---------- */}
      <section className="bg-punch-teal py-16 text-white sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <Eyebrow>Los números</Eyebrow>
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

          <p className="mt-8 text-center text-xs font-medium text-white/80">
            Solo ganamos cuando tú ganas: cobramos una comisión pequeña por propina recibida,
            siempre visible antes de pagar.{' '}
            <Link to="/#preguntas" className="font-extrabold underline underline-offset-2">
              Ver detalles
            </Link>
          </p>
        </div>
      </section>

      <Wave above="bg-punch-teal" below="text-punch-cream" />

      {/* ---------- FAQ ---------- */}
      <section id="preguntas" className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
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

      {/* ---------- Registro (la app, dentro de la página) ---------- */}
      <section id="registro" className="border-t-2 border-punch-ink bg-punch-orange py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-5 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <Eyebrow>Únete</Eyebrow>
            <h2 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
              Que tu próxima propina llegue aunque nadie traiga cash.
            </h2>
            <p className="mt-6 max-w-md text-lg font-medium leading-relaxed">
              Crea tu cuenta en un minuto. Después conectas tu banco, descargas tu QR y listo.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3">
                {['stylist', 'musician', 'cook', 'waiter'].map((k) => (
                  <span
                    key={k}
                    className="flex h-12 w-12 items-end justify-center overflow-hidden rounded-full border-2 border-punch-ink bg-punch-cream"
                  >
                    <Person kind={k} size={48} />
                  </span>
                ))}
              </div>
              <p className="text-sm font-semibold">Para quienes viven de dar buen servicio.</p>
            </div>
            <Link
              to="/unete?src=landing_ayuda"
              onClick={() => trackEvent('landing_cta', { where: 'help' })}
              className="mt-8 inline-block font-display text-base font-extrabold underline decoration-2 underline-offset-4"
            >
              Prefiero que me ayuden en persona →
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-[2rem] border-2 border-punch-ink bg-punch-cream p-6 shadow-[8px_8px_0_0_#0A2F2F] sm:p-8">
              {user ? (
                <div className="text-center">
                  <p className="font-display text-2xl font-extrabold">¡Ya estás dentro!</p>
                  <p className="mt-2 font-medium text-punch-ink/80">Entra a tu cuenta para ver tus propinas.</p>
                  <Cta to={myAccount} where="register_card" tone="ink" className="mt-6 w-full">
                    Ir a mi cuenta <ArrowRight size={18} />
                  </Cta>
                </div>
              ) : (
                <>
                  <p className="font-display text-2xl font-extrabold">Crea tu cuenta</p>
                  <p className="mt-1 text-sm font-medium text-punch-ink/70">
                    Gratis. Sin terminal. Sin compromiso.
                  </p>
                  <div className="mt-5">
                    <RegisterForm defaultRole="worker" />
                  </div>
                  <p className="mt-5 text-center text-sm font-medium">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="font-extrabold underline underline-offset-2">
                      Inicia sesión
                    </Link>
                  </p>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bg-punch-ink text-punch-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={40} />
              <span className="font-display text-2xl font-extrabold text-punch-yellow">TIP-IT</span>
            </div>
            <p className="mt-4 max-w-xs font-display text-lg font-extrabold text-punch-cream">
              Únete a la revolución de las propinas.
            </p>
            <p className="mt-2 max-w-xs text-sm text-punch-cream/70">
              Propinas digitales, simples y directas. Hecho en CDMX.
            </p>
          </div>
          <FooterCol title="TIP-IT">
            <a href="#que-es">Qué es</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#para-quien">Para quién</a>
            <a href="#preguntas">Preguntas</a>
          </FooterCol>
          <FooterCol title="La app">
            <Link to="/scan">Escanear un QR</Link>
            <Link to="/login">Iniciar sesión</Link>
            <Link to="/register?role=worker">Crear cuenta</Link>
            <Link to="/como-funciona">Guía de la app</Link>
          </FooterCol>
          <FooterCol title="Legal y contacto">
            <Link to="/terminos">Términos</Link>
            <Link to="/privacidad">Aviso de privacidad</Link>
            <a href="tel:+525580075613">¿Dudas? 55 8007 5613</a>
          </FooterCol>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-punch-cream/50">
          © {new Date().getFullYear()} TIP-IT · tipit.com.mx
        </p>
      </footer>
    </div>
  );
}

function FooterCol({ title, children }) {
  return (
    <div>
      <p className="font-display text-sm font-extrabold uppercase tracking-wider text-punch-yellow">{title}</p>
      <div className="mt-4 flex flex-col gap-2.5 text-sm font-medium [&>*]:text-punch-cream/80 [&>*:hover]:text-punch-yellow">
        {children}
      </div>
    </div>
  );
}
