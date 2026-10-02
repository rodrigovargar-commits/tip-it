import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CircleUser, Menu, Receipt, ScanLine, Users, X, Home as HomeIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import Avatar from './Avatar.jsx';

// Site-wide header. On desktop the options live right at the top (landing
// sections when logged out, app sections when logged in); on phones logged-in
// users keep the bottom tab bar and everyone gets a hamburger for the rest.
const SITE_LINKS = [
  { href: '/#que-es', label: 'Qué es' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#para-quien', label: 'Para quién' },
  { href: '/#preguntas', label: 'Preguntas' },
];

export default function TopBar() {
  const { user, worker } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // Own header / full-screen flows.
  if (pathname.startsWith('/unete')) return null;

  const homePath = worker ? '/worker/dashboard' : '/scan';
  const appLinks = [
    { to: homePath, label: 'Inicio', icon: HomeIcon, end: true },
    { to: '/scan', label: 'Escanear', icon: ScanLine },
    { to: '/contacts', label: 'Contactos', icon: Users },
    { to: '/history', label: 'Historial', icon: Receipt },
    { to: '/profile', label: 'Perfil', icon: CircleUser },
  ];

  const pill = ({ isActive }) =>
    `flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 font-display text-sm font-extrabold transition ${
      isActive
        ? 'border-punch-ink bg-punch-yellow text-punch-ink'
        : 'border-transparent text-punch-ink/80 hover:border-punch-ink/30 hover:text-punch-ink'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b-2 border-punch-ink bg-punch-cream/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <Logo size={36} />
          <span className="font-display text-xl font-extrabold tracking-tight md:text-2xl">TIP-IT</span>
        </Link>

        {/* Desktop options */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {user
            ? appLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={pill}>
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))
            : SITE_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3.5 py-1.5 font-display text-sm font-extrabold text-punch-ink/80 transition hover:bg-punch-yellow hover:text-punch-ink"
                >
                  {l.label}
                </a>
              ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <Link to="/profile" aria-label="Mi perfil" className="flex items-center gap-2">
              <Avatar src={user.avatarUrl} name={user.name} size={36} />
              <span className="hidden max-w-[8rem] truncate text-sm font-semibold lg:inline">
                {user.name?.split(' ')[0]}
              </span>
            </Link>
          ) : (
            <>
              <Link
                to="/scan"
                className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-sm font-extrabold text-punch-ink/80 hover:bg-punch-yellow lg:flex"
              >
                <ScanLine size={16} /> Escanear
              </Link>
              <Link
                to="/login"
                className="hidden font-display text-sm font-extrabold hover:underline md:inline"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register?role=worker"
                className="rounded-full border-2 border-punch-ink bg-punch-ink px-4 py-2 font-display text-sm font-extrabold text-punch-yellow shadow-[3px_3px_0_0_#FCE883] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#FCE883]"
              >
                Crea tu cuenta
              </Link>
            </>
          )}

          {!user && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-punch-ink bg-white md:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {open && !user && (
        <nav
          className="border-t-2 border-punch-ink bg-punch-cream px-4 pb-5 pt-3 md:hidden"
          aria-label="Menú"
        >
          <div className="grid gap-1">
            {SITE_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 font-display text-lg font-extrabold hover:bg-punch-yellow"
              >
                {l.label}
              </a>
            ))}
            <Link to="/scan" className="rounded-2xl px-4 py-3 font-display text-lg font-extrabold hover:bg-punch-yellow">
              Escanear un QR
            </Link>
            <Link to="/login" className="rounded-2xl px-4 py-3 font-display text-lg font-extrabold hover:bg-punch-yellow">
              Iniciar sesión
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
