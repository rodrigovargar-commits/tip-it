import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LifeBuoy, LogOut, Menu, ScanLine, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import useNavLinks, { HELP_LINKS } from '../hooks/useNavLinks.js';
import Logo from './Logo.jsx';
import Avatar from './Avatar.jsx';

// Site-wide header: logo (always goes to the main page), the options right at
// the top, and the rest of the site (questions, how it works…) one tap away —
// also once you're signed in.
const HELP_IN_PERSON = { href: '/#ayuda', label: 'Ayuda en persona' };
const SITE_LINKS = [
  { href: '/#que-es', label: 'Qué es' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#para-quien', label: 'Para quién' },
  { href: '/#preguntas', label: 'Preguntas' },
];

// Hash links go through the router (not a full page load); Home scrolls to
// the section when the hash changes.
function HelpItem({ link, className, onClick }) {
  return (
    <Link to={link.to || link.href} onClick={onClick} className={className}>
      {link.label}
    </Link>
  );
}

export default function TopBar() {
  const { user, logout } = useAuth();
  const links = useNavLinks();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile menu
  const [helpOpen, setHelpOpen] = useState(false); // desktop "Ayuda"
  const helpRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setHelpOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!helpOpen) return undefined;
    const close = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [helpOpen]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const pill = ({ isActive }) =>
    `flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 font-display text-sm font-extrabold transition ${
      isActive
        ? 'border-punch-ink bg-punch-yellow text-punch-ink shadow-[2px_2px_0_0_#0A2F2F]'
        : 'border-transparent text-punch-ink/80 hover:border-punch-ink/30 hover:text-punch-ink'
    }`;
  const payingTip = pathname.startsWith('/tip/');
  const mobileItem =
    'rounded-2xl px-4 py-3 font-display text-lg font-extrabold hover:bg-punch-yellow';

  return (
    <header className="sticky top-0 z-50 border-b-2 border-punch-ink bg-punch-cream/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="TIP-IT, página principal">
          <Logo size={36} />
          <span className="font-display text-xl font-extrabold tracking-tight md:text-2xl">TIP-IT</span>
        </Link>

        {/* Desktop options (not while paying a tip: keep it simple) */}
        <nav className={`hidden items-center gap-1 ${payingTip ? '' : 'md:flex'}`} aria-label="Principal">
          {user ? (
            <>
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end className={pill}>
                  <Icon size={16} strokeWidth={2.4} />
                  {label}
                </NavLink>
              ))}
              <div className="relative ml-1" ref={helpRef}>
                <button
                  type="button"
                  onClick={() => setHelpOpen((o) => !o)}
                  aria-expanded={helpOpen}
                  className="flex items-center gap-1.5 rounded-full border-2 border-transparent px-3.5 py-1.5 font-display text-sm font-extrabold text-punch-ink/80 transition hover:border-punch-ink/30 hover:text-punch-ink"
                >
                  <LifeBuoy size={16} strokeWidth={2.4} /> Ayuda
                  <ChevronDown size={14} className={`transition ${helpOpen ? 'rotate-180' : ''}`} />
                </button>
                {helpOpen && (
                  <div className="absolute right-0 top-full mt-3 w-60 rounded-2xl border-2 border-punch-ink bg-white p-2 shadow-[5px_5px_0_0_#0A2F2F]">
                    {HELP_LINKS.filter((l) => !l.home).map((l) => (
                      <HelpItem
                        key={l.label}
                        link={l}
                        onClick={() => setHelpOpen(false)}
                        className="block rounded-xl px-3 py-2 font-display text-sm font-extrabold hover:bg-punch-yellow"
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            [...SITE_LINKS, ...[HELP_IN_PERSON].map((l) => ({ ...l, xl: true }))].map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className={`rounded-full px-3.5 py-1.5 font-display text-sm font-extrabold transition hover:bg-punch-yellow hover:text-punch-ink ${
                  l.xl ? 'hidden bg-punch-pink/60 text-punch-ink xl:inline' : 'text-punch-ink/80'
                }`}
              >
                {l.label}
              </Link>
            ))
          )}
        </nav>

        <div className={`flex items-center gap-2 md:gap-3 ${payingTip ? 'hidden' : ''}`}>
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
              <Link to="/login" className="hidden font-display text-sm font-extrabold hover:underline md:inline">
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

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-punch-ink bg-white md:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t-2 border-punch-ink bg-punch-cream px-4 pb-6 pt-3 md:hidden" aria-label="Menú">
          <div className="grid gap-1">
            {user ? (
              <>
                {HELP_LINKS.map((l) => (
                  <HelpItem key={l.label} link={l} onClick={() => setOpen(false)} className={mobileItem} />
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${mobileItem} flex items-center gap-2 text-left text-rose-700`}
                >
                  <LogOut size={18} /> Cerrar sesión
                </button>
              </>
            ) : (
              <>
                {[...SITE_LINKS, HELP_IN_PERSON].map((l) => (
                  <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className={mobileItem}>
                    {l.label}
                  </Link>
                ))}
                <Link to="/scan" className={mobileItem}>
                  Escanear un QR
                </Link>
                <Link to="/login" className={mobileItem}>
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
