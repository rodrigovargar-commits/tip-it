import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  Check,
  HandCoins,
  Heart,
  LifeBuoy,
  BedDouble,
  Camera,
  Car,
  Coins,
  CreditCard,
  Flag,
  Flower2,
  Stethoscope,
  Grid2x2,
  HeartPulse,
  Lock,
  MapPin,
  MessageSquareText,
  Music,
  Play,
  Pointer,
  Scissors,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Zap,
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
import Logo, { LogoFull, Wordmark } from '../components/Logo.jsx';
import IconBadge from '../components/IconBadge.jsx';
import { Blob, Sparks, Handwritten } from '../components/Decor.jsx';
import Person from '../components/Person.jsx';
import SignupSwitch from '../components/SignupSwitch.jsx';
import LeadForm from '../components/LeadForm.jsx';

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
  { n: '3', title: 'Comparte tu QR', body: 'Imprímelo, pégalo donde chambeas o compártelo por WhatsApp. Cada pago te llega directo.', bg: 'bg-punch-tealdark text-white' },
  { n: '4', title: 'Cobra y crece', body: 'Ve tu total recibido, tus reseñas y tu reputación desde un solo panel.', bg: 'bg-white' },
];

const CLIENT_FLOW = [
  { svg: 'qr', tone: 'yellow', title: 'Escanea o busca', body: 'el perfil de la persona.' },
  { svg: 'tap', tone: 'pink', title: 'Deja tu comentario', body: 'y/o una propina.' },
  { svg: 'card', tone: 'teal', title: 'Paga de forma segura', body: 'con Apple Pay, Google Pay o tarjeta.' },
  { svg: 'check', tone: 'orange', title: '¡Listo!', body: 'Tu pago queda confirmado y puedes dejar tu comentario.' },
];

// Who it is for, with the photos and captions from the brand sheet (files in
// /public/personas). If a photo is missing the card falls back to a drawing.
const SERVICES = [
  { person: 'barber', photo: '/personas/caddie.jpg', svg: 'golf-caddie', tone: 'yellow', label: 'Caddie', sub: 'en clubes de golf', note: 'Por una gran ronda.' },
  { person: 'stylist', photo: '/personas/belleza.jpg', svg: 'belleza', tone: 'pink', label: 'Belleza', sub: 'y estilistas', note: 'Por hacerte sentir increíble.' },
  { person: 'doctor', photo: '/personas/doctores.jpg', svg: 'medico', tone: 'teal', label: 'Doctores', sub: 'en farmacias', note: 'Por su atención y orientación.' },
  { person: 'guide', photo: '/personas/guias.jpg', svg: 'turismo', tone: 'orange', label: 'Guías', sub: 'de turistas', note: 'Por experiencias memorables.' },
  { person: 'waiter', photo: '/personas/valet.jpg', svg: 'valet', tone: 'teal', label: 'Valet', sub: 'de auto', note: 'Por su atención y cuidado.' },
  { person: 'stylist', photo: '/personas/spa.jpg', svg: 'spa', tone: 'pink', label: 'Personal', sub: 'de spa', note: 'Por tu bienestar.' },
  { person: 'cook', photo: '/personas/hoteleria.jpg', svg: 'recamarera', tone: 'orange', label: 'Recamareras', sub: 'y hotelería', note: 'Por un gran servicio.' },
  { person: null, photo: '/personas/cualquiera.jpg', svg: 'cualquier-servicio', tone: 'teal', label: 'Y cualquiera', sub: 'persona que dé un servicio', note: 'Todos los servicios merecen reconocimiento.' },
];

// What people have told us (the three quotes collected by the team), with the
// portraits and stars from the brand sheet.
const VOICES = [
  { name: 'Carlos', role: 'Guía de turistas · CDMX', photo: '/personas/carlos.png', quote: 'Mis clientes me dejan más reseñas y eso me ha traído nuevos servicios.' },
  { name: 'Sofía', role: 'Estilista · Monterrey', photo: '/personas/sofia.png', quote: 'TIP-IT me permite recibir propinas sin efectivo y mis clientas me valoran.' },
  { name: 'Daniel', role: 'Cliente', photo: '/personas/daniel.png', quote: 'Es una forma fácil de agradecer. Siempre dejo una propina cuando tengo un buen servicio.' },
];

