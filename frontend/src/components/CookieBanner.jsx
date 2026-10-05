import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { getConsent, loadAnalytics, setConsent } from '../utils/consent.js';
import { trackPageView } from '../utils/analytics.js';
import { useAuth } from '../context/AuthContext.jsx';

// Cookie notice. Essential storage (login session) needs no consent; Google
// Analytics does, so it stays off until "Aceptar".
export default function CookieBanner() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [choice, setChoice] = useState(() => getConsent());

  // Returning visitor who already accepted: start analytics right away.
  useEffect(() => {
    if (choice === 'granted') loadAnalytics();
  }, [choice]);

  if (choice) return null;

  const decide = (value) => {
    setConsent(value);
    setChoice(value);
    if (value === 'granted') setTimeout(() => trackPageView(pathname), 400);
  };

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className={`fixed inset-x-3 z-[60] mx-auto max-w-xl rounded-3xl border-2 border-punch-ink bg-white p-4 shadow-[5px_5px_0_0_#0A2F2F] sm:p-5 md:bottom-4 ${
        user ? 'bottom-24' : 'bottom-3'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow">
          <Cookie size={18} />
        </span>
        <div className="flex-1">
          <p className="font-display text-base font-extrabold">¿Nos ayudas a mejorar?</p>
          <p className="mt-1 text-sm font-medium text-slate-400">
            Usamos cookies de analítica (Google Analytics) para saber qué páginas sirven. Sin
            ellas todo funciona igual.{' '}
            <Link to="/privacidad#cookies" className="font-bold underline underline-offset-2">
              Más información
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => decide('granted')} className="btn-primary !px-5 !py-2 text-sm">
              Aceptar
            </button>
            <button type="button" onClick={() => decide('denied')} className="btn-secondary !px-5 !py-2 text-sm">
              Solo necesarias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
