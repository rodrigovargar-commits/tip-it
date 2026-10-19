import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import Spinner from '../../components/Spinner.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import FormField from '../../components/FormField.jsx';

const RFC_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;

// Data that Cheqpay's onboarding form asks for (Persona Física). The person
// types it once here; their name, phone, email and activity come prefilled.
export default function CheqpayAlta() {
  const [app, setApp] = useState(null);
  const [form, setForm] = useState(null);
  const [rfc, setRfc] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get('/workers/cheqpay/application')
      .then(({ data }) => {
        const a = data.application;
        setApp(a);
        setSaved(a.status !== 'none');
        setAccepted(a.termsAccepted);
        setForm({
          legalName: a.legalName,
          nationality: a.nationality,
          phone: a.phone,
          email: a.email,
          giro: a.giro,
          giroOther: a.giroOther,
        });
      })
      .catch((err) => toast.error(getErrorMessage(err)));
  }, []);

  if (!form) {
    return (
      <div className="page-shell flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const locked = ['submitted', 'approved'].includes(app.status);

  const validate = () => {
    const e = {};
    if (form.legalName.trim().length < 3) e.legalName = 'Escribe tu nombre completo';
    if (form.nationality.trim().length < 2) e.nationality = 'Escribe tu nacionalidad';
    if (!/^\d{10,15}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Escribe un teléfono de 10 dígitos';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Escribe un correo válido';
    if (!form.giro) e.giro = 'Elige un giro';
    if (form.giro === 'otros' && !form.giroOther.trim()) e.giroOther = 'Cuéntanos qué servicio das';
    const cleanRfc = rfc.replace(/\s+/g, '').toUpperCase();
    if (cleanRfc && !RFC_FISICA.test(cleanRfc)) e.rfc = 'El RFC de una persona física tiene 13 caracteres';
    if (!accepted) e.terms = 'Para continuar acepta los términos';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Revisa los campos marcados');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/workers/cheqpay/application', {
        ...form,
        rfc: rfc.replace(/\s+/g, '').toUpperCase(),
        acceptTerms: true,
      });
      setApp(data.application);
      setSaved(true);
      setRfc('');
      toast.success('Datos guardados');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const giroLabel = app.giros.find((g) => g.id === form.giro)?.label;

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Activa tus cobros" title="Tus datos para cobrar" subtitle="Cheqpay procesa tus cobros y te deposita el siguiente día hábil. Te pedimos lo mismo que su formulario, una sola vez." />

      {saved && (
        <div className="mt-6 card flex gap-3 !bg-punch-yellow">
          <ShieldCheck size={22} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            {app.status === 'approved' ? (
              <>
                <p className="font-display text-lg font-extrabold">Tu cuenta de cobros está activa</p>
                <p className="mt-1 text-sm text-slate-400">Ya puedes recibir propinas con tu QR.</p>
              </>
            ) : (
              <>
                <p className="font-display text-lg font-extrabold">{app.status === 'submitted' ? 'Cheqpay está revisando tu alta' : 'Tus datos ya están guardados'}</p>
                <p className="mt-1 text-sm font-medium">
                  {form.legalName} · {giroLabel}
                  {form.giro === 'otros' && form.giroOther ? ` (${form.giroOther})` : ''}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Cheqpay es quien hace tu alta. Abre su formulario y llénalo con estos mismos datos. Cuando te aprueben, activamos tu perfil para recibir propinas.
                </p>
                <a href={app.formUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full gap-2">
                  <ExternalLink size={16} /> Abrir el formulario de Cheqpay
                </a>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <fieldset disabled={locked || saving} className="space-y-4">
          <FormField label="Nombre completo" error={errors.legalName} hint="Como aparece en tu identificación.">
            {(p) => <input {...p} value={form.legalName} onChange={set('legalName')} autoComplete="name" maxLength={120} className="input-field" />}
          </FormField>
          <FormField label="RFC" optional error={errors.rfc} hint={app.hasRfc ? `Ya tenemos uno guardado (${app.rfcMasked}). Déjalo vacío para conservarlo.` : 'No es obligatorio para personas físicas.'}>
            {(p) => <input {...p} value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" maxLength={13} className="input-field uppercase" />}
          </FormField>
          <FormField label="Nacionalidad" error={errors.nationality}>
            {(p) => <input {...p} value={form.nationality} onChange={set('nationality')} maxLength={60} className="input-field" />}
          </FormField>
          <FormField label="Teléfono" error={errors.phone}>
            {(p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className="input-field" />}
          </FormField>
          <FormField label="Correo electrónico" error={errors.email}>
            {(p) => <input {...p} type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set('email')} className="input-field" />}
          </FormField>
          <FormField label="Giro del comercio" error={errors.giro} hint="Lo elegimos según tu actividad; cámbialo si no te describe.">
            {(p) => (
              <select {...p} value={form.giro} onChange={set('giro')} className="input-field">
                <option value="">Elige uno</option>
                {app.giros.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          {form.giro === 'otros' && (
            <FormField label="¿Qué servicio das?" error={errors.giroOther}>
              {(p) => <input {...p} value={form.giroOther} onChange={set('giroOther')} maxLength={100} className="input-field" />}
            </FormField>
          )}

          <div>
            <label className="flex items-start gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                aria-invalid={errors.terms ? true : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-punch-ink"
              />
              <span>
                He leído y acepto los{' '}
                <a href={app.termsUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  términos de servicio, la política de privacidad y la declaración anticorrupción de Cheqpay
                </a>
                . También el{' '}
                <Link to="/privacidad" className="font-bold underline">
                  aviso de privacidad de TIP-IT
                </Link>
                .
              </span>
            </label>
            {errors.terms && (
              <p role="alert" className="mt-1 text-sm font-semibold text-red-700">
                {errors.terms}
              </p>
            )}
          </div>
        </fieldset>

        {locked ? (
          <p className="rounded-2xl bg-white/80 p-3 text-center text-sm text-slate-400">Tu solicitud ya fue enviada. Si necesitas cambiar algo, escríbenos.</p>
        ) : (
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Guardando...' : saved ? 'Actualizar mis datos' : 'Guardar mis datos'}
          </button>
        )}
      </form>

      <Link to="/worker/dashboard" className="mt-4 block text-center text-sm font-bold underline">
        Volver a mi panel
      </Link>
    </div>
  );
}
