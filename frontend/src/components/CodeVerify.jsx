import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Smartphone } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import FormField from './FormField.jsx';
import OtpInput from './OtpInput.jsx';
import IconBadge from './IconBadge.jsx';

// "Give us your phone or email, type the code we send you." Used to create an
// account (purpose "register") and to sign in (purpose "login"). It only deals
// with proving the contact; what happens next is up to the parent.
export default function CodeVerify({ purpose, channels, onVerified, onPhase, heading, intro }) {
  const hasPhone = channels.includes('sms');
  const hasEmail = channels.includes('email');
  const [method, setMethod] = useState(hasPhone ? 'phone' : 'email');
  const [via, setVia] = useState('sms'); // sms | whatsapp (only when phone)
  const [value, setValue] = useState('');
  const [phase, setPhase] = useState('contact'); // contact | code
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  const channel = method === 'email' ? 'email' : via;

  useEffect(() => {
    onPhase?.(phase);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (e) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/otp/send', { channel, destination: value, purpose });
      setSentTo(data.sentTo);
      setWait(data.resendInSec || 30);
      setCode('');
      setPhase('code');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (full) => {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { channel, destination: value, purpose, code: full });
      onVerified(data, { channel, destination: value });
    } catch (err) {
      setError(getErrorMessage(err));
      setCode('');
      setBusy(false);
    }
  };

  if (phase === 'code') {
    return (
      <div className="text-center">
        <IconBadge icon={channel === 'email' ? Mail : MessageCircle} tone="pink" size={64} className="mx-auto" />
        <h1 className="mt-5 text-3xl font-extrabold">Ingresa el código</h1>
        <p className="mt-2 text-sm text-slate-400">
          Te lo enviamos a <span className="font-bold text-punch-ink">{sentTo}</span>.
        </p>

        <div className="mt-6">
          <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={busy} hasError={Boolean(error)} />
          <p className="mt-3 min-h-[1.25rem] text-sm font-semibold text-red-700" role="alert" aria-live="polite">
            {error}
          </p>
        </div>

        <button
          type="button"
          onClick={() => verify(code)}
          disabled={busy || code.length < 6}
          className="btn-primary mt-2 w-full"
        >
          {busy ? 'Verificando…' : 'Verificar'}
        </button>

        <p className="mt-5 text-sm text-slate-400">
          ¿No te llegó?{' '}
          {wait > 0 ? (
            <span>Puedes pedir otro en {wait} s</span>
          ) : (
            <button type="button" onClick={send} disabled={busy} className="font-bold text-brand-400 underline underline-offset-2">
              Reenviar código
            </button>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            setPhase('contact');
            setError('');
          }}
          className="mt-2 text-sm font-semibold text-slate-400 underline underline-offset-2"
        >
          {method === 'email' ? 'Cambiar correo' : 'Cambiar número'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send}>
      {heading}
      {intro}

      {hasPhone && hasEmail && (
        <div role="tablist" aria-label="Cómo quieres recibir el código" className="mt-6 flex gap-2 rounded-full border-2 border-punch-ink/30 bg-white p-1">
          {[
            ['phone', 'Teléfono', Smartphone],
            ['email', 'Correo', Mail],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={method === id}
              onClick={() => {
                setMethod(id);
                setValue('');
                setError('');
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 font-display text-sm font-extrabold transition ${
                method === id ? 'bg-punch-ink text-punch-yellow' : 'text-slate-400'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {method === 'phone' ? (
          <FormField label="Tu número de celular" hint="Solo para enviarte el código. No lo compartimos." error={error}>
            {(p) => (
              <div className="flex items-center rounded-2xl border-2 border-punch-ink/30 bg-white px-4 focus-within:border-punch-ink focus-within:ring-2 focus-within:ring-punch-yellow">
                <span className="border-r-2 border-punch-ink/15 pr-3 font-bold text-punch-ink">+52</span>
                <input
                  {...p}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="55 1234 5678"
                  className="w-full bg-transparent px-3 py-3 text-lg outline-none"
                  required
                />
              </div>
            )}
          </FormField>
        ) : (
          <FormField label="Tu correo" hint="Te enviamos un código de 6 dígitos." error={error}>
            {(p) => (
              <input
                {...p}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="tu@correo.com"
                className="input-field text-lg"
                required
              />
            )}
          </FormField>
        )}
      </div>

      {method === 'phone' && channels.includes('whatsapp') && (
        <fieldset className="mt-4">
          <legend className="mb-1.5 text-sm font-bold">Recibir el código por</legend>
          <div className="flex gap-2">
            {[
              ['sms', 'SMS'],
              ['whatsapp', 'WhatsApp'],
            ].map(([id, label]) => (
              <label
                key={id}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-full border-2 py-2 font-display text-sm font-extrabold ${
                  via === id ? 'border-punch-ink bg-punch-yellow' : 'border-punch-ink/30 bg-white'
                }`}
              >
                <input type="radio" name="via" value={id} checked={via === id} onChange={() => setVia(id)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <button type="submit" disabled={busy || !value.trim()} className="btn-primary mt-6 w-full">
        {busy ? 'Enviando…' : 'Enviar código'}
      </button>
    </form>
  );
}
