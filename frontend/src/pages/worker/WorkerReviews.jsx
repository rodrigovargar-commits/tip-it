import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Star } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function WorkerReviews() {
  const { worker } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!worker) return;
    api
      .get(`/workers/${worker.username}`)
      .then(({ data }) => setProfile(data.worker))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [worker]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link to="/worker/dashboard" className="flex items-center gap-1 text-sm text-slate-400">
        <ArrowLeft size={16} />
        Volver
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Mis reseñas</h1>
      <div className="mt-2 flex items-center gap-2 text-amber-400">
        <Star size={18} fill="#fbbf24" stroke="#fbbf24" />
        <span className="font-semibold">
          {profile?.rating ? `${profile.rating} de 5` : 'Sin calificaciones aún'}
        </span>
        {profile?.ratingCount ? (
          <span className="text-sm text-slate-500">({profile.ratingCount})</span>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {!profile?.reviews?.length ? (
          <p className="mt-10 text-center text-sm text-slate-500">
            Todavía no tienes reseñas. Aparecerán aquí en cuanto tus clientes califiquen tu
            servicio.
          </p>
        ) : (
          profile.reviews.map((r, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-100">{r.clientName}</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: r.rating || 0 }).map((_, s) => (
                    <Star key={s} size={14} fill="#fbbf24" stroke="#fbbf24" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {new Date(r.createdAt).toLocaleDateString('es-MX', {
                  dateStyle: 'medium',
                })}
              </p>
              {r.review || r.comment ? (
                <p className="mt-2 text-sm text-slate-300">“{r.review || r.comment}”</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
