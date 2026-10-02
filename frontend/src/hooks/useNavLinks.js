import { CircleUser, LayoutDashboard, QrCode, Receipt, ScanLine, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// One source of truth for the app's sections, shared by the top bar (desktop)
// and the bottom tab bar (phone). Order follows what each person does most:
// workers start from their panel and QR, everyone else from paying.
export default function useNavLinks() {
  const { worker } = useAuth();
  if (worker) {
    return [
      { to: '/worker/dashboard', label: 'Mi panel', icon: LayoutDashboard },
      { to: '/worker/qr', label: 'Mi QR', icon: QrCode },
      { to: '/scan', label: 'Pagar', icon: ScanLine },
      { to: '/contacts', label: 'Contactos', icon: Users, desktopOnly: true },
      { to: '/history', label: 'Historial', icon: Receipt },
      { to: '/profile', label: 'Perfil', icon: CircleUser },
    ];
  }
  return [
    { to: '/scan', label: 'Pagar', icon: ScanLine },
    { to: '/contacts', label: 'Contactos', icon: Users },
    { to: '/history', label: 'Historial', icon: Receipt },
    { to: '/profile', label: 'Perfil', icon: CircleUser },
  ];
}

// "The rest of the site", always reachable — also once you're logged in.
export const HELP_LINKS = [
  { href: '/', label: 'Página principal' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#para-quien', label: 'Para quién es' },
  { href: '/#preguntas', label: 'Preguntas frecuentes' },
  { to: '/como-funciona', label: 'Guía de la app' },
];
