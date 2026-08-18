import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const icon = {
  home: '🏠',
  scan: '📷',
  history: '🧾',
  profile: '👤',
};

export default function BottomNav() {
  const { user, worker } = useAuth();
  if (!user) return null;

  const homePath = worker ? '/worker/dashboard' : '/scan';

  const linkClass = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition ${
      isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <NavLink to={homePath} className={linkClass} end>
        <span className="text-lg">{icon.home}</span>
        Inicio
      </NavLink>
      <NavLink to="/scan" className={linkClass}>
        <span className="text-lg">{icon.scan}</span>
        Escanear
      </NavLink>
      <NavLink to="/history" className={linkClass}>
        <span className="text-lg">{icon.history}</span>
        Historial
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        <span className="text-lg">{icon.profile}</span>
        Perfil
      </NavLink>
    </nav>
  );
}
