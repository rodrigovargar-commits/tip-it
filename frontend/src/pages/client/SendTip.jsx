import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import api, { getErrorMessage } from '../../services/api.js';
import Spinner from '../../components/Spinner.jsx';
import StarRating from '../../components/StarRating.jsx';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
const QUICK_AMOUNTS = [20, 50, 100, 200];

function PaymentStep({ clientSecret, worker, onSuccess }) {
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
      <PaymentElement />
      <button type="submit" disabled={!stripe || submitting} className="btn-primary w-full">
        {submitting ? 'Procesando...' : `Confirmar pago a @${worker.username}`}
      </button>
    </form>
  );
}

export default function SendTip() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('amount'); // amount -> payment -> rating -> done
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [rating, setRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

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

  const handleContinue = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < 1) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setCreatingIntent(true);
    try {
      const { data } = await api.post('/tips/create-intent', {
        username,
        amount: value,
        comment,
      });
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.transactionId);
      setStep('payment');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = (piId) => {
    setPaymentIntentId(piId);
    setStep('rating');
  };

  const handleSubmitRating = async () => {
    setSavingRating(true);
    try {
      await api.post('/tips/confirm', { paymentIntentId, rating: rating || undefined, comment });
      setStep('done');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingRating(false);
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
          Este trabajador todavía no puede recibir propinas. Inténtalo más tarde.
        </p>
        <Link to="/scan" className="btn-secondary mt-8">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell pb-10">
      <Link to="/scan" className="text-sm text-slate-400">
        ← Volver
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-xl font-bold">
          {worker.name?.[0]?.toUpperCase() || '@'}
        </div>
        <div>
          <p className="text-lg font-bold">{worker.name || `@${worker.username}`}</p>
          <p className="text-sm text-slate-400">@{worker.username}</p>
        </div>
      </div>
      {worker.bio && <p className="mt-3 text-sm text-slate-400">{worker.bio}</p>}

      {step === 'amount' && (
        <form onSubmit={handleContinue} className="mt-8 space-y-4">
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
        </form>
      )}

      {step === 'payment' && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentStep clientSecret={clientSecret} worker={worker} onSuccess={handlePaymentSuccess} />
        </Elements>
      )}

      {step === 'rating' && (
        <div className="mt-8 space-y-5 text-center">
          <p className="text-lg font-semibold">¡Propina enviada! Califica el servicio</p>
          <div className="flex justify-center">
            <StarRating value={rating} onChange={setRating} />
          </div>
          <button onClick={handleSubmitRating} disabled={savingRating} className="btn-primary w-full">
            {savingRating ? 'Guardando...' : 'Terminar'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-10 space-y-5 text-center">
          <div className="text-5xl">🎉</div>
          <p className="text-lg font-semibold">¡Gracias por tu propina!</p>
          <Link to="/history" className="btn-secondary w-full">
            Ver historial
          </Link>
          <Link to="/scan" className="btn-primary w-full">
            Enviar otra propina
          </Link>
        </div>
      )}
    </div>
  );
}
