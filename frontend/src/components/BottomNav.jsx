import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import useNavLinks from '../hooks/useNavLinks.js';

// Phone tab bar (hidden from md up, where the top bar carries the options).
export default function BottomNav() {
  const { user } = useAuth();
  const links = useNavLinks().filter((l) => !l.desktopOnly);
  if (!user) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-punch-ink bg-punch-cream pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Secciones"
    >
      <div className="mx-auto flex max-w-md px-2 py-1.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end className="flex flex-1 flex-col items-center gap-0.5 py-1">
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full border-2 transition ${
                    isActive
                      ? 'border-punch-ink bg-punch-yellow shadow-[2px_2px_0_0_#0A2F2F]'
                      : 'border-transparent text-punch-ink/70'
                  }`}
                >
                  <Icon size={19} strokeWidth={2.4} />
                </span>
                <span
                  className={`font-display text-[11px] font-extrabold ${
                    isActive ? 'text-punch-ink' : 'text-punch-ink/60'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
