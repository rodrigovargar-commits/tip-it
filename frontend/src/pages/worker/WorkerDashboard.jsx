import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function WorkerDashboard() {
  const { worker } = useAuth();
  const [stats, setStats] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!worker) return;
    (async () => {
      try {
        const [statsRes, stripeRes] = await Promise.all([
          api.get(`/workers/${worker._id}/stats`),
          api.get('/workers/stripe/status'),
        ]);
        setStats(statsRes.data.stats);
        setStripeStatus(stripeRes.data);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [worker]);

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const { data } = await api.post('/workers/stripe/onboarding-link');
      window.location.href = data.url;
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Hola,</p>
          <h1 className="text-2xl font-bold">@{worker.username}</h1>
        </div>
        <Link to="/worker/qr" className="btn-secondary !px-4 !py-2 text-sm">
          Ver mi QR
        </Link>
      </div>

      {stripeStatus && !stripeStatus.onboardingComplete && (
        <div className="mt-6 card border-amber-600/40 bg-amber-500/10">
          <p className="font-semibold text-amber-300">Activa tus pagos</p>
          <p className="mt-1 text-sm text-amber-200/80">
            Conecta tu cuenta de Stripe para poder recibir propinas directo a tu banco.
          </p>
          <button
            onClick={handleConnectStripe}
            disabled={connecting}
            className="btn-primary mt-3 w-full !bg-amber-500 hover:!bg-amber-600"
          >
            {connecting ? 'Redirigiendo...' : 'Conectar con Stripe'}
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total recibido</p>
          <p className="mt-1 text-2xl font-bold">
            {(stats?.totalReceived || 0).toLocaleString('es-MX', {
              style: 'currency',
              currency: 'MXN',
            })}
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Propinas</p>
          <p className="mt-1 text-2xl font-bold">{stats?.tipCount || 0}</p>
        </div>
        <div className="card col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Rating promedio</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {stats?.rating ? `${stats.rating} ★` : 'Sin calificaciones aún'}
          </p>
          {stats?.ratingCount ? (
            <p className="text-xs text-slate-500">{stats.ratingCount} calificaciones</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/worker/qr" className="btn-secondary">
          Mi código QR
        </Link>
        <Link to="/history" className="btn-secondary">
          Ver historial
        </Link>
      </div>
    </div>
  );
}
