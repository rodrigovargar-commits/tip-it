import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, UserPlus, PartyPopper, Star, ShieldCheck } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import Spinner from '../../components/Spinner.jsx';
import StarRating from '../../components/StarRating.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { trackEvent } from '../../utils/analytics.js';

// Stripe's script is only fetched when the payment step actually renders, not
// the moment someone scans a QR: the first screen opens faster and without
// third-party requests.
let stripePromise;
const getStripe = () => {
  if (!stripePromise) stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
  return stripePromise;
};
const QUICK_AMOUNTS = [20, 50, 100, 200];

function PaymentStep({ worker, chargeAmount, netAmount, onSuccess, user }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || 'No se pudo procesar el pago');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="card !bg-brand-500/10 text-center">
        <p className="text-sm text-slate-400">Tú pagas ${chargeAmount.toFixed(2)}</p>
        <p className="mt-1 text-2xl font-bold text-brand-300">
          {worker.name || `@${worker.username}`} recibe ${netAmount.toFixed(2)}
        </p>
      </div>
      <PaymentElement />
      <button type="submit" disabled={!stripe || submitting} className="btn-primary w-full">
        {submitting
          ? 'Procesando...'
          : `Confirmar pago de $${chargeAmount.toFixed(2)} a @${worker.username}`}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck size={13} />
        Pago seguro, procesado por Stripe
      </p>
      {!user && (
        <p className="text-center text-xs text-slate-600">
          <Link to="/register" className="text-slate-500 underline hover:text-brand-400">
            Crear cuenta
          </Link>{' '}
          (opcional)
        </p>
      )}
    </form>
  );
}

