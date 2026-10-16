import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Camera, Check, Landmark, Share2, ShieldCheck } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { trackEvent } from '../utils/analytics.js';
import { ACTIVITIES, activityLabel } from '../utils/activities.js';
import { fileToResizedDataUrl } from '../utils/image.js';
import Avatar from './Avatar.jsx';
import CodeVerify from './CodeVerify.jsx';
import FormField from './FormField.jsx';
import IconBadge from './IconBadge.jsx';
import Logo from './Logo.jsx';

// Sign-up in small steps, one question each:
//   1 account (phone or email + code) → 2 what you do → 3 your profile →
//   4 connect the bank → 5 done (QR). Someone who only wants to PAY skips
//   steps 2–4. Nothing is created until the profile step, so leaving early
//   leaves no half-made account behind.
const WORKER_STEPS = ['contact', 'activity', 'profile', 'bank', 'done'];
const CLIENT_STEPS = ['contact', 'name'];

const stepNumber = (steps, step) => Math.max(1, steps.indexOf(step) + 1);

function Progress({ steps, step }) {
  const n = stepNumber(steps, step);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>
          Paso {n} de {steps.length}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-punch-ink/10" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={n}>
        <div className="h-full rounded-full bg-punch-orange transition-all" style={{ width: `${(n / steps.length) * 100}%` }} />
      </div>
    </div>
  );
}

function Heading({ title, subtitle }) {
  return (
    <>
      <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-400 md:text-base">{subtitle}</p>}
    </>
  );
}

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-punch-ink">
      <ArrowLeft size={15} /> Atrás
    </button>
  );
}

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;

