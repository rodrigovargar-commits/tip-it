import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, ExpressCheckoutElement, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, ChevronDown, Clock, CreditCard, ShieldCheck, Star, UserPlus } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import StarRating from '../../components/StarRating.jsx';
import Avatar from '../../components/Avatar.jsx';
import ReviewList from '../../components/ReviewList.jsx';
import IconBadge from '../../components/IconBadge.jsx';
import FormField from '../../components/FormField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { trackEvent } from '../../utils/analytics.js';
import { activityLabel } from '../../utils/activities.js';
import { takeWorkerPrefetch } from '../../utils/prefetch.js';
import { formatCents, parseAmountInput, quote } from '../../utils/money.js';

// Stripe's script is only fetched when the payment form actually renders, not
// the moment someone scans a QR: the first screen opens faster and without
// third-party requests.
let stripePromise;
const getStripe = () => {
  if (!stripePromise) stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
  return stripePromise;
};

const PRESETS = [2000, 5000, 10000]; // $20, $50, $100

// Wallets are offered everywhere, but only the one that belongs to the device:
// iPhone/iPad get Apple Pay (no Google Pay), Android gets Google Pay (no Apple
// Pay), and computers get both. This only decides what we ASK Stripe to show;
// whether a wallet is really usable on this device (a card in Apple Wallet or
// in Chrome) is up to Stripe's own check (onReady), not to this guess.
function walletPlatform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}
const DEFAULT_PRESET = 5000;

const APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#0A2F2F',
    colorText: '#0A2F2F',
    colorBackground: '#FFFFFF',
    colorDanger: '#B3261E',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    borderRadius: '16px',
  },
};

/* ------------------------------------------------------------ small pieces */

