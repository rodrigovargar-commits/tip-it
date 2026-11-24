import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import FormField from '../../components/FormField.jsx';
import Spinner from '../../components/Spinner.jsx';
import { photoSrc } from '../../utils/avatar.js';

const PENDING_KEY = 'tipit_join_code';
const clean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const pretty = (v) => (v.length > 4 ? `${v.slice(0, 4)}-${v.slice(4)}` : v);
const day = (iso) => new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' });
const time = (iso) => new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

const MODES = [
  { id: 'full', title: 'Trabajo aquí de tiempo completo', text: 'Cuentan todas mis propinas y reseñas desde hoy, también las de mi QR personal.' },
  { id: 'part', title: 'Trabajo aquí a veces', text: 'Solo cuentan las que lleguen por el QR de esta empresa. Mi QR personal sigue siendo solo mío.' },
];

export default function JoinBusiness() {
  const { user, worker, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState(clean(params.get('c') || ''));
  const [found, setFound] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('full');
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  // Remember the code from the link while the person signs in or creates an
  // account, so the dashboard can offer to finish joining.
  useEffect(() => {
    if (code.length === 8) {
      try { localStorage.setItem(PENDING_KEY, code); } catch { /* storage blocked */ }
    }
  }, [code]);

  useEffect(() => {
    setFound(null);
    setError('');
    setAccepted(false);
    if (code.length !== 8 || !user) return undefined;
    let alive = true;
    api
      .get('/business/lookup', { params: { code } })
      .then(({ data }) => alive && setFound(data.business))
      .catch((err) => alive && setError(getErrorMessage(err)));
    return () => { alive = false; };
  }, [code, user]);

  const isEvent = found?.kind === 'event';
  const ended = found?.state === 'ended';
  const place = found ? `${found.name}${found.location ? ` · ${found.location}` : ''}` : '';

  const join = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/business/join', { code, accept: true, mode: isEvent ? 'part' : mode });
      try { localStorage.removeItem(PENDING_KEY); } catch { /* storage blocked */ }
      setDone(data.membership);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;

  if (done) {
    return (
      <div className="page-shell items-center text-center">
        <CheckCircle2 size={44} className="mt-6 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-3 text-3xl font-extrabold">Ya eres parte de {done.business}</h1>
        {done.kind === 'event' && <p className="mt-1 font-semibold">{done.location}</p>}
        <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
          Esto es tu QR de {done.qr?.name || 'la empresa'}. Tenlo a la vista: lo que llegue por aquí lo ve la empresa, desde hoy.
          Tu QR personal sigue igual, y todo el dinero llega a tu misma cuenta.
        </p>
        {done.qr?.image && (
          <div className="mt-5 rounded-3xl border-2 border-punch-ink bg-white p-4 shadow-[6px_6px_0_0_#0A2F2F]">
            <img src={done.qr.image} alt={`Tu QR de ${done.business}`} width="240" height="240" className="h-60 w-60" />
          </div>
        )}
        <div className="mt-6 grid w-full max-w-sm gap-3">
          <Link to="/worker/qr" className="btn-primary">Ver y descargar mis QR</Link>
          <Link to="/worker/dashboard" className="btn-secondary">Ir a mi panel</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Mi equipo" title="Unirme a un negocio o evento" subtitle="Escribe el código que te dio quien lo administra." />

      {!user ? (
        <div className="mt-6 card space-y-3">
          <p className="font-medium">Para unirte necesitas una cuenta para recibir propinas. Guardamos tu código para que no lo pierdas.</p>
          <Link to="/register?role=worker" className="btn-primary w-full">Crear mi cuenta</Link>
          <Link to="/login" className="btn-secondary w-full">Ya tengo cuenta</Link>
        </div>
      ) : !worker ? (
        <div className="mt-6 card space-y-3">
          <p className="font-medium">Primero crea tu QR para recibir propinas y después vuelve aquí con tu código.</p>
          <Link to="/worker/setup" className="btn-primary w-full">Crear mi QR</Link>
        </div>
      ) : (
        <form onSubmit={join} className="mt-6 card space-y-4">
          <FormField label="Código" error={error}>
            {(p) => (
              <input
                {...p}
                className="input-field text-center font-display text-2xl font-extrabold uppercase tracking-[0.2em]"
                value={pretty(code)}
                onChange={(e) => setCode(clean(e.target.value))}
                placeholder="ABCD-2345"
                autoComplete="off"
                autoCapitalize="characters"
                inputMode="text"
              />
            )}
          </FormField>

          {found && (
            <>
              <div className="rounded-2xl bg-punch-yellow p-3">
                <div className="flex items-center gap-3">
                  {found.logoUrl && (
                    <img src={photoSrc(found.logoUrl)} alt="" className="h-12 w-12 shrink-0 rounded-full border-2 border-punch-ink bg-white object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-lg font-extrabold">{found.name}</p>
                    {found.typeLabel && found.type !== 'otro' && <p className="text-xs font-bold text-punch-ink/70">{found.typeLabel}</p>}
                  </div>
                </div>
                {found.location && <p className="text-sm font-bold">{found.location}</p>}
                {isEvent && found.startsAt && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm font-medium">
                    <CalendarDays size={15} className="mt-0.5 shrink-0" />
                    <span>Evento: del {day(found.startsAt)}, {time(found.startsAt)}, al {day(found.endsAt)}, {time(found.endsAt)}</span>
                  </p>
                )}
              </div>

              {ended ? (
                <p className="rounded-2xl bg-punch-pink p-3 text-sm font-semibold">Este evento ya terminó, así que ya no se puede unir nadie.</p>
              ) : (
                <>
                  {isEvent ? (
                    <p className="rounded-2xl bg-white p-3 text-sm font-medium ring-1 ring-punch-ink/15">
                      Te daremos un QR solo para este evento. La empresa verá lo que llegue por ese QR durante el evento, y después podrá revisar cómo les fue.
                    </p>
                  ) : (
                    <fieldset>
                      <legend className="mb-2 text-base font-bold">¿Cómo trabajas aquí?</legend>
                      <div className="grid gap-2">
                        {MODES.map((m) => (
                          <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 ${mode === m.id ? 'border-punch-ink bg-punch-yellow/50' : 'border-punch-ink/20 bg-white'}`}>
                            <input type="radio" name="mode" className="mt-1 h-4 w-4 shrink-0" checked={mode === m.id} onChange={() => setMode(m.id)} />
                            <span>
                              <span className="block font-display font-extrabold">{m.title}</span>
                              <span className="block text-sm font-medium text-slate-500">{m.text}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  <label className="flex items-start gap-3 text-sm font-medium">
                    <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                    <span>
                      Acepto que {place} vea cuántas propinas recibo, mis estrellas y las reseñas que me dejan, <strong>solo desde hoy</strong>:
                      nada de antes. No verá cuánto dinero recibo: llega directo a mi banco. Puedo salir cuando quiera.
                    </span>
                  </label>
                  <button type="submit" disabled={!accepted || saving} className="btn-primary w-full">
                    {saving ? 'Uniéndome...' : 'Unirme'}
                  </button>
                </>
              )}
            </>
          )}
        </form>
      )}
    </div>
  );
}
