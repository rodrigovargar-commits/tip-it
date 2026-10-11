import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, HandCoins, HeartHandshake, Share2, Star } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import Avatar from '../components/Avatar.jsx';
import IconBadge from '../components/IconBadge.jsx';
import ReviewList from '../components/ReviewList.jsx';
import { activityLabel } from '../utils/activities.js';

// A person's public page: who they are, what people say about them, and the
// two ways to say thanks — leave a tip, or recognise them without paying.
export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/workers/${username}`)
      .then(({ data }) => setWorker(data.worker))
      .catch((err) => {
        toast.error(getErrorMessage(err));
        navigate('/scan');
      })
      .finally(() => setLoading(false));
  }, [username, navigate]);

  const share = async () => {
    const url = `${window.location.origin}/p/${username}`;
    try {
      if (navigator.share) await navigator.share({ title: `${worker.name} en TIP-IT`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Enlace copiado');
      }
    } catch {
      // share sheet closed
    }
  };

  if (loading) {
    return (
      <div className="page-shell" aria-busy="true">
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="h-24 w-24 animate-pulse rounded-full bg-punch-pink/60" />
          <div className="h-5 w-40 animate-pulse rounded-full bg-punch-ink/10" />
          <div className="h-3 w-28 animate-pulse rounded-full bg-punch-ink/10" />
        </div>
      </div>
    );
  }
  if (!worker) return null;

  const detail = [activityLabel(worker.activity), worker.occupation].filter(Boolean).join(' · ');
  const firstName = (worker.name || worker.username).split(' ')[0];
  const reviewed = worker.reviews || [];

  return (
    <div className="page-shell">
      <div className="flex items-center justify-between">
        <Link to="/scan" className="flex items-center gap-1 text-sm text-slate-400">
          <ArrowLeft size={16} /> Volver
        </Link>
        <button type="button" onClick={share} aria-label="Compartir perfil" className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-punch-ink/40 text-slate-400 hover:border-punch-ink hover:text-punch-ink">
          <Share2 size={16} />
        </button>
      </div>

      <header className="mt-4 flex flex-col items-center text-center">
        <Avatar src={worker.avatarUrl} name={worker.name || worker.username} size={104} />
        <h1 className="mt-3 text-3xl font-extrabold">{worker.name || `@${worker.username}`}</h1>
        {detail && <p className="mt-0.5 text-sm font-semibold text-slate-400">{detail}</p>}
        {worker.establishment && <p className="text-xs text-slate-500">{worker.establishment}</p>}
        <p className="mt-2 flex items-center gap-1.5 text-sm">
          {worker.ratingCount > 0 ? (
            <>
              <Star size={15} fill="#FF8243" stroke="#FF8243" />
              <span className="font-bold">{worker.rating}</span>
              <span className="text-slate-500">({worker.ratingCount} {worker.ratingCount === 1 ? 'reseña' : 'reseñas'})</span>
            </>
          ) : (
            <span className="text-slate-500">Aún no hay valoraciones</span>
          )}
        </p>
        {worker.bio && <p className="mt-3 max-w-sm rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-300">“{worker.bio}”</p>}
      </header>

      <div className="mt-6 space-y-3">
        {worker.readyForTips ? (
          <Link to={`/tip/${worker.username}`} className="btn-primary w-full gap-2 text-lg">
            <HandCoins size={18} /> Dejar propina
          </Link>
        ) : (
          <p className="rounded-2xl border-2 border-punch-ink/25 bg-white p-3 text-center text-sm text-slate-400">
            Por ahora puedes reconocer su servicio.
          </p>
        )}
        <Link to={`/p/${worker.username}/reconocer`} className="btn-secondary w-full gap-2">
          <HeartHandshake size={17} /> Reconocer sin pago
        </Link>
      </div>

      <section className="mt-8" aria-labelledby="reviews-title">
        <div className="flex items-center gap-2">
          <IconBadge icon={Star} tone="orange" size={32} />
          <h2 id="reviews-title" className="font-display text-xl font-extrabold">
            Lo que dicen de {firstName}
          </h2>
        </div>
        {reviewed.length ? (
          <div className="mt-3">
            <ReviewList reviews={reviewed} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Aún no hay valoraciones. Sé la primera persona en reconocer su servicio.</p>
        )}
        {worker.thanksCount > 0 && (
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {worker.thanksCount} {worker.thanksCount === 1 ? 'agradecimiento' : 'agradecimientos'} sin comentario
          </p>
        )}
      </section>
    </div>
  );
}