export default function SignupFlow({ channels, defaultRole = 'worker' }) {
  const navigate = useNavigate();
  const { login, refreshMe, worker } = useAuth();
  const photoInput = useRef(null);

  const [role, setRole] = useState(defaultRole === 'worker' ? 'worker' : 'client');
  const [step, setStep] = useState('contact');
  const [proof, setProof] = useState(null);
  const [activity, setActivity] = useState('');
  const [occupation, setOccupation] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState(null);
  const [accountMade, setAccountMade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [codePhase, setCodePhase] = useState('contact');
  const [usernameState, setUsernameState] = useState('idle'); // idle | invalid | checking | free | taken
  const steps = role === 'worker' ? WORKER_STEPS : CLIENT_STEPS;

  useEffect(() => {
    if (!username) {
      setUsernameState('idle');
      return undefined;
    }
    if (!USERNAME_RE.test(username)) {
      setUsernameState('invalid');
      return undefined;
    }
    setUsernameState('checking');
    let alive = true;
    const t = setTimeout(async () => {
      try {
        await api.get(`/workers/${username.toLowerCase()}`);
        if (alive) setUsernameState('taken');
      } catch (err) {
        if (alive) setUsernameState(err.response?.status === 404 ? 'free' : 'idle');
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [username]);

  const handleVerified = (data, info) => {
    setProof({ verificationToken: data.verificationToken, ...info });
    trackEvent('signup_step', { step: 'verified', channel: info.channel });
    setStep(role === 'worker' ? 'activity' : 'name');
  };

  const createAccount = async () => {
    if (accountMade) return;
    const { data } = await api.post('/auth/register', { name: name.trim(), verificationToken: proof.verificationToken });
    await login(data.token, data.user);
    setAccountMade(true);
    trackEvent('sign_up', { method: proof.channel, role });
  };

  const handleClientDone = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createAccount();
      toast.success('¡Cuenta creada!');
      navigate('/scan');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleProfile = async (e) => {
    e.preventDefault();
    if (usernameState === 'taken' || usernameState === 'invalid') return;
    setBusy(true);
    try {
      await createAccount();
      if (photo) await api.put('/users/profile', { avatarUrl: photo }).catch(() => {});
      await api.post('/workers/register', {
        username,
        bio,
        publicName: name.trim(),
        activity: activity || undefined,
        occupation: occupation.trim() || undefined,
      });
      await refreshMe();
      trackEvent('signup_step', { step: 'profile_created' });
      setStep('bank');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Elige un archivo de imagen');
      return;
    }
    try {
      setPhoto(await fileToResizedDataUrl(file));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const connectBank = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/workers/stripe/onboarding-link');
      trackEvent('signup_step', { step: 'bank_started' });
      window.location.assign(data.url);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(false);
    }
  };

  const shareProfile = async () => {
    const url = `${window.location.origin}/p/${worker?.username}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Mi perfil en TIP-IT', url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Enlace copiado');
      }
    } catch {
      // the person closed the share sheet: nothing to do
    }
  };

  /* ------------------------------------------------------------ steps */

  if (step === 'contact') {
    return (
      <div>
        <Progress steps={steps} step={step} />
        <CodeVerify
          purpose="register"
          channels={channels}
          onVerified={handleVerified}
          onPhase={setCodePhase}
          heading={
            <>
              <Logo size={48} className="mb-4" />
              <Heading
                title="Crea tu cuenta"
                subtitle={role === 'worker' ? 'Comienza a recibir comentarios y propinas por tu trabajo.' : 'Para guardar tu historial y tus contactos.'}
              />
            </>
          }
        />
        {codePhase === 'contact' && (
          <>
            <p className="mt-4 text-center text-xs text-slate-500">
              Al continuar aceptas nuestros{' '}
              <Link to="/terminos" className="text-brand-400 underline underline-offset-2" target="_blank">
                Términos de uso
              </Link>{' '}
              y el{' '}
              <Link to="/privacidad" className="text-brand-400 underline underline-offset-2" target="_blank">
                Aviso de privacidad
              </Link>
              .
            </p>
            <button
              type="button"
              onClick={() => setRole(role === 'worker' ? 'client' : 'worker')}
              className="mt-4 w-full text-center text-sm font-semibold text-slate-400 underline underline-offset-2"
            >
              {role === 'worker' ? 'Solo quiero dar propinas (no necesitas cuenta)' : 'Quiero recibir propinas'}
            </button>
            <p className="mt-4 text-center text-sm text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-semibold text-brand-400">
                Inicia sesión
              </Link>
            </p>
          </>
        )}
      </div>
    );
  }

  if (step === 'name') {
    return (
      <form onSubmit={handleClientDone}>
        <Progress steps={steps} step={step} />
        <Heading title="¿Cómo te llamamos?" subtitle="Último paso." />
        <div className="mt-6">
          <FormField label="Tu nombre">
            {(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input-field" required maxLength={100} />}
          </FormField>
        </div>
        <button type="submit" disabled={busy || !name.trim()} className="btn-primary mt-6 w-full">
          {busy ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>
    );
  }

  if (step === 'activity') {
    return (
      <div>
        <Progress steps={steps} step={step} />
        <BackButton onClick={() => setStep('contact')} />
        <Heading title="Tu actividad" subtitle="Cuéntanos a qué te dedicas para mostrarlo en tu perfil." />
        <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Actividad">
          {ACTIVITIES.map(({ id, label, icon, tone }) => {
            const on = activity === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setActivity(id)}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                  on ? 'border-punch-ink bg-punch-yellow shadow-[3px_3px_0_0_#0A2F2F]' : 'border-punch-ink/25 bg-white hover:border-punch-ink'
                }`}
              >
                <IconBadge icon={icon} tone={tone} size={40} />
                <span className="font-display text-sm font-extrabold leading-tight">{label}</span>
                {on && <Check size={16} className="ml-auto shrink-0" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          <FormField label="Tu ocupación" optional hint="Por ejemplo: barbero, manicurista, violinista.">
            {(p) => <input {...p} value={occupation} onChange={(e) => setOccupation(e.target.value)} maxLength={60} className="input-field" />}
          </FormField>
        </div>
        <button type="button" onClick={() => setStep('profile')} disabled={!activity} className="btn-primary mt-6 w-full">
          Continuar
        </button>
      </div>
    );
  }

  if (step === 'profile') {
    const usernameError =
      usernameState === 'taken' ? 'Ese usuario ya está en uso, prueba con otro.' : usernameState === 'invalid' ? 'Usa de 3 a 30 letras, números, punto o guion bajo.' : '';
    return (
      <form onSubmit={handleProfile}>
        <Progress steps={steps} step={step} />
        <BackButton onClick={() => setStep('activity')} />
        <Heading title="Crea tu perfil" subtitle="Muéstrate como profesional." />

        <div className="mt-5 flex justify-center">
          <button type="button" onClick={() => photoInput.current?.click()} className="relative" aria-label="Agregar foto de perfil">
            <Avatar src={photo} name={name || '?'} size={96} />
            <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow">
              <Camera size={16} />
            </span>
          </button>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">La foto es opcional. Puedes cambiarla después.</p>

        <div className="mt-5 space-y-4">
          <FormField label="Nombre público" hint="Como quieres que te llamen tus clientes.">
            {(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} className="input-field" required />}
          </FormField>
          <FormField label="Cómo quieres que te vean las personas" error={usernameError} hint={usernameState === 'free' ? '¡Disponible!' : 'Será tu nombre en tu enlace y en tu QR.'}>
            {(p) => (
              <div className="flex items-center rounded-2xl border-2 border-punch-ink/30 bg-white px-4 focus-within:border-punch-ink focus-within:ring-2 focus-within:ring-punch-yellow">
                <span className="text-slate-500">@</span>
                <input
                  {...p}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  maxLength={30}
                  placeholder="tu_usuario"
                  className="w-full bg-transparent px-2 py-3 outline-none"
                  required
                />
              </div>
            )}
          </FormField>
          <FormField label="Bio" optional hint={`${bio.length}/200`}>
            {(p) => (
              <textarea
                {...p}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                placeholder="Cuéntale a la gente qué haces."
                className="input-field h-24 resize-none"
              />
            )}
          </FormField>
        </div>

        <button type="submit" disabled={busy || !name.trim() || usernameState !== 'free'} className="btn-primary mt-6 w-full">
          {busy ? 'Creando tu perfil…' : 'Crear mi perfil'}
        </button>
      </form>
    );
  }

  if (step === 'bank') {
    return (
      <div>
        <Progress steps={steps} step={step} />
        <IconBadge icon={Landmark} tone="teal" size={64} />
        <div className="mt-5">
          <Heading title="¿Dónde recibirás tus propinas?" subtitle="Conecta tu cuenta de banco una sola vez." />
        </div>
        <div className="card mt-5 !bg-punch-yellow/40">
          <p className="flex items-start gap-2 text-sm font-medium">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <span>
              Verificamos tu identidad con Stripe, nuestro procesador de pagos. TIP-IT no guarda tus datos bancarios ni tu documento. El proceso toma unos minutos.
            </span>
          </p>
        </div>
        <button type="button" onClick={connectBank} disabled={busy} className="btn-primary mt-6 w-full">
          {busy ? 'Abriendo…' : 'Conectar mi banco'}
        </button>
        <button type="button" onClick={() => setStep('done')} className="mt-3 w-full text-center text-sm font-semibold text-slate-400 underline underline-offset-2">
          Lo hago después
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">Mientras no la conectes, tu perfil se ve, pero no podrás recibir pagos.</p>
      </div>
    );
  }

  // done
  return (
    <div className="text-center">
      <Progress steps={steps} step={step} />
      <span className="inline-block rounded-full border-2 border-punch-ink bg-punch-tealdark px-4 py-1 font-display text-sm font-extrabold text-white">Perfil creado</span>
      {worker?.qrCode && (
        <div className="mx-auto mt-5 w-56 rounded-3xl border-2 border-punch-ink bg-white p-3 shadow-[4px_4px_0_0_#0A2F2F]">
          <img src={worker.qrCode} alt={`Código QR de @${worker.username}`} className="w-full" />
        </div>
      )}
      <p className="mt-4 font-display text-2xl font-extrabold">{name || worker?.name}</p>
      <p className="text-sm font-semibold text-slate-400">{[activityLabel(worker?.activity), worker?.occupation].filter(Boolean).join(' · ')}</p>
      <p className="text-sm text-slate-400">@{worker?.username}</p>

      {!worker?.stripeOnboardingComplete && (
        <div className="card mt-5 !bg-punch-yellow/50 text-left">
          <p className="font-display font-extrabold">Propinas pendientes de verificación</p>
          <p className="mt-1 text-sm">Conecta tu banco para empezar a recibir propinas.</p>
          <button type="button" onClick={connectBank} disabled={busy} className="btn-secondary mt-3 w-full">
            Conectar mi banco
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={shareProfile}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-punch-ink bg-punch-ink px-6 py-3 font-display font-extrabold text-punch-yellow"
      >
        <Share2 size={16} /> Compartir mi perfil
      </button>
      <button type="button" onClick={() => navigate('/worker/dashboard')} className="btn-secondary mt-3 w-full">
        Ir a mi panel
      </button>
    </div>
  );
}
