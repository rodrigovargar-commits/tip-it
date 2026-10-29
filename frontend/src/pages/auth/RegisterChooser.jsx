import { Link, useNavigate } from 'react-router-dom';
import { User, Users, ChevronRight } from 'lucide-react';
import AuthLayout from '../../components/AuthLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { trackEvent } from '../../utils/analytics.js';

// First screen of "Crear mi QR": who is it for? One person starts exactly as
// before; a business gets an account for its owner, a code for the team and a
// portal with the team's tips, stars and reviews (never the money).
export default function RegisterChooser() {
  const { user, worker } = useAuth();
  const navigate = useNavigate();

  const pick = (who) => {
    trackEvent('signup_choice', { who });
    if (who === 'me') navigate(user ? (worker ? '/worker/qr' : '/worker/setup') : '/register?role=worker');
    else navigate(user ? '/negocio' : '/register?role=team');
  };

  const options = [
    {
      id: 'me',
      icon: User,
      title: 'Para mí',
      text: 'Soy barbero, estilista, músico, guía... Quiero mi QR para recibir propinas y reseñas.',
      tone: 'bg-punch-yellow',
    },
    {
      id: 'team',
      icon: Users,
      title: 'Para mi equipo',
      text: 'Tengo un negocio. Quiero un código para mis colaboradores y ver cómo les va: propinas, estrellas y reseñas.',
      tone: 'bg-punch-pink',
    },
  ];

  return (
    <AuthLayout
      title="Crear mi QR"
      subtitle="¿Para quién es?"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-400">
            Inicia sesión
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        {options.map(({ id, icon: Icon, title, text, tone }) => (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            className={`group flex w-full items-center gap-4 rounded-3xl border-2 border-punch-ink p-5 text-left shadow-[4px_4px_0_0_#0A2F2F] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0A2F2F] active:translate-y-0.5 active:shadow-none ${tone}`}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-punch-ink bg-white">
              <Icon size={26} strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl font-extrabold leading-tight">{title}</span>
              <span className="mt-1 block text-sm font-medium leading-snug">{text}</span>
            </span>
            <ChevronRight size={22} className="shrink-0 transition group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
      <Link to="/scan" className="mt-6 block text-center text-sm font-semibold text-slate-400 underline underline-offset-2">
        Solo quiero dar propinas (no necesitas cuenta)
      </Link>
    </AuthLayout>
  );
}
