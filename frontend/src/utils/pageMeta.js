// Per-route <title>, description and indexing rules. The site is a single-page
// app, so these are applied on every navigation by components/RouteMeta.jsx.
const SITE = 'https://www.tipit.com.mx';
const DEFAULT_DESC =
  'Cada vez hay menos cash. Con tu QR de TIP-IT, tus clientes te dejan propina con tarjeta o Apple Pay y te llega directo a tu banco.';

const PUBLIC = {
  '/': {
    title: 'TIP-IT — Que no se te vayan tus propinas',
    description: DEFAULT_DESC,
  },
  '/unete': {
    title: 'Quiero mi QR gratis — TIP-IT',
    description:
      'Barberos, músicos de calle y puestos de comida: déjanos tu WhatsApp o correo y te ayudamos a armar tu cuenta y tu QR en persona.',
  },
  '/como-funciona': {
    title: 'Cómo funciona TIP-IT — Guía de la app',
    description: 'Dar o recibir propinas con TIP-IT toma menos de un minuto: escanea, elige el monto y paga.',
  },
  '/terminos': {
    title: 'Términos y condiciones — TIP-IT',
    description: 'Las reglas de uso de TIP-IT: cuentas, comisión, pagos y responsabilidades.',
  },
  '/privacidad': {
    title: 'Aviso de privacidad — TIP-IT',
    description: 'Qué datos recopila TIP-IT, para qué los usa, con quién los comparte y cómo ejercer tus derechos ARCO.',
  },
  '/register': {
    title: 'Crea tu cuenta gratis — TIP-IT',
    description: 'Crea tu cuenta, conecta tu banco y recibe propinas con tu QR único. Gratis para empezar.',
  },
  '/login': {
    title: 'Iniciar sesión — TIP-IT',
    description: 'Entra a tu cuenta de TIP-IT.',
    noindex: true,
  },
};

const PRIVATE_TITLES = [
  ['/worker', 'Mi cuenta — TIP-IT'],
  ['/profile', 'Perfil — TIP-IT'],
  ['/history', 'Historial — TIP-IT'],
  ['/contacts', 'Contactos — TIP-IT'],
  ['/scan', 'Escanear un QR — TIP-IT'],
  ['/tip/', 'Dejar propina — TIP-IT'],
];

export function metaFor(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if (PUBLIC[clean]) {
    return { ...PUBLIC[clean], canonical: `${SITE}${clean === '/' ? '/' : clean}` };
  }
  const priv = PRIVATE_TITLES.find(([prefix]) => clean.startsWith(prefix));
  if (priv) return { title: priv[1], description: DEFAULT_DESC, noindex: true, canonical: null };
  return { title: 'Página no encontrada — TIP-IT', description: DEFAULT_DESC, noindex: true, canonical: null };
}
