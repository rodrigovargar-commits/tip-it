import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QrCode, MessageSquareText, ShieldAlert, Store, Zap } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../../components/Spinner.jsx';
import Avatar from '../../components/Avatar.jsx';

function formatMXN(cents) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WorkerDashboard() {
  const { user, worker } = useAuth();
  const [stats, setStats] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [payingOut, setPayingOut] = useState(false);
  const [memberships, setMemberships] = useState(undefined); // undefined = loading
  const pendingCode = (() => {
    try { return localStorage.getItem('tipit_join_code') || ''; } catch { return ''; }
  })();

  useEffect(() => {
    if (!worker) return;
    api
      .get('/business/memberships')
      .then(({ data }) => setMemberships(data.memberships))
      .catch(() => setMemberships([]));
  }, [worker]);

  const leave = async (m) => {
    const what = m.kind === 'event' ? 'este evento' : m.business;
    if (!window.confirm(`¿Salir de ${what}? Dejará de ver tus propinas, estrellas y reseñas, y su QR se quita de tu lista.`)) return;
    try {
      await api.post('/business/leave', { membershipId: m.id });
      setMemberships((list) => list.filter((x) => x.id !== m.id));
      toast.success('Saliste');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const loadBalance = () => {
    api
      .get('/workers/stripe/balance')
      .then(({ data }) => setBalance(data))
      .catch((err) => toast.error(getErrorMessage(err)));
  };

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
        if (stripeRes.data.onboardingComplete) loadBalance();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleInstantPayout = async () => {
    if (!balance?.instantAvailable) return;
    const confirmed = window.confirm(
      `Vas a retirar ${formatMXN(balance.instantAvailable)} de inmediato. Stripe cobra una comisión extra por retiro instantáneo (se descuenta del monto). ¿Continuar?`
    );
    if (!confirmed) return;

    setPayingOut(true);
    try {
      await api.post('/workers/stripe/instant-payout');
      toast.success('Retiro en camino — llega en minutos');
      loadBalance();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPayingOut(false);
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
    <div className="page-shell md:!max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatarUrl} name={user?.name} size={48} />
          <div>
            <p className="text-sm font-semibold text-slate-400">¡Qué bueno verte!</p>
            <h1 className="text-2xl font-extrabold md:text-3xl">@{worker.username}</h1>
          </div>
        </div>
        <Link to="/worker/qr" className="btn-secondary flex items-center gap-1.5 !px-4 !py-2 text-sm">
          <QrCode size={16} />
          Mi QR
        </Link>
      </div>

      {stripeStatus && !stripeStatus.onboardingComplete && (
        <div className="mt-6 card flex gap-3 !bg-punch-yellow">
          <ShieldAlert size={22} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-display text-lg font-extrabold">Activa tus pagos</p>
            <p className="mt-1 text-sm font-medium">
              Conecta tu banco (una sola vez) para recibir tus propinas directo en tu cuenta.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              Tip: tus primeros pagos pueden tardar unos días en liberarse — es una verificación
              normal para cuentas nuevas, no un error. Después de eso, cobras todos los días.
            </p>
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="btn-primary mt-3 w-full"
            >
              {connecting ? 'Redirigiendo...' : 'Conectar mi banco'}
            </button>
            <p className="mt-3 text-center text-sm font-medium">
              ¿No sabes tu RFC o tu CLABE?{' '}
              <a href="/guia/#datos" target="_blank" rel="noopener" className="font-bold underline underline-offset-2">
                Mira la guía
              </a>
            </p>
          </div>
        </div>
      )}

      {stripeStatus?.onboardingComplete && stripeStatus.requirementsDue?.length > 0 && (
        <div className="mt-6 card flex gap-3 border-red-600/40 bg-red-500/10">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-600">Stripe necesita más información</p>
            <p className="mt-1 text-sm text-red-800">
              Tus pagos están detenidos hasta que completes esto en Stripe:{' '}
              {stripeStatus.requirementsDue.join(', ')}
            </p>
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="btn-primary mt-3 w-full !bg-red-500 hover:!bg-red-600"
            >
              {connecting ? 'Redirigiendo...' : 'Completar en Stripe'}
            </button>
          </div>
        </div>
      )}

      {stripeStatus?.onboardingComplete && balance && (
        <div className="mt-6 card !bg-punch-tealdark !text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-white">Saldo disponible</p>
          <p className="mt-1 font-display text-4xl font-extrabold text-punch-yellow">{formatMXN(balance.available)}</p>
          {balance.pending > 0 && (
            <p className="mt-1 text-sm text-white">
              + {formatMXN(balance.pending)} pendiente de liberarse
              {balance.nextAvailableAt && (
                <> — el próximo cae el {formatDate(balance.nextAvailableAt)}</>
              )}
            </p>
          )}
          {balance.instantAvailable > 0 ? (
            <button
              onClick={handleInstantPayout}
              disabled={payingOut}
              className="btn-secondary mt-3 flex w-full items-center justify-center gap-1.5 !py-2 text-sm"
            >
              <Zap size={14} />
              {payingOut
                ? 'Procesando...'
                : `Retirar ${formatMXN(balance.instantAvailable)} ahora (comisión extra)`}
            </button>
          ) : (
            <p className="mt-2 text-xs text-white">
              {balance.pending > 0
                ? 'Sin retiro instantáneo disponible todavía para ese monto pendiente.'
                : 'Se deposita solo, todos los días — no hay nada pendiente ahora mismo.'}
            </p>
          )}
          {stats?.tipCount > 0 && stats.tipCount <= 3 && (
            <p className="mt-2 text-xs text-white">
              Tus primeros pagos tardan un poco más en liberarse (verificación de cuenta nueva).
              Después de eso, todo cae diario.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        <div className="card !bg-punch-pink">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total recibido</p>
          <p className="mt-1 break-words text-xl font-bold sm:text-2xl">
            {(stats?.totalReceived || 0).toLocaleString('es-MX', {
              style: 'currency',
              currency: 'MXN',
            })}
          </p>
        </div>
        <div className="card !bg-punch-yellow">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pagos recibidos</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{stats?.tipCount || 0}</p>
        </div>
        <Link to="/worker/reviews" className="card col-span-2 transition hover:-translate-y-0.5 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Reputación</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
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

      {memberships !== undefined && (
        <div className="mt-6 card">
          <p className="flex items-center gap-2 font-display text-lg font-extrabold">
            <Store size={20} className="shrink-0" /> {memberships.length ? 'Mis negocios y eventos' : '¿Trabajas en un negocio o en un evento?'}
          </p>
          {memberships.length > 0 && (
            <ul className="mt-3 grid gap-3">
              {memberships.map((m) => {
                const since = new Date(m.joinedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
                const ended = m.state === 'ended';
                return (
                  <li key={m.id} className="rounded-2xl bg-punch-yellow/50 p-3">
                    <p className="font-display font-extrabold">
                      {m.business}{m.location && m.location !== 'Principal' ? ` · ${m.location}` : ''}
                      {m.kind === 'event' && <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold">{ended ? 'Evento terminado' : 'Evento'}</span>}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">
                      {m.scope === 'all'
                        ? `Cuentan todas tus propinas y reseñas desde el ${since}.`
                        : `Cuenta lo que llegue por tu QR de ${m.qr?.name || 'esta empresa'}, desde el ${since}.`}
                      {' '}No ven cuánto dinero recibes.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Link to="/worker/qr" className="text-sm font-bold underline underline-offset-2">Ver mi QR</Link>
                      <button type="button" onClick={() => leave(m)} className="text-sm font-bold text-rose-700 underline underline-offset-2">Salir</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-sm text-slate-500">
            {memberships.length ? 'Puedes unirte a más con otro código.' : 'Únete con el código que te dio quien lo administra. Recibes un QR de la empresa, además del tuyo.'}
          </p>
          <Link to={pendingCode ? `/negocio/unirme?c=${pendingCode}` : '/negocio/unirme'} className="btn-secondary mt-2 !py-2 text-sm">
            {pendingCode ? 'Terminar de unirme' : 'Tengo un código'}
          </Link>
        </div>
      )}

      <Link to="/negocio" className="mt-6 card flex items-center justify-between gap-3 !bg-punch-pink transition hover:-translate-y-0.5">
        <div>
          <p className="font-display text-lg font-extrabold">{user?.ownsBusiness ? 'Mi negocio' : '¿Tienes un equipo?'}</p>
          <p className="text-sm font-medium">
            {user?.ownsBusiness
              ? 'Abre el portal con tu equipo, sus propinas, estrellas y reseñas.'
              : 'Crea tu negocio, comparte un código y conoce cómo les va a tus colaboradores.'}
          </p>
        </div>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/worker/qr" className="btn-primary">
          Mi código QR
        </Link>
        <Link to="/history" className="btn-secondary">
          Ver historial
        </Link>
      </div>
    </div>
  );
}
