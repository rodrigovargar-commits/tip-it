import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, BadgeCheck, CalendarDays, HandCoins, Heart, MessageSquareText, Share2, Star, Users } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import ReviewList from '../components/ReviewList.jsx';
import Avatar from '../components/Avatar.jsx';
import { activityLabel } from '../utils/activities.js';
import { takeWorkerPrefetch } from '../utils/prefetch.js';

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
    let alive = true;
    (async () => {
      try {
        // The page's own <script> already asked for this person when the link opened.
        const pre = takeWorkerPrefetch(username);
        if (pre) {
          try {
            const r = await pre;
            if (r.ok && r.data?.worker) {
              if (alive) setWorker(r.data.worker);
              return;
            }
          } catch {
            // fall through to the normal request
          }
        }
        const { data } = await api.get(`/workers/${username}`);
        if (alive) setWorker(data.worker);
      } catch (err) {
        toast.error(getErrorMessage(err));
        navigate('/scan');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
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
  const latest = reviews.find((r) => r.review || r.comment) || reviews[0] || {};
  const latestText = latest.review || latest.comment || '';
  // Only real numbers: each one appears when there is data behind it.
  const stats = [
    worker.recognitionCount > 0 && { icon: Users, value: worker.recognitionCount, label: 'comentarios' },
    worker.positivePercent !== null && worker.positivePercent !== undefined && { icon: Heart, value: `${worker.positivePercent}%`, label: 'lo recomendarían' },
    worker.yearsExperience > 0 && { icon: CalendarDays, value: worker.yearsExperience, label: worker.yearsExperience === 1 ? 'año de experiencia' : 'años de experiencia' },
  ].filter(Boolean);

  return (
    <div className="page-shell !pt-0 md:!pt-8">
      {/* Photo: about a quarter of the screen, so the profile itself gets the room. */}
      <div className="relative -mx-5 h-[25svh] min-h-[170px] overflow-hidden border-b-2 border-punch-ink bg-punch-pink md:mx-0 md:rounded-3xl md:border-2">
        {worker.avatarUrl && smallPhoto ? (
          <div className="flex h-full w-full items-center justify-center bg-punch-yellow">
            <img src={worker.avatarUrl} alt={`Foto de ${name}`} className="h-28 w-28 rounded-full border-4 border-punch-ink object-cover" />
          </div>
        ) : worker.avatarUrl ? (
          <img
            src={worker.avatarUrl}
            alt={`Foto de ${name}`}
            onLoad={(e) => setSmallPhoto(e.target.naturalWidth < 560)}
            className="h-full w-full object-cover object-[50%_22%]"
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
      <div className="relative -mt-8 rounded-t-[2rem] bg-punch-cream px-5 pb-2 pt-4 shadow-[0_-12px_30px_-18px_rgba(10,47,47,0.4)] md:mx-4">
        <div className="flex items-end gap-4">
          <span className="-mt-14 rounded-full border-4 border-punch-cream bg-punch-pink">
            <Avatar src={worker.avatarUrl} name={name} size={84} />
          </span>
          <div className="min-w-0 pb-1">
            <h1 className="break-words text-3xl font-extrabold leading-tight">{name}</h1>
            {detail && <p className="truncate text-base font-semibold text-slate-400">{detail}</p>}
            {worker.establishment && <p className="truncate text-xs text-slate-500">{worker.establishment}</p>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-base">
          {worker.ratingCount > 0 ? (
            <span className="flex items-center gap-1">
              <Star size={20} fill="#FF8243" stroke="#FF8243" />
              <span className="font-display text-xl font-extrabold">{worker.rating}</span>
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
          <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-center text-base italic text-slate-300">“{worker.bio}”</p>
        )}

        {stats.length > 0 && (
          <dl className="mt-4 grid divide-x divide-punch-ink/15 rounded-2xl bg-white/80 py-3 text-center" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="px-1">
                <Icon size={22} className="mx-auto text-punch-orange" aria-hidden="true" />
                <dd className="mt-1 font-display text-2xl font-extrabold">{value}</dd>
                <dt className="text-xs font-semibold leading-tight text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>
        )}

        <section className="mt-6" aria-labelledby="reviews-title">
          <div className="flex items-baseline justify-between">
            <h2 id="reviews-title" className="font-display text-2xl font-extrabold">
              Lo que dicen de {firstName}
            </h2>
            {reviews.length > 1 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm font-bold text-brand-400 underline underline-offset-2">
                {showAll ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>
          {reviews.length ? (
            showAll ? (
              <div className="mt-3">
                <ReviewList reviews={reviews} />
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm shadow-[0_8px_24px_-14px_rgba(10,47,47,0.35)]">
                {latest.rating ? (
                  <span className="flex shrink-0 items-center gap-1 font-bold">
                    <Star size={15} fill="#FF8243" stroke="#FF8243" /> {latest.rating}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate text-slate-300">
                  {latestText ? `“${latestText}”` : 'Dejó una valoración'}
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-500">{latest.clientName || 'Anónimo'}</span>
              </p>
            )
          ) : (
            <p className="mt-3 text-sm text-slate-500">Aún no hay valoraciones. Sé la primera persona en dejar un comentario.</p>
          )}
          {worker.thanksCount > 0 && (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {worker.thanksCount} {worker.thanksCount === 1 ? 'agradecimiento' : 'agradecimientos'} sin comentario
            </p>
          )}
        </section>

        <p className="mt-8 text-center text-sm font-bold text-slate-400">Un buen servicio merece ser reconocido.</p>
        <div className="mt-3 space-y-3 pb-4">
          <Link to={`/p/${worker.username}/comentar`} className="btn-primary w-full gap-2.5 !py-4 text-lg">
            <Star size={22} fill="#FCE883" stroke="#FCE883" /> Dejar un comentario
          </Link>
          {worker.readyForTips ? (
            <Link to={`/pagar/${worker.username}`} className="btn-accent w-full gap-2.5 !py-4 text-xl">
              <HandCoins size={24} /> Dejar propina
            </Link>
          ) : (
            <p className="rounded-2xl bg-white/80 p-3 text-center text-sm text-slate-400">
              Por ahora puedes dejar un comentario.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