function Identity({ worker, compact = true }) {
  const detail = [activityLabel(worker.activity), worker.occupation].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-3">
      <Avatar src={worker.avatarUrl} name={worker.name || worker.username} size={compact ? 52 : 80} />
      <div className="min-w-0">
        <p className="truncate text-lg font-extrabold leading-tight">{worker.name || `@${worker.username}`}</p>
        <p className="truncate text-sm text-slate-400">{detail || `@${worker.username}`}</p>
        <div className="mt-0.5 flex items-center gap-3 text-xs">
          {worker.ratingCount > 0 ? (
            <span className="flex items-center gap-1 font-bold text-amber-700">
              <Star size={12} fill="#FF8243" stroke="#FF8243" />
              {worker.rating} ({worker.ratingCount})
            </span>
          ) : (
            <span className="text-slate-500">Aún no hay valoraciones</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Switch({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-2xl border-2 border-punch-ink/25 bg-white p-3.5 text-left transition hover:border-punch-ink"
    >
      <span className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border-2 border-punch-ink transition ${checked ? 'bg-punch-orange' : 'bg-punch-ink/10'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-punch-ink bg-white transition-all ${checked ? 'left-[1.5rem]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-base font-bold">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}

function SummaryRow({ label, value, suffix, strong, note }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? 'border-t-2 border-punch-ink/15 pt-2.5 font-extrabold' : 'text-base'}`}>
      <dt className={strong ? 'text-lg' : 'text-slate-400'}>
        {label}
        {note && <span className="block text-sm font-normal text-slate-500">{note}</span>}
      </dt>
      <dd className={strong ? 'whitespace-nowrap text-2xl' : 'font-bold'}>
        {value}
        {suffix && <span className="ml-1 text-sm font-bold text-slate-500">{suffix}</span>}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------ the checkout */

function Checkout({ worker, username, user, onPaid, initialFeeInfo }) {
  const stripe = useStripe();
  const elements = useElements();

  const [feeInfo, setFeeInfo] = useState(initialFeeInfo);
  const isCheqpay = feeInfo.provider === 'cheqpay';
  const [choice, setChoice] = useState(DEFAULT_PRESET); // a preset in cents, or 'other'
  const [otherText, setOtherText] = useState('');
  const [coverFee, setCoverFee] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wallets, setWallets] = useState(false);
  const [cardOpen, setCardOpen] = useState(true);
  const platform = useMemo(walletPlatform, []);
  const [notice, setNotice] = useState('');
  const intentRef = useRef(null);

  useEffect(() => {
    trackEvent('checkout_view', { origin: 'qr' });
  }, []);

  const parsed = choice === 'other' ? parseAmountInput(otherText) : { cents: choice, error: null };
  const tipCents = parsed.cents;
  const q = tipCents ? quote(tipCents, coverFee, feeInfo) : null;
  const tooLow = q && q.net <= 0;
  const belowMin = Boolean(isCheqpay && q && feeInfo.minCents && q.total < feeInfo.minCents);
  const ready = Boolean(q) && !tooLow && !belowMin;
  const name = worker.name || `@${worker.username}`;
  const firstName = name.split(' ')[0];

  // Keep the amount Stripe shows in the Apple Pay / Google Pay sheet equal to the total on screen.
  useEffect(() => {
    if (elements && q && q.total >= 100) elements.update({ amount: q.total });
  }, [elements, q?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new amount or choice means a new quote: forget any payment started for the old one.
  const quoteKey = ready ? `${tipCents}:${coverFee}` : null;

  // Cheqpay: the person pays on Cheqpay's hosted page and comes back here.
  const payCheqpay = async () => {
    if (submitting) return;
    if (!ready) {
      toast.error(parsed.error || 'Elige cuánto quieres dejar.');
      return;
    }
    setSubmitting(true);
    setNotice('');
    try {
      const { data } = await api.post('/tips/create-link', { username, amount: tipCents / 100, coverFee });
      if (data.amount !== q.total) {
        setNotice(`Actualizamos el total a ${formatCents(data.amount)}. Revísalo antes de pagar.`);
        setSubmitting(false);
        return;
      }
      trackEvent('payment_attempted', { currency: 'MXN', method: 'cheqpay_hosted' });
      window.location.assign(data.url);
    } catch (err) {
      trackEvent('checkout_error', { screen: 'pay' });
      toast.error(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  const pay = async () => {
    if (isCheqpay) return payCheqpay();
    if (!stripe || !elements || submitting) return;
    if (!ready) {
      toast.error(parsed.error || 'Elige cuánto quieres dejar.');
      return;
    }
    setSubmitting(true);
    setNotice('');
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setSubmitting(false);
        return;
      }

      let intent = intentRef.current && intentRef.current.key === quoteKey ? intentRef.current : null;
      if (!intent) {
        const { data } = await api.post('/tips/create-intent', { username, amount: tipCents / 100, coverFee });
        // The server is the authority on the total. If it disagrees with the screen
        // (for example the rate changed), say so and ask again instead of charging.
        if (data.amount !== q.total) {
          setNotice(`Actualizamos el total a ${formatCents(data.amount)}. Revísalo antes de pagar.`);
          setFeeInfo((f) => ({ ...f }));
          setSubmitting(false);
          return;
        }
        intent = { key: quoteKey, clientSecret: data.clientSecret, transactionId: data.transactionId };
        intentRef.current = intent;
      }

      trackEvent('payment_attempted', { currency: 'MXN', method: wallets ? 'wallet_or_card' : 'card' });
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: intent.clientSecret,
        confirmParams: {
          return_url: window.location.href,
          payment_method_data: { billing_details: { address: { country: 'MX' } } },
        },
        redirect: 'if_required',
      });

      if (error) {
        // A declined card leaves the same payment open for another try; anything
        // structural means this payment is unusable, so start a new one next time.
        if (error.type !== 'card_error') intentRef.current = null;
        trackEvent('payment_failed', { category: error.type });
        toast.error(error.type === 'card_error' || error.type === 'validation_error' ? error.message : 'No se pudo autorizar el pago. Prueba otro medio.');
        setSubmitting(false);
        return;
      }

      // Never trust the browser's word that it worked: the server asks Stripe itself.
      // If we can't reach it right now, the payment may still be going through:
      // show "estamos confirmando" with a way to check, never "failed" and never a second charge.
      let transaction;
      try {
        const { data: confirmed } = await api.post('/tips/confirm', { paymentIntentId: paymentIntent.id });
        transaction = confirmed.transaction;
        trackEvent('payment_succeeded', { currency: 'MXN' });
      } catch {
        transaction = {
          _id: intent.transactionId,
          status: 'processing',
          amount: q.total,
          platformFee: q.fee,
          netAmount: q.net,
          coverFee,
          createdAt: new Date().toISOString(),
        };
      }
      intentRef.current = null;
      onPaid({ transaction, paymentIntentId: paymentIntent.id });
    } catch (err) {
      trackEvent('checkout_error', { screen: 'pay' });
      toast.error(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section aria-labelledby="amount-title">
        <h2 id="amount-title" className="font-display text-xl font-extrabold">
          ¿Cuánto deseas dejar?
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-labelledby="amount-title">
          {[...PRESETS, 'other'].map((opt) => {
            const on = choice === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setChoice(opt);
                  trackEvent('amount_selected', { type: opt === 'other' ? 'other' : 'preset' });
                }}
                className={`min-h-[4.25rem] rounded-3xl border-2 py-4 font-display text-2xl font-extrabold transition active:scale-95 ${
                  on ? 'border-punch-ink bg-punch-orange shadow-[3px_3px_0_0_#0A2F2F]' : 'border-punch-ink/30 bg-white hover:border-punch-ink'
                }`}
              >
                {opt === 'other' ? 'Otro' : formatCents(opt).replace('.00', '')}
              </button>
            );
          })}
        </div>

        {choice === 'other' && (
          <div className="mt-3">
            <FormField label="Otro importe en MXN" error={parsed.error && otherText ? parsed.error : ''}>
              {(p) => (
                <div className="flex items-center rounded-2xl border-2 border-punch-ink/30 bg-white px-4 focus-within:border-punch-ink focus-within:ring-2 focus-within:ring-punch-yellow">
                  <span className="text-2xl text-slate-500">$</span>
                  <input
                    {...p}
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent px-2 py-3 text-2xl font-bold outline-none"
                  />
                  <span className="text-sm font-bold text-slate-500">MXN</span>
                </div>
              )}
            </FormField>
          </div>
        )}
      </section>

      <Switch
        checked={coverFee}
        onChange={(v) => {
          setCoverFee(v);
          trackEvent('fee_coverage_changed', { on: v });
        }}
        label="Quiero cubrir el costo de procesamiento"
        hint={q ? (coverFee ? `Pagas ${formatCents(q.fee)} más y ${firstName} recibe la propina completa.` : `Si no, ${formatCents(q.fee)} se descuentan de lo que recibe ${firstName}.`) : 'Es opcional.'}
      />

      <dl className="card space-y-2 !bg-white" aria-live="polite">
        <SummaryRow label="Propina" value={q ? formatCents(q.tip) : '—'} />
        <SummaryRow label="Procesamiento que cubres" value={q ? formatCents(coverFee ? q.fee : 0) : '—'} />
        <SummaryRow label="Total a pagar" value={q ? formatCents(q.total) : '—'} suffix="MXN" strong />
        <SummaryRow label={`Neto estimado para ${firstName}`} value={q ? formatCents(Math.max(q.net, 0)) : '—'} />
      </dl>

      {tooLow && (
        <p role="alert" className="rounded-2xl border-2 border-red-700/40 bg-red-50 p-3 text-sm font-semibold text-red-800">
          Con este importe no alcanza para cubrir el procesamiento. Elige un monto mayor o cubre el costo tú.
        </p>
      )}
      {belowMin && (
        <p role="alert" className="rounded-2xl border-2 border-red-700/40 bg-red-50 p-3 text-sm font-semibold text-red-800">
          El monto mínimo es de {formatCents(feeInfo.minCents)}. Elige uno mayor.
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-2xl border-2 border-punch-ink bg-punch-yellow/60 p-3 text-sm font-semibold">
          {notice}
        </p>
      )}

      {isCheqpay ? (
        <section aria-labelledby="method-title" className="space-y-3">
          <h2 id="method-title" className="font-display text-xl font-extrabold">
            Método de pago
          </h2>
          <div className="flex items-center gap-2 rounded-2xl border-2 border-punch-ink/25 bg-white p-3.5 text-sm font-bold">
            <IconBadge icon={CreditCard} tone="pink" size={28} /> Pagas con tarjeta en una página segura y regresas aquí.
          </div>
          <button type="button" onClick={pay} disabled={submitting || !ready} className="btn-accent w-full text-lg">
            {submitting ? 'Abriendo el pago…' : q ? `Pagar ${formatCents(q.total)} MXN` : 'Elige un monto'}
          </button>
        </section>
      ) : (
        <>
      <section aria-labelledby="method-title" className="space-y-3">
        <h2 id="method-title" className="font-display text-xl font-extrabold">
          Método de pago
        </h2>

        <div className={ready ? '' : 'pointer-events-none opacity-50'}>
          <ExpressCheckoutElement
            onReady={({ availablePaymentMethods }) => {
              const any = Boolean(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay);
              setWallets(any);
              setCardOpen(!any); // with a wallet, the card form waits behind "Pagar con tarjeta"
              trackEvent('payment_method_available', { wallet: any });
            }}
            onConfirm={pay}
            onCancel={() => toast('Cancelaste la autorización.')}
            options={{
              paymentMethods: {
                applePay: platform === 'android' ? 'never' : 'auto',
                googlePay: platform === 'ios' ? 'never' : 'auto',
                link: 'never',
                amazonPay: 'never',
                paypal: 'never',
              },
              buttonTheme: { applePay: 'black', googlePay: 'white' },
              buttonHeight: 52,
            }}
          />
        </div>

        {wallets && (
          <button
            type="button"
            onClick={() => setCardOpen((v) => !v)}
            aria-expanded={cardOpen}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-punch-ink/25 bg-white px-4 py-3 text-left font-bold"
          >
            <span className="flex items-center gap-2">
              <IconBadge icon={CreditCard} tone="pink" size={28} /> Pagar con tarjeta
            </span>
            <ChevronDown size={18} className={`transition ${cardOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        <div className={`rounded-2xl border-2 border-punch-ink/25 bg-white p-3.5 ${cardOpen ? '' : 'hidden'}`}>
          {!wallets && (
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <IconBadge icon={CreditCard} tone="pink" size={28} /> Pagar con tarjeta
            </p>
          )}
          <PaymentElement
            options={{
              layout: 'tabs',
              wallets: { applePay: 'never', googlePay: 'never' },
              // Everyone paying here is in Mexico, so the country is not asked for.
              fields: { billingDetails: { address: { country: 'never' } } },
            }}
          />
        </div>
      </section>

      {/* With a wallet button on screen, that button is the way to pay; a second
          pay button would invite two attempts at once. It appears once the card form is open. */}
      {cardOpen && (
        <button type="button" onClick={pay} disabled={!stripe || submitting || !ready} className="btn-accent w-full text-lg">
          {submitting ? 'Procesando…' : q ? `Pagar ${formatCents(q.total)} MXN` : 'Elige un monto'}
        </button>
      )}
        </>
      )}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <ShieldCheck size={13} /> Pago seguro, procesado por {isCheqpay ? 'Cheqpay' : 'Stripe'}. TIP-IT no guarda tu tarjeta.
      </p>
      <p className="text-center text-xs text-slate-500">
        Al pagar aceptas los{' '}
        <Link to="/terminos" className="text-brand-400 underline underline-offset-2" target="_blank">
          Términos
        </Link>{' '}
        y el{' '}
        <Link to="/privacidad" className="text-brand-400 underline underline-offset-2" target="_blank">
          Aviso de privacidad
        </Link>
        .
      </p>
      {!user && (
        <p className="text-center text-xs text-slate-500">
          <Link to="/register?role=client" className="underline hover:text-brand-400">
            Crear cuenta
          </Link>{' '}
          (opcional)
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------- confirmation + review step */

// A yellow circle with a check and a burst of colour around it (brand sheet).
function Sunburst() {
  const rays = [
    [-70, '#FF8243'], [-35, '#069494'], [0, '#FF8243'], [35, '#FFC0CB'], [70, '#FCE883'],
    [110, '#069494'], [145, '#FF8243'], [180, '#FFC0CB'], [215, '#FCE883'], [250, '#FF8243'],
  ];
  return (
    <svg viewBox="0 0 120 120" width="112" height="112" className="mx-auto" aria-hidden="true">
      {rays.map(([deg, color]) => (
        <line
          key={deg}
          x1="60" y1="8" x2="60" y2="20"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          transform={`rotate(${deg} 60 60)`}
        />
      ))}
      <circle cx="60" cy="60" r="32" fill="#FCE883" stroke="#0A2F2F" strokeWidth="4" />
      <path d="M46 61 L56 71 L75 50" fill="none" stroke="#0A2F2F" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Confirmation({ worker, receipt, user }) {
  const { transaction } = receipt;
  const name = worker.name || `@${worker.username}`;
  const firstName = name.split(' ')[0];
  const confirmed = transaction?.status === 'succeeded';
  const [state, setState] = useState(confirmed ? 'review' : 'checking'); // checking | review | sent
  // Rated or skipped: show a thank-you with one button back to the main page.
  const finish = () => setState('sent');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);
  const [tx, setTx] = useState(transaction);
  const ok = tx?.status === 'succeeded';

  const tip = tx.coverFee ? tx.amount - tx.platformFee : tx.amount;
  const when = new Date(tx.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

  const recheck = async () => {
    try {
      const { data } = await api.post('/tips/confirm', { paymentIntentId: receipt.paymentIntentId });
      setTx(data.transaction);
      if (data.transaction.status === 'succeeded') setState('review');
      else toast('Todavía estamos confirmando tu pago.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const send = async ({ thanks = false } = {}) => {
    setSaving(true);
    try {
      await api.post('/tips/confirm', {
        paymentIntentId: receipt.paymentIntentId,
        ...(rating ? { rating } : {}),
        ...(review.trim() ? { review: review.trim() } : {}),
        ...(alias.trim() ? { alias: alias.trim() } : {}),
        ...(thanks ? { thanks: true } : {}),
      });
      trackEvent('recognition_submitted', { paid: true, rating: Boolean(rating), comment: Boolean(review.trim()) });
      finish();
    } catch (err) {
      toast.error('Tu pago está confirmado. No pudimos guardar tu comentario; puedes intentar de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        {ok ? (
          <Sunburst />
        ) : (
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-punch-yellow">
            <Clock size={36} aria-hidden="true" />
          </span>
        )}
        <h1 className="mt-3 text-4xl font-extrabold">{ok ? '¡Gracias!' : 'Estamos confirmando tu pago'}</h1>
        {ok ? null : (
          <p className="mt-1 text-sm text-slate-400">No pudimos confirmar el estado todavía. No vuelvas a pagar: toca “Consultar estado”.</p>
        )}
      </div>

      <div className="card !p-4">
        <div className="flex items-center gap-3">
          <Avatar src={worker.avatarUrl} name={name} size={44} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-bold">{name}</p>
            <p className="truncate text-sm text-slate-500">
              {[activityLabel(worker.activity), worker.occupation].filter(Boolean).join(' · ') || `@${worker.username}`}
            </p>
          </div>
          <p className="font-display text-xl font-extrabold">{formatCents(tx.amount)}</p>
        </div>
      </div>

      <dl className="card space-y-2">
        <SummaryRow label="Propina" value={formatCents(tip)} />
        {tx.coverFee && <SummaryRow label="Procesamiento cubierto" value={formatCents(tx.platformFee)} />}
        <SummaryRow label="Total pagado" value={formatCents(tx.amount)} suffix="MXN" strong note={tx.coverFee ? 'Incluye el costo de procesamiento' : undefined} />
        <SummaryRow label={`Neto estimado para ${firstName}`} value={formatCents(tx.netAmount)} />
        <SummaryRow label="Fecha" value={when} />
        <SummaryRow label="Referencia" value={String(tx._id).slice(-8).toUpperCase()} />
      </dl>
      {ok && tx.coverFee && (
        <p className="rounded-2xl bg-punch-tealdark/10 p-3 text-center text-sm font-bold">
          {firstName} recibirá {formatCents(tip)} completos. ¡Gracias por apoyar!
        </p>
      )}
      {ok && (
        <p className="text-center text-sm font-semibold text-slate-400">
          El pago está confirmado. {firstName} recibirá tu pago pronto.
        </p>
      )}

      {!ok && (
        <button type="button" onClick={recheck} className="btn-secondary w-full">
          Consultar estado
        </button>
      )}

      {ok && state === 'review' && (
        <section aria-labelledby="review-title" className="card space-y-4">
          <h2 id="review-title" className="font-display text-xl font-extrabold">
            ¿Cómo fue el servicio?
          </h2>
          <p className="-mt-2 text-sm text-slate-500">Calificar es opcional.</p>
          <StarRating value={rating} onChange={setRating} label="¿Cómo fue el servicio?" />
          <FormField label="Comentario" optional hint={`${review.length}/200`}>
            {(p) => (
              <textarea
                {...p}
                value={review}
                onChange={(e) => setReview(e.target.value.slice(0, 200))}
                placeholder="Deja un comentario (opcional)"
                className="input-field h-24 resize-none"
              />
            )}
          </FormField>
          <FormField label="Alias" optional hint="Si no pones uno, saldrá como “Anónimo”. Nunca mostramos tu nombre.">
            {(p) => <input {...p} value={alias} onChange={(e) => setAlias(e.target.value.slice(0, 30))} maxLength={30} className="input-field" />}
          </FormField>
          <p className="text-xs text-slate-500">Al publicar, tu comentario y tus estrellas se verán en el perfil de {firstName}.</p>
          <button type="button" onClick={() => send()} disabled={saving || (!rating && !review.trim())} className="btn-primary w-full">
            {saving ? 'Publicando…' : 'Publicar comentario'}
          </button>
          <button type="button" onClick={() => send({ thanks: true })} disabled={saving || Boolean(rating || review.trim())} className="btn-secondary w-full">
            Enviar agradecimiento
          </button>
          <button type="button" onClick={() => finish()} className="w-full text-center text-sm font-bold underline underline-offset-2">
            Ahora no
          </button>
        </section>
      )}

      {ok && state === 'sent' && (
        <div className="space-y-4 text-center">
          <p className="font-display text-2xl font-extrabold">¡Gracias!</p>
          <Link to="/" className="btn-primary w-full">
            Volver a la página principal
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- the page */

export default function SendTip() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [savingContact, setSavingContact] = useState(false);
  const [feeInfo, setFeeInfo] = useState(null);

  // Coming back from Cheqpay's hosted page: ask the server what happened.
  const [search, setSearch] = useSearchParams();
  const ref = search.get('ref');
  const [returning, setReturning] = useState(Boolean(ref));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .get('/tips/fee-info')
      .then(({ data }) => setFeeInfo({ provider: data.provider || 'stripe', feePercent: data.feePercent, feeFixedCents: data.feeFixedCents, minCents: data.minCents }))
      .catch(() => setFeeInfo({ provider: 'stripe', feePercent: 6, feeFixedCents: 400 }));
  }, []);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    const invoice = search.get('cp_invoice_id');
    api
      .post('/tips/confirm', {
        paymentIntentId: `cheqpay:${ref}`,
        ...(invoice && /^[a-f\d]{24}$/i.test(invoice) ? { invoiceId: invoice } : {}),
      })
      .then(({ data }) => {
        if (!alive) return;
        if (data.transaction.status === 'failed') setFailed(true);
        else setReceipt({ transaction: data.transaction, paymentIntentId: `cheqpay:${ref}` });
      })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setReturning(false));
    return () => {
      alive = false;
    };
  }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        // The page's own <script> in index.html already started this request
        // when the QR was opened; reuse it so we don't wait twice.
        const pre = takeWorkerPrefetch(username);
        if (pre) {
          try {
            const r = await pre;
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

  // Created once with a first amount; the checkout then keeps it in sync.
  const elementsOptions = useMemo(
    () => ({ mode: 'payment', amount: 5000, currency: 'mxn', paymentMethodTypes: ['card'], appearance: APPEARANCE, locale: 'es' }),
    []
  );

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

  if (loading || !feeInfo) {
    // A skeleton of the page, so something friendly shows instantly even if the
    // server is still waking up.
    return (
      <div className="page-shell" aria-busy="true" aria-label="Cargando perfil">
        <div className="mt-6 flex items-center gap-3">
          <div className="h-14 w-14 animate-pulse rounded-full border-2 border-punch-ink/20 bg-punch-pink/60" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded-full bg-punch-ink/10" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-punch-ink/10" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[4.25rem] animate-pulse rounded-3xl bg-punch-ink/10" />
          ))}
        </div>
        <div className="mt-6 h-12 animate-pulse rounded-full bg-punch-orange/40" />
        <p className="mt-6 text-center text-sm font-medium text-slate-400">Abriendo el perfil…</p>
      </div>
    );
  }

  if (!worker) return null;

  if (returning) {
    return (
      <div className="page-shell items-center text-center" aria-busy="true">
        <p className="mt-24 font-display text-2xl font-extrabold">Confirmando tu pago…</p>
        <p className="mt-2 text-sm font-medium text-slate-400">No cierres esta página ni vuelvas a pagar.</p>
      </div>
    );
  }

  if (failed && !receipt) {
    return (
      <div className="page-shell items-center text-center">
        <p className="mt-16 font-display text-3xl font-extrabold">El pago no se completó</p>
        <p className="mt-3 max-w-sm text-slate-400">No se hizo ningún cobro. Puedes intentarlo de nuevo.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setSearch({}, { replace: true });
          }}
          className="btn-primary mt-6"
        >
          Intentar de nuevo
        </button>
        <Link to={`/p/${worker.username}`} className="btn-secondary mt-3">
          Volver al perfil
        </Link>
      </div>
    );
  }

  if (!worker.readyForTips && !receipt) {
    return (
      <div className="page-shell items-center text-center">
        <div className="mt-10">
          <Identity worker={worker} />
        </div>
        <p className="mt-6 max-w-sm text-slate-400">Esta persona no puede recibir propinas por ahora. Puedes dejar un comentario sin pago.</p>
        <Link to={`/p/${worker.username}/comentar`} className="btn-primary mt-6">
          Dejar un comentario
        </Link>
        <Link to={`/p/${worker.username}`} className="btn-secondary mt-3">
          Volver al perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell md:!max-w-[480px]">
      {!receipt && (
        <Link to={`/p/${worker.username}`} className="flex items-center gap-1 text-sm text-slate-400">
          <ArrowLeft size={16} />
          Volver al perfil
        </Link>
      )}

      {receipt ? (
        <div className="mt-6">
          <Confirmation worker={worker} receipt={receipt} user={user} />
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-start justify-between gap-3">
            <Identity worker={worker} />
            {user && (
              <button
                onClick={handleSaveContact}
                disabled={savingContact}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-punch-ink/40 text-slate-400 hover:border-punch-ink hover:text-punch-ink"
                aria-label="Guardar contacto"
              >
                <UserPlus size={17} />
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border-2 border-punch-ink/25 bg-white p-1 text-center font-display text-sm font-extrabold">
            <span aria-current="page" className="flex min-h-[44px] items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow">
              Dejar propina
            </span>
            <Link to={`/p/${worker.username}/comentar`} className="flex min-h-[44px] items-center justify-center rounded-full border-2 border-transparent text-punch-ink/80 hover:text-punch-ink">
              Comentar
            </Link>
          </div>

          <div className="mt-6">
            <Elements stripe={feeInfo.provider === 'cheqpay' ? null : getStripe()} options={elementsOptions}>
              <Checkout worker={worker} username={username} user={user} onPaid={setReceipt} initialFeeInfo={feeInfo} />
            </Elements>
          </div>

          {worker.reviews?.length > 0 && (
            <section className="mt-10 border-t-2 border-punch-ink/15 pt-6">
              <h2 className="font-display text-lg font-extrabold">Lo que dicen de esta persona</h2>
              <div className="mt-3">
                <ReviewList reviews={worker.reviews} limit={2} />
              </div>
              <Link to={`/p/${worker.username}`} className="mt-3 inline-block text-sm font-bold text-brand-400 underline underline-offset-2">
                Ver todas
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// Used by the profile page too.
export { Identity };