const PILLARS = [
  { svg: 'heart', tone: 'yellow', title: 'Comentarios', body: 'Deja valoraciones y comentarios.' },
  { svg: 'coins', tone: 'orange', title: 'Recompensas', body: 'Propinas de forma rápida y segura.' },
  { svg: 'star', tone: 'pink', title: 'Reputación', body: 'Ayuda a fortalecer su perfil profesional.' },
  { svg: 'people', tone: 'teal', title: 'Oportunidades', body: 'Tus valoraciones pueden darte más visibilidad y nuevos clientes.' },
];

const NUMBERS = [
  { big: '$0', title: 'para crear tu cuenta', body: 'Tu cuenta y tu QR son gratis. No hay terminal que comprar.' },
  { big: '1 QR', title: 'para todos tus clientes', body: 'Uno solo, con tu nombre. Lo escanean con la cámara del celular, sin descargar nada.' },
  { big: 'Directo', title: 'a tu banco', body: 'TIP-IT no retiene tu dinero: va de tu cliente a tu cuenta.' },
];

const FEATURES = [
  { icon: QrCode, title: 'Un QR que es tuyo', body: 'Descárgalo listo para imprimir, en español e inglés, o mándalo por WhatsApp.' },
  { icon: Wallet, title: 'Tu lana, a tu banco', body: 'Ves tu saldo y tus pagos en un solo panel. TIP-IT no retiene tu dinero.' },
];

