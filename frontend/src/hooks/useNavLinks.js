import { CircleUser, Home, LayoutDashboard, QrCode, Receipt, ScanLine, Store, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// One source of truth for the app's sections, shared by the top bar (desktop)
// and the bottom tab bar (phone). Order follows what each person does most:
// workers start from their panel and QR, everyone else from paying.
export default function useNavLinks() {
  const { user, worker } = useAuth();
  const inicio = { to: '/', label: 'Inicio', icon: Home };
  // Everyone signed in can reach the business portal: owners see their team, the rest see how to create one.
  // On the phone bar it only takes a tab for someone who owns a business and has no tip QR of their own
  // (with a QR the bar already has five tabs, so there it lives in Perfil and in Mi panel).
  const negocio = user
    ? [{ to: '/negocio', label: 'Mi negocio', icon: Store, desktopOnly: !user.ownsBusiness || Boolean(worker) }]
    : [];
  if (worker) {
    return [
      inicio,
      { to: '/worker/dashboard', label: 'Mi panel', icon: LayoutDashboard },
      { to: '/worker/qr', label: 'Mi QR', icon: QrCode },
      ...negocio,
      { to: '/scan', label: 'Pagar', icon: ScanLine },
      { to: '/history', label: 'Historial', icon: Receipt, desktopOnly: true },
      { to: '/contacts', label: 'Contactos', icon: Users, desktopOnly: true },
      { to: '/profile', label: 'Perfil', icon: CircleUser },
    ];
  }
  return [
    inicio,
    ...negocio,
    { to: '/scan', label: 'Pagar', icon: ScanLine },
    { to: '/history', label: 'Historial', icon: Receipt },
    { to: '/contacts', label: 'Contactos', icon: Users, desktopOnly: true },
    { to: '/profile', label: 'Perfil', icon: CircleUser },
  ];
}

// "The rest of the site", always reachable — also once you're logged in.
export const HELP_LINKS = [
  { href: '/', label: 'Página principal' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#para-quien', label: 'Para quién es' },
  { href: '/#preguntas', label: 'Preguntas frecuentes' },
  { href: '/#ayuda', label: 'Ayuda en persona' },
  { to: '/como-funciona', label: 'Guía de la app' },
];
