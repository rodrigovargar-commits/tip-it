import { NavLink } from 'react-router-dom';
import { Home, QrCode, Users, Receipt, CircleUser } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

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
        <Home size={20} strokeWidth={2} />
        Inicio
      </NavLink>
      <NavLink to="/scan" className={linkClass}>
        <QrCode size={20} strokeWidth={2} />
        Escanear
      </NavLink>
      <NavLink to="/contacts" className={linkClass}>
        <Users size={20} strokeWidth={2} />
        Contactos
      </NavLink>
      <NavLink to="/history" className={linkClass}>
        <Receipt size={20} strokeWidth={2} />
        Historial
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        <CircleUser size={20} strokeWidth={2} />
        Perfil
      </NavLink>
    </nav>
  );
}