const FAQ = [
  { q: '¿Necesito crear una cuenta para pagar?', a: 'No. Escaneas, eliges el monto y pagas. No pedimos nombre ni ningún dato.' },
  { q: '¿Cuánto cobra TIP-IT?', a: 'Una comisión pequeña por transacción (6% + $4), siempre visible antes de pagar. Quien envía el pago puede elegir cubrirla para que la persona reciba el 100%.' },
  { q: '¿Cómo recibo mi dinero?', a: 'Se transfiere directo a tu cuenta bancaria. TIP-IT no retiene el dinero en ningún momento. Tus primeros pagos pueden tardar unos días en liberarse; es normal en toda cuenta nueva.' },
  { q: '¿Dónde encuentro mi QR?', a: 'En tu cuenta, en “Mi código QR”. Lo descargas listo para imprimir o lo compartes por WhatsApp.' },
  { q: '¿TIP-IT guarda mi tarjeta?', a: 'Nunca. El pago lo procesa Stripe directamente: TIP-IT no ve ni almacena números de tarjeta.' },
  { q: '¿Y si quiero recibir pagos más adelante?', a: 'Sin problema. Pones una contraseña para proteger tu cuenta y conectas tu banco cuando quieras desde tu perfil.' },
  { q: 'No soy muy de apps… ¿me ayudan?', a: 'Claro. Déjanos tu correo y te ayudamos a armar tu cuenta y tu QR en persona, en unos 10 minutos.' },
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
    ink: 'bg-punch-ink text-white hover:bg-punch-ink/90',
    orange: 'bg-punch-orange text-punch-ink shadow-[0_4px_0_0_#0A2F2F] hover:shadow-[0_2px_0_0_#0A2F2F]',
    white: 'bg-white/80 text-punch-ink hover:bg-punch-yellow',
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

// A person's public page and checkout, as the client sees it (illustrative).
function PhoneMock() {
  return (
    <div className="relative mx-auto w-[285px] sm:w-[310px]">
      {/* the big pastel shapes behind the phone (brand sheet) */}
      <img
        src="/art/backgrounds/hero-shapes.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 w-[640px] max-w-none -translate-x-[46%] -translate-y-[52%]"
      />

      <Handwritten className="-right-4 -top-14 w-36 -rotate-6 text-right sm:-right-16">
        Rápido
        <br />
        Seguro
        <br />
        Sin efectivo
      </Handwritten>

      <div className="relative rotate-1 rounded-[2.6rem] border-[3px] border-punch-ink bg-punch-ink p-2 shadow-[0_30px_60px_-20px_rgba(10,47,47,0.55)]">
        <div className="rounded-[2.2rem] bg-punch-cream px-4 pb-5 pt-4 text-punch-ink">
          <p className="mb-2 text-center text-[9px] font-extrabold uppercase tracking-widest text-punch-ink/50">
            Ejemplo ilustrativo
          </p>
          <div className="flex justify-center">
            <LogoFull size={22} />
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <img src="/personas/mariana.png" alt="" width="48" height="48" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            <div className="min-w-0 leading-tight">
              <p className="font-display text-base font-extrabold">Mariana</p>
              <p className="text-[11px] font-medium text-punch-ink/60">Terapeuta de spa · CDMX</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white p-0.5 text-center font-display text-[11px] font-extrabold">
            <span className="rounded-full bg-punch-yellow py-1.5">Dejar propina</span>
            <span className="py-1.5 text-punch-ink/70">Comentar</span>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center font-display text-sm font-extrabold">
            <span className="rounded-xl border border-punch-ink/25 bg-white py-2">$20</span>
            <span className="rounded-xl border-2 border-punch-ink bg-punch-orange py-2">$50</span>
            <span className="rounded-xl border border-punch-ink/25 bg-white py-2">$100</span>
          </div>
          <div className="mt-1.5 rounded-xl border border-punch-ink/25 bg-white py-2 text-center text-[12px] font-bold">
            $ Otro monto
          </div>

          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white p-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-punch-tealdark text-[11px] font-extrabold text-white">
              %
            </span>
            <span className="flex-1 text-[10px] font-semibold leading-tight">Apoya para que reciba el 100% de tu propina</span>
            <span className="relative h-4 w-8 shrink-0 rounded-full bg-punch-tealdark">
              <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white" />
            </span>
          </div>

          <div className="mt-2.5 rounded-xl bg-punch-ink py-2.5 text-center text-[13px] font-bold text-white">Pagar con Apple Pay</div>
          <div className="mt-1.5 rounded-xl border border-punch-ink/25 bg-white py-2.5 text-center text-[13px] font-bold">Pagar con Google Pay</div>
          <div className="mt-1.5 flex items-center gap-1.5 rounded-xl border border-punch-ink/15 bg-white/70 px-3 py-2 text-[11px] font-semibold text-punch-ink/70">
            <CreditCard size={13} /> Pagar con tarjeta
          </div>
        </div>
      </div>

      <div
        style={{ '--r': '5deg' }}
        className="absolute -right-6 top-16 z-10 w-36 animate-floaty rounded-2xl bg-white p-3 shadow-[0_14px_30px_-10px_rgba(10,47,47,0.35)] motion-reduce:animate-none sm:-right-24"
      >
        <span className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-punch-ink text-punch-orange">
          <Heart size={16} fill="currentColor" />
        </span>
        <p className="font-display text-sm font-extrabold leading-tight">¡Gracias por tu servicio!</p>
        <div className="mt-1.5 flex gap-0.5 text-punch-orange">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
          ))}
        </div>
      </div>

      <div
        style={{ '--r': '-3deg' }}
        className="absolute -bottom-6 -right-6 z-10 w-44 animate-floaty rounded-2xl bg-white p-3 shadow-[0_14px_30px_-10px_rgba(10,47,47,0.35)] [animation-delay:1.5s] motion-reduce:animate-none sm:-right-24"
      >
        <p className="flex items-center gap-1.5 font-display text-sm font-extrabold">
          <MessageSquareText size={15} className="text-punch-tealdark" /> Tú decides
        </p>
        <p className="mt-1 text-[11px] font-medium leading-snug text-punch-ink/80">
          Deja un comentario, una propina o las dos cosas.
        </p>
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
      <div className="flex flex-col gap-5 rounded-[2rem] border border-punch-ink/15 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(10,47,47,0.45)] sm:flex-row sm:items-center sm:p-6">
        <div className="sm:w-2/5">
          <p className="font-display text-2xl font-extrabold leading-tight">¿Vas a dejar propina?</p>
          <p className="mt-1 text-sm font-medium text-punch-ink/70">
            Sin cuenta, sin descargar nada. Escanea o busca por username.
          </p>
        </div>
        <form onSubmit={go} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center rounded-full border-2 border-punch-ink bg-punch-cream px-4 focus-within:ring-2 focus-within:ring-punch-yellow">
            <Search size={18} className="shrink-0 text-punch-ink/70" />
            <span className="pl-2 text-punch-ink/70">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              aria-label="Username de quien quieres apoyar"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full bg-transparent px-1.5 py-3 text-punch-ink outline-none placeholder:text-punch-ink/70"
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
  // "solo" = create the account yourself, "ayuda" = leave a contact and we help in person.
  const [tab, setTab] = useState('solo');

  // Router hash links (#preguntas…) don't scroll by themselves. #ayuda opens
  // the "help me in person" tab of the sign-up card.
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return undefined;
    }
    let id = hash.slice(1);
    if (id === 'ayuda') {
      setTab('ayuda');
      id = 'registro';
    }
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView(), 60);
    return () => clearTimeout(t);
  }, [hash]);

  const openHelp = () => {
    setTab('ayuda');
    document.getElementById('registro')?.scrollIntoView();
  };

  const myAccount = worker ? '/worker/dashboard' : '/scan';
  const signup = user ? myAccount : '/register?role=worker';

  return (
    <div className={`min-h-screen overflow-x-hidden bg-punch-cream font-sans text-punch-ink ${user ? 'pb-24 md:pb-0' : ''}`}>
      {/* ---------- Hero ---------- */}
      <div className="relative overflow-hidden bg-punch-cream" id="top">
        <section className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 pb-20 pt-10 md:grid-cols-[1.05fr_1fr] md:pb-28 md:pt-16">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-punch-orange bg-punch-yellow px-4 py-1.5 font-display text-xs font-extrabold uppercase tracking-wider">
              {user ? `Hola, ${user.name?.split(' ')[0] || 'bienvenido'}` : 'Tu servicio vale'}
            </span>
            <h1 className="relative mt-6 font-display text-[3.6rem] font-extrabold leading-[0.92] tracking-tight sm:text-7xl lg:text-[6.2rem]">
              Que se
              <br />
              reconozca.
              <img
                src="/art/illustrations/accent-rays.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 right-0 hidden h-16 w-16 sm:block lg:right-10"
              />
            </h1>
            <p className="mt-7 max-w-xl text-xl font-bold leading-snug">
              TIP-IT es la plataforma de reconocimiento digital para personas que brindan servicios.
            </p>
            <p className="mt-3 max-w-xl text-lg font-medium leading-relaxed text-punch-ink/70">
              Recibe propinas, valoraciones y comentarios que fortalecen tu reputación y generan más oportunidades.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {user ? (
                <>
                  <Cta to={myAccount} where="hero" tone="ink" className="text-lg">
                    {worker ? 'Mi panel' : 'Dejar una propina'} <ArrowRight size={20} />
                  </Cta>
                  <Cta to={worker ? '/worker/qr' : '/history'} where="hero_2" tone="white" className="text-lg">
                    {worker ? 'Mi QR' : 'Mi historial'}
                  </Cta>
                </>
              ) : (
                <>
                  <Cta to={signup} where="hero" tone="ink" className="text-lg">
                    Crear mi QR gratis <ArrowRight size={20} />
                  </Cta>
                  <a
                    href="#como-funciona"
                    className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-punch-ink bg-white/80 px-6 py-3.5 font-display text-lg font-extrabold transition hover:bg-punch-yellow"
                  >
                    <Play size={16} fill="currentColor" /> Conoce cómo funciona
                  </a>
                </>
              )}
            </div>
            <ul className="mt-10 grid max-w-2xl grid-cols-2 gap-x-5 gap-y-5 text-left lg:grid-cols-4">
              {[
                ['bolt', 'yellow', 'En segundos', 'Sin registros complicados'],
                ['lock', 'pink', 'Pago seguro', 'Apple Pay, Google Pay o tarjeta'],
                ['star', 'yellow', 'Más que propinas', 'Comentarios y reputación'],
                ['growth', 'pink', 'Cualquier servicio', 'Funciona en cualquier lugar'],
              ].map(([svg, tone, title, body]) => (
                <li key={title} className="flex items-start gap-2.5">
                  <IconBadge svg={svg} tone={tone} size={36} />
                  <span className="leading-tight">
                    <span className="block font-display text-sm font-extrabold">{title}</span>
                    <span className="mt-0.5 block text-xs font-medium text-punch-ink/70">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            {!user && (
              <button
                type="button"
                onClick={openHelp}
                className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-punch-ink bg-white/80 px-4 py-2 font-display text-sm font-extrabold transition hover:bg-punch-yellow"
              >
                <LifeBuoy size={16} /> ¿No te animas solo? Te ayudamos en persona
              </button>
            )}
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
                  className={`${p.bg} ${p.tilt} ${i % 2 ? 'sm:ml-10' : 'sm:mr-10'} rounded-3xl border border-punch-ink/15 p-5 shadow-[0_12px_32px_-16px_rgba(10,47,47,0.4)]`}
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

      {/* ---------- Cómo funciona ---------- */}
      <section id="como-funciona" className="relative overflow-hidden py-14 sm:py-20">
        <Blob color="yellow" round className="-right-20 top-10 h-48 w-48 opacity-70" />
        <div className="relative mx-auto max-w-6xl px-5">
          <Reveal>
            <SectionTitle eyebrow="Cómo funciona">Cuatro pasos, listo en segundos.</SectionTitle>
          </Reveal>

          <Reveal className="mt-10">
            <ol className="grid gap-5 rounded-[2rem] bg-white/80 p-6 shadow-[0_14px_40px_-18px_rgba(10,47,47,0.35)] sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)] lg:items-start lg:gap-3 lg:p-8">
              {CLIENT_FLOW.map(({ svg, tone, title, body }, i) => (
                <li key={title} className="flex items-start gap-3 lg:relative">
                  <span className="flex shrink-0 items-center gap-2">
                    {i === 0 && (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-punch-yellow font-display text-lg font-extrabold">
                        1
                      </span>
                    )}
                    <IconBadge svg={svg} tone={tone} size={i === 3 ? 56 : 48} />
                  </span>
                  <span className="leading-snug">
                    <span className="block font-display text-base font-extrabold">{title}</span>
                    <span className="mt-0.5 block text-sm font-medium text-punch-ink/70">{body}</span>
                  </span>
                  {i < 3 && <ArrowRight aria-hidden="true" size={18} className="absolute -right-2 top-4 hidden text-punch-ink/40 lg:block" />}
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal className="mt-16">
            <p className="font-display text-2xl font-extrabold sm:text-3xl">Y si recibes propinas, así empiezas.</p>
            <p className="mt-1 font-medium text-punch-ink/70">Cuatro pasos y ya estás cobrando.</p>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className={`${s.bg} ${i % 2 ? 'lg:mt-8' : ''} h-full rounded-3xl p-6 shadow-[0_14px_36px_-16px_rgba(10,47,47,0.4)]`}>
                  <span className="font-display text-7xl font-extrabold leading-none opacity-90">{s.n}</span>
                  <p className="mt-4 font-display text-2xl font-extrabold leading-tight">{s.title}</p>
                  <p className="mt-2 text-base font-medium leading-relaxed opacity-90">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center">
            <Cta to={signup} where="steps" tone="ink" className="text-lg">
              {user ? 'Ir a mi cuenta' : 'Empieza ahora'} <ArrowRight size={20} />
            </Cta>
          </Reveal>
          {!user && (
            <Reveal className="mt-10">
              <div className="flex flex-col items-center gap-4 rounded-3xl bg-punch-yellow/60 p-6 text-center sm:flex-row sm:text-left">
                <IconBadge icon={LifeBuoy} tone="pink" size={56} />
                <div className="flex-1">
                  <p className="font-display text-2xl font-extrabold">¿Te late pero no te animas solo?</p>
                  <p className="mt-1 font-medium text-punch-ink/70">
                    Déjanos tu correo y te ayudamos a armar tu cuenta y tu QR en persona, en unos 10 minutos.
                  </p>
                </div>
                <button type="button" onClick={openHelp} className="btn-primary shrink-0">
                  Quiero ayuda en persona
                </button>
              </div>
            </Reveal>
          )}
        </div>
      </section>



      {/* ---------- En cualquier servicio ---------- */}
      <section id="para-quien" className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <Reveal>
          <SectionTitle eyebrow="En cualquier servicio">Reconoce el buen servicio, en todas partes.</SectionTitle>
          <p className="mt-5 max-w-2xl text-lg font-medium text-punch-ink/80">
            TIP-IT conecta a las personas que brindan servicios con quienes valoran su trabajo.
          </p>
        </Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8 lg:gap-3">
          {SERVICES.map(({ person, photo, svg, tone, label, sub, note }, i) => (
            <Reveal key={label + sub} delay={(i % 4) * 70}>
              <li className="list-none">
                <div className="relative flex h-40 items-end justify-center overflow-hidden rounded-3xl bg-punch-yellow/50 shadow-[0_10px_28px_-16px_rgba(10,47,47,0.45)]">
                  {photo ? (
                    <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Person kind={person || 'cook'} size={150} />
                  )}
                </div>
                <div className="relative -mt-5 ml-2">
                  <IconBadge svg={svg} tone={tone} size={40} className="ring-4 ring-punch-cream" />
                </div>
                <p className="mt-1.5 font-display text-sm font-extrabold leading-tight">
                  {label}
                  <span className="block font-sans text-xs font-semibold text-punch-ink/70">{sub}</span>
                </p>
                <p className="mt-1 text-xs font-medium leading-snug text-punch-ink/60">{note}</p>
              </li>
            </Reveal>
          ))}
        </ul>
        <p className="mt-8 text-sm font-semibold text-punch-ink/70">
          Y también barberos, músicos de calle, meseros y bartenders, puestos de comida y cualquier persona que dé un buen servicio.
        </p>
      </section>

      {/* ---------- Más que propinas ---------- */}
      <section className="relative overflow-hidden py-14 sm:py-20">
        <Blob color="pink" className="-left-24 bottom-0 h-72 w-72 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-5">
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.6fr]">
            <Reveal>
              <div className="rounded-[2rem] bg-punch-yellow/70 p-7 sm:p-9">
                <Eyebrow>Más que propinas</Eyebrow>
                <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1] tracking-tight sm:text-5xl">
                  Una plataforma de reconocimiento.
                </h2>
                <p className="mt-5 text-base font-medium leading-relaxed text-punch-ink/80">
                  TIP-IT te permite agradecer, recompensar y construir la reputación de las personas que hacen mejores
                  experiencias en tu día a día.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {PILLARS.map(({ svg, tone, title, body }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="text-center">
                    <IconBadge svg={svg} tone={tone} size={84} className="mx-auto" />
                    <p className="mt-4 font-display text-lg font-extrabold">{title}</p>
                    <p className="mt-1 text-sm font-medium leading-snug text-punch-ink/70">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="flex h-full items-start gap-4 rounded-3xl bg-white/80 p-5 shadow-[0_12px_32px_-16px_rgba(10,47,47,0.35)]">
                  <IconBadge icon={icon} tone={i ? 'teal' : 'orange'} size={48} />
                  <div>
                    <p className="font-display text-lg font-extrabold">{title}</p>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-punch-ink/70">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Voces ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[0.8fr_2fr]">
          <Reveal>
            <Eyebrow>Historias reales</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1] tracking-tight sm:text-5xl">
              Pequeños gestos, grandes historias.
            </h2>
            <p className="mt-4 text-base font-medium text-punch-ink/70">
              Esto nos han dicho quienes dan y reciben propinas.
            </p>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {VOICES.map((v, i) => (
              <Reveal key={v.name} delay={i * 90}>
                <figure className="h-full rounded-3xl bg-white/90 p-5 shadow-[0_12px_32px_-16px_rgba(10,47,47,0.35)]">
                  <div className="flex items-start gap-3">
                    <img src={v.photo} alt="" width="48" height="48" loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0">
                      <blockquote className="text-sm font-medium leading-relaxed text-punch-ink/85">“{v.quote}”</blockquote>
                      <figcaption className="mt-3 leading-tight">
                        <span className="block text-sm font-extrabold">{v.name}</span>
                        <span className="block text-xs font-medium text-punch-ink/60">{v.role}</span>
                      </figcaption>
                      <span className="mt-2 flex gap-0.5" role="img" aria-label="5 de 5 estrellas">
                        {[0, 1, 2, 3, 4].map((k) => (
                          <Star key={k} size={15} fill="#F5B52E" stroke="#F5B52E" />
                        ))}
                      </span>
                    </div>
                  </div>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Los números ---------- */}
      <section className="bg-punch-tealdark py-16 text-white sm:py-24">
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
                <div className="h-full rounded-3xl border border-punch-ink/15 bg-punch-tealdark p-7 shadow-[0_14px_36px_-16px_rgba(10,47,47,0.4)] ring-2 ring-white/20">
                  <p className="font-display text-5xl font-extrabold text-punch-yellow sm:text-6xl">{c.big}</p>
                  <p className="mt-2 font-display text-xl font-extrabold">{c.title}</p>
                  <p className="mt-3 text-lg leading-relaxed text-white">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mt-8 text-center text-xs font-medium text-white">
            Solo ganamos cuando tú ganas: cobramos una comisión pequeña por propina recibida,
            siempre visible antes de pagar.{' '}
            <Link to="/#preguntas" className="font-extrabold underline underline-offset-2">
              Ver cómo cobramos
            </Link>
          </p>
        </div>
      </section>

      <Wave above="bg-punch-tealdark" below="text-punch-cream" />

      {/* ---------- FAQ ---------- */}
      <section id="preguntas" className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <Reveal>
          <SectionTitle eyebrow="Preguntas">Lo que todos nos preguntan.</SectionTitle>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-punch-ink/15 bg-white px-5 py-4 shadow-[0_10px_28px_-14px_rgba(10,47,47,0.4)] open:bg-punch-yellow"
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
            <Eyebrow>Únete a TIP-IT</Eyebrow>
            <h2 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
              Tu servicio también merece ser reconocido.
            </h2>
            <p className="mt-6 max-w-md text-lg font-medium leading-relaxed">
              Crea tu cuenta en un minuto. Después conectas tu banco, descargas tu QR y listo.
            </p>
            <p className="mt-3 text-sm font-bold">Cuenta gratis · Sin contratos · En minutos</p>
            <div className="relative mt-8 hidden h-72 sm:block">
              <img src="/art/backgrounds/cta-shapes.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -left-8 bottom-[-2rem] h-full w-auto max-w-none" />
              <img
                src="/art/illustrations/professional-final.svg"
                alt=""
                aria-hidden="true"
                className="absolute bottom-[-2rem] left-24 h-[18rem] w-auto"
              />
              <p className="absolute bottom-6 left-0 max-w-[10rem] text-sm font-bold leading-snug">Para quienes viven de dar buen servicio.</p>
            </div>
            {!user && (
              <button
                type="button"
                onClick={() => {
                  trackEvent('landing_cta', { where: 'help' });
                  setTab('ayuda');
                }}
                className="mt-8 inline-block text-left font-display text-base font-extrabold underline decoration-2 underline-offset-4"
              >
                Prefiero que me ayuden en persona →
              </button>
            )}
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-[2rem] border-2 border-punch-ink bg-punch-cream p-6 shadow-[0_24px_60px_-24px_rgba(10,47,47,0.45)] sm:p-8">
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
                  <div className="grid grid-cols-2 gap-2 rounded-full border-2 border-punch-ink bg-white p-1" role="tablist">
                    {[
                      ['solo', 'Lo hago yo'],
                      ['ayuda', 'Quiero ayuda'],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        onClick={() => setTab(id)}
                        className={`rounded-full py-2 font-display text-sm font-extrabold transition ${
                          tab === id ? 'bg-punch-orange shadow-[2px_2px_0_0_#0A2F2F] ring-2 ring-punch-ink' : 'text-punch-ink/70'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {tab === 'solo' ? (
                    <>
                      <p className="mt-5 font-display text-2xl font-extrabold">Crea tu cuenta</p>
                      <p className="mt-1 text-sm font-medium text-punch-ink/70">
                        Gratis. Sin terminal. Sin compromiso.
                      </p>
                      <div className="mt-5">
                        <SignupSwitch defaultRole="worker" />
                      </div>
                      <p className="mt-5 text-center text-sm font-medium">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="font-extrabold underline underline-offset-2">
                          Inicia sesión
                        </Link>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-5 font-display text-2xl font-extrabold">Te ayudamos en persona</p>
                      <p className="mt-1 text-sm font-medium text-punch-ink/70">
                        Déjanos tu correo y coordinamos para armar tu cuenta y tu QR.
                      </p>
                      <div className="mt-5">
                        <LeadForm source="landing_ayuda" />
                      </div>
                    </>
                  )}
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
            <span className="inline-flex items-center gap-2.5">
              <Logo size={40} onDark />
              <Wordmark onDark className="text-2xl" />
            </span>
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
