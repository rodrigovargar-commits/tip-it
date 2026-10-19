import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Heart,
  LifeBuoy,
  CreditCard,
  Plus,
  ScanLine,
  Search,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { trackEvent } from '../utils/analytics.js';
import Logo, { LogoFull, Wordmark } from '../components/Logo.jsx';
import IconBadge from '../components/IconBadge.jsx';
import { Blob } from '../components/Decor.jsx';
import Person from '../components/Person.jsx';
import SignupSwitch from '../components/SignupSwitch.jsx';
import LeadForm from '../components/LeadForm.jsx';

// TIP-IT's public site AND front door of the app, all in one: marketing on
// top, and the real thing (pay a tip, create an account, log in) inside the
// same page. Palette: "Tropical punch" on warm cream. Playful on purpose —
// the people using it are barbers, musicians and food stalls, not executives.

const STEPS = [
  { n: '1', title: 'Crea tu QR gratis', body: 'Te registras y generamos tu QR con tu nombre.', bg: 'bg-punch-orange' },
  { n: '2', title: 'Ponlo donde atiendes', body: 'Imprímelo o mándalo por WhatsApp. Tus clientes lo escanean con su celular.', bg: 'bg-punch-pink' },
  { n: '3', title: 'Cobra y que se note', body: 'Recibes la propina directo en tu cuenta y tus reseñas hablan por ti.', bg: 'bg-punch-tealdark text-white' },
];

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
  { name: 'Carlos', role: 'Guía de turistas · CDMX', photo: '/personas/carlos.jpg', quote: 'Mis clientes me dejan más reseñas y eso me ha traído nuevos servicios.' },
  { name: 'Sofía', role: 'Estilista · Monterrey', photo: '/personas/sofia.jpg', quote: 'TIP-IT me permite recibir propinas sin efectivo y mis clientas me valoran.' },
  { name: 'Daniel', role: 'Cliente', photo: '/personas/daniel.jpg', quote: 'Es una forma fácil de agradecer. Siempre dejo una propina cuando tengo un buen servicio.' },
];

const FAQ = [
  { q: '¿Cuánto cobra TIP-IT?', a: 'Crear tu cuenta y tu QR es gratis. Por cada propina hay una comisión pequeña (6% + $4), siempre visible antes de pagar. Quien da la propina puede elegir cubrirla para que tú recibas el 100%.' },
  { q: '¿Cómo recibo mi dinero?', a: 'Se transfiere directo a tu cuenta bancaria. TIP-IT no retiene el dinero. Tus primeros pagos pueden tardar unos días en liberarse; es normal en toda cuenta nueva.' },
  { q: '¿Mi cliente necesita cuenta para dejarme propina?', a: 'No. Escanea, ve tu perfil, elige el monto y paga con Apple Pay, Google Pay o tarjeta. También puede dejarte un comentario sin pagar.' },
  { q: '¿TIP-IT guarda mi tarjeta?', a: 'Nunca. El pago lo procesa Stripe directamente: TIP-IT no ve ni almacena números de tarjeta.' },
  { q: 'No soy muy de apps… ¿me ayudan?', a: 'Claro. Déjanos tu correo y te ayudamos a armar tu cuenta y tu QR en persona.' },
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

    </div>
  );
}

/* ----------------------------------------------------------- pay-a-tip box */

