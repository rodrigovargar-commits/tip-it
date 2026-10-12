import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import { trackEvent } from '../utils/analytics.js';
import Avatar from '../components/Avatar.jsx';
import FormField from '../components/FormField.jsx';
import StarRating from '../components/StarRating.jsx';

// Say thanks to someone without paying: no checkout, no card, no total.
export default function Recognize() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [alias, setAlias] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: people never see or fill this
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // null | 'pending' | 'published'

  useEffect(() => {
    api
      .get(`/workers/${username}`)
      .then(({ data }) => setWorker(data.worker))
      .catch((err) => {
        toast.error(getErrorMessage(err));
        navigate('/scan');
      });
    trackEvent('recognition_started', { paid: false });
  }, [username, navigate]);

  if (!worker) return null;
  const firstName = (worker.name || worker.username).split(' ')[0];

  const submit = async ({ thanks = false } = {}) => {
    setSaving(true);
    try {
      const { data } = await api.post(`/workers/${username}/recognitions`, {
        ...(rating ? { rating } : {}),
        comment: comment.trim(),
        alias: alias.trim(),
        website,
        ...(thanks ? { thanks: true } : {}),
      });
      trackEvent('recognition_submitted', { paid: false, rating: Boolean(rating), comment: Boolean(comment.trim()) });
      setResult(data.status);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="page-shell items-center text-center">
        <CheckCircle2 size={56} className="mt-10 text-brand-400" aria-hidden />
        <h1 className="mt-4 text-3xl font-extrabold">{result === 'published' ? 'Tu comentario fue enviado' : 'Tu comentario está pendiente de revisión'}</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          {result === 'published' ? `Ya se ve en el perfil de ${firstName}.` : `Lo revisamos antes de publicarlo en el perfil de ${firstName}. Gracias por tomarte el tiempo.`}
        </p>
        <Link to="/" className="btn-primary mt-8 w-full">
          Ir al inicio
        </Link>
        <Link to={`/p/${worker.username}`} className="mt-3 text-sm font-bold underline underline-offset-2">
          Volver al perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link to={`/p/${worker.username}`} className="flex items-center gap-1 text-sm text-slate-400">
        <ArrowLeft size={16} /> Volver
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <Avatar src={worker.avatarUrl} name={worker.name || worker.username} size={52} />
        <div>
          <h1 className="text-2xl font-extrabold leading-tight">Deja un comentario</h1>
          <p className="text-sm text-slate-400">{worker.name || `@${worker.username}`}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-6 space-y-5"
      >
        <div>
          <p className="mb-1.5 text-sm font-bold">¿Cómo fue el servicio?</p>
          <StarRating value={rating} onChange={setRating} label="¿Cómo fue el servicio?" />
        </div>
        <FormField label="Comentario" optional hint={`${comment.length}/200`}>
          {(p) => (
            <textarea {...p} value={comment} onChange={(e) => setComment(e.target.value.slice(0, 200))} placeholder="Cuéntale a otros cómo fue." className="input-field h-28 resize-none" />
          )}
        </FormField>
        <FormField label="Alias" optional hint="Si no pones uno, saldrá como “Anónimo”.">
          {(p) => <input {...p} value={alias} onChange={(e) => setAlias(e.target.value.slice(0, 30))} maxLength={30} className="input-field" />}
        </FormField>
        <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />

        <p className="text-xs text-slate-500">
          Esto no es un pago. Revisamos los comentarios antes de publicarlos y se marcan como “Sin pago asociado”. No cuentan para el promedio de estrellas.
        </p>

        <button type="submit" disabled={saving || (!rating && !comment.trim())} className="btn-primary w-full">
          {saving ? 'Enviando…' : 'Publicar comentario'}
        </button>
        <button type="button" onClick={() => submit({ thanks: true })} disabled={saving || Boolean(rating || comment.trim())} className="btn-secondary w-full">
          Enviar agradecimiento
        </button>
      </form>
    </div>
  );
}