export default function SendTip() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('amount'); // amount -> payment -> rating -> done
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [coverFee, setCoverFee] = useState(false);
  const [feeInfo, setFeeInfo] = useState({ feePercent: 6, feeFixedCents: 400 });
  const [clientSecret, setClientSecret] = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [savingRating, setSavingRating] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // The page's own <script> in index.html already started this request
        // when the QR was opened; reuse it so we don't wait twice.
        const pre = window.__tipPrefetch;
        if (pre && pre.username === String(username).toLowerCase()) {
          window.__tipPrefetch = null;
          try {
            const r = await pre.p;
            if (r.ok && r.data?.worker) {
              setWorker(r.data.worker);
              return;
            }
          } catch {
            // fall through to the normal request below
          }
        }
        const { data } = await api.get(`/workers/${username}`);
        setWorker(data.worker);
      } catch (err) {
        toast.error(getErrorMessage(err));
        navigate('/scan');
      } finally {
        setLoading(false);
      }
    })();
  }, [username, navigate]);

  useEffect(() => {
    api
      .get('/tips/fee-info')
      .then(({ data }) => setFeeInfo({ feePercent: data.feePercent, feeFixedCents: data.feeFixedCents }))
      .catch(() => {});
  }, []);

  const finalAmount = Number(amount) || 0;

  const feeAmount =
    finalAmount > 0
      ? (Math.round(finalAmount * 100 * (feeInfo.feePercent / 100)) + feeInfo.feeFixedCents) / 100
      : 0;
  const previewChargeAmount = coverFee ? finalAmount + feeAmount : finalAmount;
  const previewWorkerReceives = coverFee ? finalAmount : Math.max(0, finalAmount - feeAmount);

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!finalAmount || finalAmount < 1) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setCreatingIntent(true);
    try {
      const { data } = await api.post('/tips/create-intent', {
        username,
        amount: Number(finalAmount.toFixed(2)),
        comment,
        coverFee,
      });
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.transactionId);
      setChargeAmount(data.amount / 100);
      setNetAmount(data.netAmount / 100);
      setStep('payment');
      trackEvent('begin_checkout', { value: data.amount / 100, currency: 'MXN' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = (piId) => {
    setPaymentIntentId(piId);
    setStep('rating');
    trackEvent('purchase', { value: chargeAmount, currency: 'MXN' });
  };

  const handleSubmitRating = async () => {
    setSavingRating(true);
    try {
      await api.post('/tips/confirm', { paymentIntentId, rating: rating || undefined, review });
      setStep('done');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingRating(false);
    }
  };

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const { data } = await api.post('/contacts', { username });
      toast.success(data.alreadyExists ? 'Ya estaba en tus contactos' : 'Guardado en contactos');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingContact(false);
    }
  };

  if (loading) {
    // A skeleton of the page, so something friendly shows instantly even if the
    // server is still waking up.
    return (
      <div className="page-shell md:!max-w-5xl" aria-busy="true" aria-label="Cargando perfil">
        <div className="mt-6 flex items-center gap-3">
          <div className="h-14 w-14 animate-pulse rounded-full border-2 border-punch-ink/20 bg-punch-pink/60" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded-full bg-punch-ink/10" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-punch-ink/10" />
          </div>
        </div>
        <div className="mt-8 h-14 animate-pulse rounded-2xl bg-punch-ink/10" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-full bg-punch-ink/10" />
          ))}
        </div>
        <div className="mt-6 h-12 animate-pulse rounded-full bg-punch-orange/40" />
        <p className="mt-6 text-center text-sm font-medium text-slate-400">Abriendo el perfil…</p>
      </div>
    );
  }

  if (!worker) return null;

  if (!worker.readyForTips && step === 'amount') {
    return (
      <div className="page-shell items-center text-center">
        <h1 className="mt-10 text-xl font-bold">@{worker.username}</h1>
        <p className="mt-4 text-slate-400">
          Este Tip-er todavía no puede recibir pagos. Inténtalo más tarde.
        </p>
        <Link to="/scan" className="btn-secondary mt-8">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell md:!max-w-5xl">
      <Link to="/scan" className="flex items-center gap-1 text-sm text-slate-400">
        <ArrowLeft size={16} />
        Volver
      </Link>

      <div className="lg:mt-6 lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-14">
        <div className="lg:sticky lg:top-24">
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={worker.avatarUrl} name={worker.name || worker.username} size={56} />
          <div>
            <p className="text-lg font-bold">{worker.name || `@${worker.username}`}</p>
            <p className="text-sm text-slate-400">@{worker.username}</p>
            {worker.rating ? (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
                <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                {worker.rating} ({worker.ratingCount})
              </div>
            ) : null}
          </div>
        </div>
        {step === 'amount' && user && (
          <button
            onClick={handleSaveContact}
            disabled={savingContact}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-brand-500 hover:text-brand-400"
            aria-label="Guardar contacto"
          >
            <UserPlus size={16} />
          </button>
        )}
      </div>
      {worker.bio && <p className="mt-3 text-sm text-slate-400">{worker.bio}</p>}
      {worker.experience && (
        <div className="mt-3 card !p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Trayectoria
          </p>
          <p className="mt-1 text-sm text-slate-300">{worker.experience}</p>
        </div>
      )}

        </div>
        <div>
      {step === 'amount' && (
        <form onSubmit={handleContinue} className="mt-8 space-y-4 lg:mt-0">
          <label className="font-display text-lg font-extrabold">¿Cuánto quieres dar?</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_AMOUNTS.map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setAmount(String(val))}
                aria-pressed={Number(amount) === val}
                className={`rounded-3xl border-2 py-6 font-display text-3xl font-extrabold transition active:scale-95 ${
                  Number(amount) === val
                    ? 'border-punch-ink bg-punch-yellow text-punch-ink shadow-[3px_3px_0_0_#0A2F2F]'
                    : 'border-punch-ink/30 bg-white hover:border-punch-ink'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>
          <label className="block text-sm text-slate-400">¿Otro monto?</label>
          <div className="flex items-center rounded-2xl border-2 border-punch-ink/30 bg-white px-4 focus-within:border-punch-ink focus-within:ring-2 focus-within:ring-punch-yellow">
            <span className="text-2xl text-slate-500">$</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent px-2 py-3 text-2xl font-bold text-slate-100 outline-none"
              required
            />
            <span className="text-slate-500">MXN</span>
          </div>

          {finalAmount > 0 && (
            <div className="card space-y-3 !bg-slate-900/60">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={coverFee}
                  onChange={(e) => setCoverFee(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-brand-500"
                />
                <span className="text-sm text-slate-300">
                  Cubrir la comisión (+${feeAmount.toFixed(2)}) para que{' '}
                  <span className="font-semibold">@{worker.username}</span> reciba el 100% de tu
                  propina
                </span>
              </label>
              <div className="space-y-1 border-t border-slate-800 pt-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Tip-er recibe</span>
                  <span className="font-semibold text-slate-100">
                    ${previewWorkerReceives.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tú pagas</span>
                  <span className="font-semibold text-slate-100">
                    ${previewChargeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario (opcional)"
            className="input-field h-20 resize-none"
            maxLength={500}
          />

          <button type="submit" disabled={creatingIntent} className="btn-primary w-full">
            {creatingIntent ? 'Preparando pago...' : 'Continuar'}
          </button>
          <p className="text-center text-xs text-slate-500">
            Al continuar aceptas los{' '}
            <Link to="/terminos" className="text-brand-400 underline underline-offset-2" target="_blank">
              Términos
            </Link>{' '}
            y el{' '}
            <Link to="/privacidad" className="text-brand-400 underline underline-offset-2" target="_blank">
              Aviso de privacidad
            </Link>
            .
          </p>
        </form>
      )}

      {step === 'payment' && clientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret }}>
          <PaymentStep
            worker={worker}
            chargeAmount={chargeAmount}
            netAmount={netAmount}
            onSuccess={handlePaymentSuccess}
            user={user}
          />
        </Elements>
      )}

      {step === 'rating' && (
        <div className="mt-8 space-y-5">
          <p className="text-center text-lg font-semibold">
            ¡Pago enviado! Califica el servicio
          </p>
          <div className="flex justify-center">
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Cuéntale a otros cómo fue tu experiencia (esto se verá en el perfil público)"
            className="input-field h-24 resize-none"
            maxLength={500}
          />
          <button onClick={handleSubmitRating} disabled={savingRating} className="btn-primary w-full">
            {savingRating ? 'Guardando...' : 'Terminar'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-10 space-y-5 text-center">
          <PartyPopper size={48} className="mx-auto text-brand-400" />
          <p className="text-lg font-semibold">¡Gracias por tu pago!</p>
          {user ? (
            <Link to="/history" className="btn-secondary w-full">
              Ver historial
            </Link>
          ) : (
            <Link to="/register" className="btn-secondary w-full">
              Crear cuenta gratis (guarda tu historial)
            </Link>
          )}
          <Link to="/scan" className="btn-primary w-full">
            Enviar otro pago
          </Link>
        </div>
      )}
        </div>
      </div>

      {step === 'amount' && worker.reviews?.length > 0 && (
        <section className="mt-10 border-t-2 border-punch-ink/15 pt-6 lg:mx-auto lg:max-w-3xl">
          <h2 className="font-display text-lg font-extrabold">Lo que dicen de esta persona</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {worker.reviews.slice(0, 4).map((r, i) => (
              <div key={i} className="rounded-2xl border-2 border-punch-ink/30 bg-white/40 p-3">
                <div className="flex items-center gap-1 text-amber-700">
                  {Array.from({ length: r.rating || 0 }).map((_, st) => (
                    <Star key={st} size={12} fill="#fbbf24" stroke="#fbbf24" />
                  ))}
                  <span className="ml-1 text-xs text-slate-500">{r.clientName}</span>
                </div>
                {r.review && <p className="mt-1 text-sm italic text-slate-400">“{r.review}”</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
