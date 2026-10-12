import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, BadgeCheck, HandCoins, MessageSquareText, Share2, Star } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import ReviewList from '../components/ReviewList.jsx';
import Avatar from '../components/Avatar.jsx';
import { activityLabel } from '../utils/activities.js';

const roundBtn =
  'flex h-10 w-10 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-cream/90 text-punch-ink backdrop-blur hover:bg-punch-yellow';

// A person's public page: their photo, who they are, what people say about
// them, and the two ways to say thanks — leave a tip, or recognise them
// without paying.
export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  // Photos saved before the higher-resolution upload are small; stretched over the
  // whole header they look blurry, so those are shown at their own size instead.
  const [smallPhoto, setSmallPhoto] = useState(false);

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
        <div className="-mx-5 h-64 animate-pulse bg-punch-pink/60 md:mx-0 md:rounded-3xl" />
        <div className="mt-6 space-y-3">
          <div className="h-6 w-44 animate-pulse rounded-full bg-punch-ink/10" />
          <div className="h-4 w-32 animate-pulse rounded-full bg-punch-ink/10" />
        </div>
      </div>
    );
  }
  if (!worker) return null;

  const name = worker.name || `@${worker.username}`;
  const firstName = name.split(' ')[0];
  const detail = [activityLabel(worker.activity), worker.occupation].filter(Boolean).join(' · ');
  const reviews = worker.reviews || [];
  const shown = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="page-shell !pt-0 md:!pt-8">
      {/* Photo: full width on a phone, a rounded card on a computer. */}
      <div className="relative -mx-5 h-72 overflow-hidden border-b-2 border-punch-ink bg-punch-pink md:mx-0 md:rounded-3xl md:border-2">
        {worker.avatarUrl && smallPhoto ? (
          <div className="flex h-full w-full items-center justify-center bg-punch-yellow">
            <img src={worker.avatarUrl} alt={`Foto de ${name}`} className="h-48 w-48 rounded-full border-4 border-punch-ink object-cover" />
          </div>
        ) : worker.avatarUrl ? (
          <img
            src={worker.avatarUrl}
            alt={`Foto de ${name}`}
            onLoad={(e) => setSmallPhoto(e.target.naturalWidth < 560)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-punch-yellow">
            <span aria-hidden="true" className="font-display text-9xl font-extrabold text-punch-ink/80">
              {name.replace('@', '')[0]?.toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link to="/scan" aria-label="Volver" className={roundBtn}>
            <ArrowLeft size={18} />
          </Link>
          <button type="button" onClick={share} aria-label="Compartir perfil" className={roundBtn}>
            <Share2 size={17} />
          </button>
        </div>
      </div>

      {/* Sheet that overlaps the photo, with the avatar on its edge. */}
      <div className="relative -mt-8 rounded-t-[2rem] border-2 border-b-0 border-punch-ink bg-punch-cream px-5 pb-2 pt-4 md:mx-4">
        <div className="flex items-end gap-4">
          <span className="-mt-14 rounded-full border-4 border-punch-cream bg-punch-pink">
            <Avatar src={worker.avatarUrl} name={name} size={84} />
          </span>
          <div className="min-w-0 pb-1">
            <h1 className="break-words text-2xl font-extrabold leading-tight">{name}</h1>
            {detail && <p className="truncate text-sm font-semibold text-slate-400">{detail}</p>}
            {worker.establishment && <p className="truncate text-xs text-slate-500">{worker.establishment}</p>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          {worker.ratingCount > 0 ? (
            <span className="flex items-center gap-1">
              <Star size={15} fill="#FF8243" stroke="#FF8243" />
              <span className="font-bold">{worker.rating}</span>
              <span className="text-slate-500">({worker.ratingCount})</span>
            </span>
          ) : (
            <span className="text-slate-500">Aún no hay valoraciones</span>
          )}
          {/* "Verificado" only means one thing: the person finished the identity and
              bank check with our payment provider, so tips can really reach them. */}
          {worker.readyForTips && (
            <span className="inline-flex items-center gap-1 rounded-full bg-punch-tealdark/10 px-2.5 py-0.5 text-xs font-bold text-punch-tealdark">
              <BadgeCheck size={14} /> Verificado
            </span>
          )}
        </div>

        {worker.bio && (
          <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-center text-sm italic text-slate-300">“{worker.bio}”</p>
        )}

        {worker.recognitionCount > 0 && (
          <div className="mt-4 grid grid-cols-2 divide-x-2 divide-punch-ink/15 rounded-2xl border-2 border-punch-ink/20 bg-white/70 py-2.5 text-center">
            <div>
              <p className="font-display text-xl font-extrabold">{worker.recognitionCount}</p>
              <p className="text-[11px] font-semibold text-slate-500">comentarios</p>
            </div>
            <div>
              <p className="font-display text-xl font-extrabold">{worker.ratingCount > 0 ? worker.rating : '—'}</p>
              <p className="text-[11px] font-semibold text-slate-500">calificación</p>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-sm font-bold text-slate-400">Un buen servicio merece ser reconocido.</p>
        <div className="mt-3 space-y-3">
          {worker.readyForTips ? (
            <Link to={`/tip/${worker.username}`} className="btn-primary w-full gap-2 text-lg">
              <HandCoins size={18} /> Dejar propina
            </Link>
          ) : (
            <p className="rounded-2xl border-2 border-punch-ink/25 bg-white p-3 text-center text-sm text-slate-400">
              Por ahora puedes dejar un comentario.
            </p>
          )}
          <Link
            to={`/p/${worker.username}/comentar`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-punch-ink bg-punch-ink px-6 py-3 font-display font-extrabold text-punch-yellow transition hover:bg-punch-ink/90"
          >
            <MessageSquareText size={17} /> Dejar un comentario
          </Link>
        </div>

        <section className="mt-8" aria-labelledby="reviews-title">
          <div className="flex items-baseline justify-between">
            <h2 id="reviews-title" className="font-display text-xl font-extrabold">
              Lo que dicen de {firstName}
            </h2>
            {reviews.length > 3 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm font-bold text-brand-400 underline underline-offset-2">
                {showAll ? 'Ver menos' : 'Ver todo'}
              </button>
            )}
          </div>
          {reviews.length ? (
            <div className="mt-3">
              <ReviewList reviews={shown} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Aún no hay valoraciones. Sé la primera persona en dejar un comentario.</p>
          )}
          {worker.thanksCount > 0 && (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {worker.thanksCount} {worker.thanksCount === 1 ? 'agradecimiento' : 'agradecimientos'} sin comentario
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
