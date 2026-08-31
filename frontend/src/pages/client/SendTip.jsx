import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, UserPlus, PartyPopper, Star, Calculator, Wallet, ShieldCheck } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import Spinner from '../../components/Spinner.jsx';
import StarRating from '../../components/StarRating.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { trackEvent } from '../../utils/analytics.js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
const QUICK_AMOUNTS = [20, 50, 100, 200];
const PERCENT_PRESETS = [10, 15, 20];

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
  const [mode, setMode] = useState('fixed'); // fixed | percent
  const [amount, setAmount] = useState('');
  const [billTotal, setBillTotal] = useState('');
  const [percent, setPercent] = useState(15);
  const [customPercent, setCustomPercent] = useState('');
  const [comment, setComment] = useState('');
  const [coverFee, setCoverFee] = useState(false);
  const [feeInfo, setFeeInfo] = useState({ feePercent: 8, feeFixedCents: 300 });
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

  const effectivePercent = customPercent ? Number(customPercent) : percent;
  const computedTip =
    mode === 'percent' && billTotal ? (Number(billTotal) * effectivePercent) / 100 : 0;
  const finalAmount = mode === 'percent' ? computedTip : Number(amount) || 0;

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!worker) return null;

  if (!worker.readyForTips && step === 'amount') {
    return (
      <div className="page-shell items-center pb-10 text-center">
        <h1 className="mt-10 text-xl font-bold">@{worker.username}</h1>
        <p className="mt-4 text-slate-400">
          Este trabajador todavía no puede recibir pagos. Inténtalo más tarde.
        </p>
        <Link to="/scan" className="btn-secondary mt-8">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell pb-10">
      <Link to="/scan" className="flex items-center gap-1 text-sm text-slate-400">
        <ArrowLeft size={16} />
        Volver
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={worker.avatarUrl} name={worker.name || worker.username} size={56} />
          <div>
            <p className="text-lg font-bold">{worker.name || `@${worker.username}`}</p>
            <p className="text-sm text-slate-400">@{worker.username}</p>
            {worker.rating ? (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-400">
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
      {worker.reviews?.length > 0 && (
        <div className="mt-3 space-y-2">
          {worker.reviews.slice(0, 2).map((r, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: r.rating || 0 }).map((_, s) => (
                  <Star key={s} size={12} fill="#fbbf24" stroke="#fbbf24" />
                ))}
                <span className="ml-1 text-xs text-slate-500">{r.clientName}</span>
              </div>
              {r.review && <p className="mt-1 text-sm italic text-slate-400">“{r.review}”</p>}
            </div>
          ))}
        </div>
      )}

      {step === 'amount' && (
        <form onSubmit={handleContinue} className="mt-8 space-y-4">
          <div className="flex gap-2 rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setMode('fixed')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                mode === 'fixed' ? 'bg-brand-600 text-white' : 'text-slate-400'
              }`}
            >
              <Wallet size={14} />
              Monto fijo
            </button>
            <button
              type="button"
              onClick={() => setMode('percent')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                mode === 'percent' ? 'bg-brand-600 text-white' : 'text-slate-400'
              }`}
            >
              <Calculator size={14} />
              % de la cuenta
            </button>
          </div>

          {mode === 'fixed' ? (
            <>
              <label className="text-sm text-slate-400">¿Cuánto quieres dar?</label>
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
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

              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAmount(String(val))}
                    className="rounded-xl border border-slate-700 bg-slate-900 py-2 text-sm font-semibold hover:border-brand-500"
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label className="text-sm text-slate-400">¿De cuánto fue la cuenta?</label>
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                <span className="text-2xl text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={billTotal}
                  onChange={(e) => setBillTotal(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent px-2 py-3 text-2xl font-bold text-slate-100 outline-none"
                  required
                />
                <span className="text-slate-500">MXN</span>
              </div>

              <label className="text-sm text-slate-400">¿Qué porcentaje quieres dejar?</label>
              <div className="grid grid-cols-3 gap-2">
                {PERCENT_PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => {
                      setPercent(p);
                      setCustomPercent('');
                    }}
                    className={`rounded-xl border py-2 text-sm font-semibold transition ${
                      !customPercent && percent === p
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-slate-700 bg-slate-900 hover:border-brand-500'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customPercent}
                  onChange={(e) => setCustomPercent(e.target.value)}
                  placeholder="Otro porcentaje"
                  className="w-full bg-transparent py-3 text-slate-100 outline-none"
                />
                <span className="text-slate-500">%</span>
              </div>

              {billTotal && (
                <div className="card !bg-brand-500/10 text-center">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Vas a dejar ({effectivePercent}% de ${Number(billTotal).toFixed(2)})
                  </p>
                  <p className="mt-1 text-3xl font-bold text-brand-300">
                    ${computedTip.toFixed(2)} MXN
                  </p>
                </div>
              )}
            </>
          )}

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
                  <span>Trabajador recibe</span>
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
            <Link to="/terminos" className="text-brand-400" target="_blank">
              Términos
            </Link>{' '}
            y el{' '}
            <Link to="/privacidad" className="text-brand-400" target="_blank">
              Aviso de privacidad
            </Link>
            .
          </p>
        </form>
      )}

      {step === 'payment' && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
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
  );
}
