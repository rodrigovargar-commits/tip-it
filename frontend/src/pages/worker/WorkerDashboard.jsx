import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QrCode, MessageSquareText, ShieldAlert } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../../components/Spinner.jsx';
import Avatar from '../../components/Avatar.jsx';

export default function WorkerDashboard() {
  const { user, worker } = useAuth();
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
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatarUrl} name={user?.name} size={48} />
          <div>
            <p className="text-sm text-slate-400">Hola,</p>
            <h1 className="text-xl font-bold">@{worker.username}</h1>
          </div>
        </div>
        <Link to="/worker/qr" className="btn-secondary flex items-center gap-1.5 !px-4 !py-2 text-sm">
          <QrCode size={16} />
          Mi QR
        </Link>
      </div>

      {stripeStatus && !stripeStatus.onboardingComplete && (
        <div className="mt-6 card flex gap-3 border-amber-600/40 bg-amber-500/10">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold text-amber-300">Activa tus pagos</p>
            <p className="mt-1 text-sm text-amber-200/80">
              Conecta tu cuenta de Stripe para poder recibir tus pagos directo a tu banco.
            </p>
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="btn-primary mt-3 w-full !bg-amber-500 hover:!bg-amber-600"
            >
              {connecting ? 'Redirigiendo...' : 'Conectar con Stripe'}
            </button>
          </div>
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
          <p className="text-xs uppercase tracking-wide text-slate-500">Pagos recibidos</p>
          <p className="mt-1 text-2xl font-bold">{stats?.tipCount || 0}</p>
        </div>
        <Link to="/worker/reviews" className="card col-span-2 transition hover:border-brand-600/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Reputación</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {stats?.rating ? `${stats.rating} ★` : 'Sin calificaciones aún'}
              </p>
              {stats?.ratingCount ? (
                <p className="text-xs text-slate-500">{stats.ratingCount} reseñas</p>
              ) : null}
            </div>
            <MessageSquareText size={20} className="text-slate-500" />
          </div>
        </Link>
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
