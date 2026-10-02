import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
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
    <div className="page-shell md:!max-w-4xl">
      <PageHeader
        back={{ to: '/worker/dashboard', label: 'Mi panel' }}
        eyebrow="Tu reputación"
        title="Mis reseñas"
        subtitle="Lo que dicen de ti. Es tu currículum frente a nuevos clientes."
      />
      <div className="mt-4 flex items-center gap-2 text-amber-700">
        <Star size={18} fill="#FF8243" stroke="#FF8243" />
        <span className="font-semibold">
          {profile?.rating ? `${profile.rating} de 5` : 'Sin calificaciones aún'}
        </span>
        {profile?.ratingCount ? (
          <span className="text-sm text-slate-500">({profile.ratingCount})</span>
        ) : null}
      </div>

      <div className="mt-6 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {!profile?.reviews?.length ? (
          <EmptyState
            person="stylist"
            title="Aún no tienes reseñas"
            body="Aparecerán aquí en cuanto tus clientes califiquen tu servicio."
          />
        ) : (
          profile.reviews.map((r, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-100">{r.clientName}</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: r.rating || 0 }).map((_, s) => (
                    <Star key={s} size={14} fill="#FF8243" stroke="#FF8243" />
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