// The "client" side of the app, right on the landing page: find someone by
// username or open the scanner.
function PayBox({ flat = false }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  const go = (e) => {
    e.preventDefault();
    const clean = username.trim().replace(/^@/, '');
    if (!clean) return;
    trackEvent('landing_find_worker');
    navigate(`/p/${encodeURIComponent(clean)}`);
  };

  return (
    <div className={`relative z-20 mx-auto max-w-4xl px-5 ${flat ? '' : '-mt-10 sm:-mt-12'}`}>
      <div className="flex flex-col gap-5 rounded-[2rem] border border-punch-ink/15 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(10,47,47,0.45)] sm:flex-row sm:items-center sm:p-6">
        <div className="sm:w-2/5">
          <p className="font-display text-2xl font-extrabold leading-tight">¿Quieres agradecer a alguien?</p>
          <p className="mt-1 text-sm font-medium text-punch-ink/70">
            Busca su perfil: ahí dejas un comentario o una propina. Sin cuenta, sin descargar nada.
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
            <h1 className="relative mt-6 font-display text-5xl font-extrabold leading-[1] tracking-tight sm:text-6xl lg:text-[4.4rem]">
              Cobra las propinas que{' '}
              <span className="box-decoration-clone rounded-xl bg-punch-yellow px-2">hoy se te van.</span>
            </h1>
            <p className="mt-7 max-w-xl text-xl font-bold leading-snug">
              Con un QR, tus clientes te dejan propina desde su celular, aunque no traigan efectivo.
            </p>
            <p className="mt-3 max-w-xl text-lg font-medium leading-relaxed text-punch-ink/70">
              Y tus reseñas hacen que tu buen servicio se note.
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
                  <a href="#como-funciona" className="font-display text-base font-extrabold underline decoration-2 underline-offset-4">
                    Cómo funciona
                  </a>
                </>
              )}
            </div>
            {!user && <p className="mt-4 text-sm font-semibold text-punch-ink/70">Gratis · sin terminal · en minutos</p>}
          </div>

          <Reveal>
            <PhoneMock />
          </Reveal>
        </section>
      </div>


      {/* ---------- Cómo funciona ---------- */}
      <section id="como-funciona" className="relative overflow-hidden py-16 sm:py-24">
        <Blob color="yellow" round className="-right-20 top-10 h-48 w-48 opacity-70" />
        <div className="relative mx-auto max-w-6xl px-5">
          <Reveal>
            <SectionTitle eyebrow="Cómo funciona">Tres pasos y ya estás cobrando.</SectionTitle>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className={`${s.bg} h-full rounded-3xl p-6 shadow-[0_14px_36px_-16px_rgba(10,47,47,0.4)]`}>
                  <span className="font-display text-7xl font-extrabold leading-none opacity-90">{s.n}</span>
                  <p className="mt-4 font-display text-2xl font-extrabold leading-tight">{s.title}</p>
                  <p className="mt-2 text-base font-medium leading-relaxed opacity-90">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          {!user && (
            <Reveal className="mt-8">
              <button type="button" onClick={openHelp} className="inline-flex items-center gap-2 font-display text-base font-extrabold underline decoration-2 underline-offset-4">
                <LifeBuoy size={18} /> ¿No te animas solo? Te ayudamos en persona
              </button>
            </Reveal>
          )}
        </div>
      </section>

      {/* ---------- En cualquier servicio ---------- */}
      <section id="para-quien" className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <Reveal>
          <SectionTitle eyebrow="Para quién">Para quien recibe propinas por su servicio.</SectionTitle>
        </Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SERVICES.map(({ person, photo, label, sub }, i) => (
            <Reveal key={label + sub} delay={(i % 4) * 70}>
              <li className="list-none">
                <div className="relative mx-auto aspect-[4/5] w-full max-w-[11rem] overflow-hidden rounded-3xl bg-punch-yellow/50 shadow-[0_10px_28px_-16px_rgba(10,47,47,0.45)]">
                  {photo ? (
                    <img src={photo} alt="" width="480" height="600" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Person kind={person || 'cook'} size={150} />
                  )}
                </div>
                <p className="mt-2 text-center font-display text-base font-extrabold leading-tight">
                  {label}
                  <span className="block font-sans text-xs font-semibold text-punch-ink/70">{sub}</span>
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
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
                <figure className="flex h-full flex-col overflow-hidden rounded-3xl bg-white/90 shadow-[0_12px_32px_-16px_rgba(10,47,47,0.35)]">
                  <img src={v.photo} alt={`${v.name}, ${v.role}`} width="480" height="480" loading="lazy" className="aspect-square w-full object-cover" />
                  <div className="flex flex-1 flex-col p-5">
                    <span className="flex gap-0.5" role="img" aria-label="5 de 5 estrellas">
                      {[0, 1, 2, 3, 4].map((k) => (
                        <Star key={k} size={16} fill="#F5B52E" stroke="#F5B52E" />
                      ))}
                    </span>
                    <blockquote className="mt-3 flex-1 text-sm font-medium leading-relaxed text-punch-ink/85">“{v.quote}”</blockquote>
                    <figcaption className="mt-4 leading-tight">
                      <span className="block text-sm font-extrabold">{v.name}</span>
                      <span className="block text-xs font-medium text-punch-ink/60">{v.role}</span>
                    </figcaption>
                  </div>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ¿Quieres agradecer a alguien? ---------- */}
      <section className="pb-6 pt-4">
        <PayBox flat />
      </section>

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
