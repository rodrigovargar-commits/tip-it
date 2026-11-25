import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Copy, Share2, RefreshCw, Star, Users, HandCoins, MessageSquareText, UserMinus, MapPin, Plus, Trash2, Pencil, CalendarDays, BarChart3, Wallet, Check, BadgeCheck,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import FormField from '../../components/FormField.jsx';
import Spinner from '../../components/Spinner.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import WalletButtons from '../../components/WalletButtons.jsx';
import { timeAgo } from '../../utils/time.js';
import ImageAdjuster from '../../components/ImageAdjuster.jsx';
import BusinessBadge from '../../components/BusinessBadge.jsx';
import { photoSrc } from '../../utils/avatar.js';
import { BUSINESS_TYPES, businessTypeLabel, BUSINESS_TERMS_VERSION } from '../../utils/businessTypes.js';

const PERIODS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

const STATE = { upcoming: 'Próximo', live: 'En curso', ended: 'Terminó' };
const shortDate = (iso) => new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
const shortTime = (iso) => new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
const range = (a, b) => `${shortDate(a)}, ${shortTime(a)} a ${shortDate(b)}, ${shortTime(b)}`;
const sinceText = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
const isEvent = (l) => l?.kind === 'event';

// An older server answers with one code on the business and no teams. Read both shapes,
// so a deploy that reaches the page before the server (or the reverse) never blanks it.
function normalizeBusiness(b) {
  if (!b) return null;
  if (Array.isArray(b.locations)) return b;
  const main = b.code
    ? [{ id: 'main', name: 'Principal', kind: 'team', code: b.code, codeText: b.codeText || b.code, joinUrl: b.joinUrl || '', memberCount: b.memberCount || 0 }]
    : [];
  return { ...b, locations: main };
}

function normalizeOverview(d) {
  if (!d) return d;
  const withNumbers = (x = {}) => ({
    ...x,
    period: { tips: 0, rating: null, reviews: 0, ...(x.period || {}) },
    total: { tips: 0, rating: null, ratingCount: 0, reviews: 0, ...(x.total || {}) },
  });
  return {
    ...d,
    business: normalizeBusiness(d.business),
    totals: { members: 0, pendingReviews: 0, ...withNumbers(d.totals) },
    locations: Array.isArray(d.locations) ? d.locations.map(withNumbers) : [],
    members: (d.members || []).map(withNumbers),
  };
}

function Stars({ value }) {
  if (!value) return <span className="text-sm text-slate-500">Sin calificaciones</span>;
  return (
    <span className="inline-flex items-center gap-1 font-display font-extrabold text-amber-700">
      <Star size={15} fill="#FF8243" stroke="#FF8243" /> {value}
    </span>
  );
}

function Badge({ children, tone = 'bg-punch-yellow' }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{children}</span>;
}

// What the owner gets, in plain words: the first thing this screen has to answer is "why create this".
const GAINS = [
  { icon: BarChart3, title: 'Ves cómo le va a tu gente', text: 'Cuántas propinas recibe cada persona y cada equipo, sus estrellas y sus reseñas, en un solo lugar.' },
  { icon: BadgeCheck, title: 'Tu negocio sale en cada perfil', text: 'Tu nombre y tu imagen aparecen en el perfil y en el QR de todos tus colaboradores. Tus clientes saben dónde están.' },
  { icon: Users, title: 'Sumas a tu equipo en minutos', text: 'Les das un código y cada quien se une con su cuenta. También puedes armar equipos y eventos con fecha.' },
  { icon: Wallet, title: 'Más propinas, menos efectivo', text: 'Tu gente cobra con tarjeta y celular, directo a su banco. Se siente reconocida y es más fácil que se quede.' },
];

function ProfilePreview({ name, typeId, logo }) {
  const business = { name: name.trim() || 'Nombre de tu negocio', typeLabel: typeId ? businessTypeLabel(typeId) : '' };
  return (
    <div className="mx-auto w-full max-w-xs overflow-hidden rounded-3xl border-2 border-punch-ink bg-punch-cream shadow-[4px_4px_0_0_#0A2F2F]" aria-label="Ejemplo de perfil de un colaborador">
      <div className="flex h-24 items-center justify-center bg-punch-yellow">
        <span aria-hidden="true" className="font-display text-6xl font-extrabold text-punch-ink/80">A</span>
      </div>
      <div className="space-y-2.5 px-4 pb-4 pt-3">
        <div>
          <p className="font-display text-xl font-extrabold leading-tight">Ana, tu colaboradora</p>
          <p className="text-sm font-semibold text-slate-500">Su perfil público</p>
        </div>
        <BusinessBadge business={business} logo={logo} />
        <p className="flex items-center gap-1 text-sm">
          <Star size={16} fill="#FF8243" stroke="#FF8243" /> <span className="font-display font-extrabold">4.9</span> <span className="text-slate-500">· ejemplo</span>
        </p>
        <div className="rounded-full bg-punch-ink py-2 text-center text-sm font-bold text-white">Dejar propina</div>
      </div>
    </div>
  );
}

function CreateBusiness({ onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [logo, setLogo] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const ready = name.trim().length >= 2 && Boolean(type) && accepted;
  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      await api.post('/business', { name, type, logo, acceptTerms: true });
      toast.success('Tu negocio quedó creado');
      onCreated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Para negocios"
        title="Crea el perfil de tu negocio"
        subtitle="Junta a tu gente en un solo lugar y conoce cómo les va con las propinas."
      />

      <section className="mt-6" aria-labelledby="gains-title">
        <h2 id="gains-title" className="font-display text-xl font-extrabold">¿Qué gana tu negocio?</h2>
        <ul className="mt-3 grid gap-3">
          {GAINS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="card flex items-start gap-3 !p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow"><Icon size={19} aria-hidden="true" /></span>
              <span>
                <span className="block font-display text-base font-extrabold">{title}</span>
                <span className="block text-sm font-medium text-slate-600">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-2xl bg-punch-pink px-4 py-3 text-sm font-bold">
          Crear tu perfil de negocio no te cuesta nada. Tu gente recibe su dinero directo en su banco y tú nunca lo ves ni lo manejas.
        </p>
      </section>

      <section className="mt-6" aria-labelledby="how-title">
        <h2 id="how-title" className="font-display text-xl font-extrabold">Cómo funciona</h2>
        <ol className="mt-3 grid gap-3 text-sm font-medium">
          {[
            'Creas tu negocio y recibes un código.',
            'Tu gente se une con ese código y recibe un QR de tu empresa, además del suyo.',
            'Tú ves propinas, estrellas y reseñas, solo desde el día que cada persona se une. Nunca ves el dinero.',
          ].map((t, i) => (
            <li key={t} className="card flex items-center gap-3 !p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow font-display font-extrabold">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </section>

      <form onSubmit={submit} className="mt-6 card space-y-6">
        <h2 className="font-display text-xl font-extrabold">Datos de tu negocio</h2>

        <FormField label="Nombre de tu negocio" hint="Es el nombre que verá tu gente al unirse y el de su QR.">
          {(p) => (
            <input {...p} className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Club de Golf Las Lomas" minLength={2} maxLength={60} required />
          )}
        </FormField>

        <fieldset>
          <legend className="mb-1.5 text-base font-bold text-punch-ink">Tipo de negocio</legend>
          <p className="mb-2 text-sm text-slate-500">Elige el que más se parezca al tuyo.</p>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={type === t.id}
                onClick={() => setType(t.id)}
                className={`min-h-[3rem] rounded-2xl border-2 border-punch-ink px-3 py-2 text-left text-sm font-bold leading-tight transition ${type === t.id ? 'bg-punch-yellow shadow-[3px_3px_0_0_#0A2F2F]' : 'bg-white hover:bg-punch-yellow/50'}`}
              >
                {type === t.id && <Check size={14} className="mr-1 inline" aria-hidden="true" />}
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <ImageAdjuster label="Imagen de tu negocio (opcional)" onChange={setLogo} onError={(m) => toast.error(m)} />
          <p className="mt-2 text-sm text-slate-500">
            Sube el logo o una foto del lugar para que tus clientes lo reconozcan. Aparecerá en el perfil de todas las personas que colaboran contigo. Puedes cambiarla cuando quieras.
          </p>
        </div>

        <div>
          <p className="mb-2 text-base font-bold text-punch-ink">Así se verá en el perfil de tu gente</p>
          <ProfilePreview name={name} typeId={type} logo={logo} />
          <p className="mt-2 text-center text-xs text-slate-500">Es un ejemplo. Mueve y acerca la imagen arriba hasta que te guste cómo queda.</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-punch-ink bg-white p-3">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#FF8243]" required />
          <span className="text-sm font-medium">
            Acepto los{' '}
            <Link to="/terminos-negocios" target="_blank" rel="noopener" className="font-bold underline underline-offset-2">términos y condiciones para negocios</Link>{' '}
            <span className="text-slate-500">(versión del {BUSINESS_TERMS_VERSION})</span>.
          </span>
        </label>

        <button type="submit" disabled={saving || !ready} className="btn-primary w-full">
          {saving ? 'Creando...' : 'Crear mi negocio'}
        </button>
        {!ready && (
          <p className="-mt-3 text-center text-xs text-slate-500">
            Para crearlo falta: {[name.trim().length < 2 && 'el nombre', !type && 'el tipo de negocio', !accepted && 'aceptar los términos'].filter(Boolean).join(', ')}.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Cada persona recibe su dinero directo en su banco y conserva sus reseñas. Tu negocio solo ve el número de propinas, las estrellas y las reseñas.
        </p>
      </form>
    </div>
  );
}

// Owner: the kind of business and its picture, shown on the profile of everyone on the team.
function BusinessIdentity({ business, onSaved }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(business.type || 'otro');
  const [logo, setLogo] = useState(undefined); // undefined = unchanged, null = remove
  const [saving, setSaving] = useState(false);
  const current = photoSrc(business.logoUrl);
  const incomplete = !business.logoUrl || !business.type || business.type === 'otro';

  const save = async () => {
    setSaving(true);
    try {
      const body = { type };
      if (logo !== undefined) body.logo = logo;
      await api.patch('/business/me', body);
      toast.success('Guardamos los cambios');
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 card !p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BusinessBadge business={{ name: business.name, logoUrl: business.logoUrl, typeLabel: business.typeLabel || businessTypeLabel(business.type) }} />
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-secondary !px-4 !py-2 text-sm" aria-expanded={open}>
          {open ? 'Cerrar' : incomplete ? 'Agregar imagen y tipo' : 'Editar imagen y tipo'}
        </button>
      </div>
      {incomplete && !open && <p className="mt-2 text-sm text-slate-500">Con tu imagen, tus clientes reconocen el lugar en el perfil de cada colaborador.</p>}
      {open && (
        <div className="mt-4 space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold">Tipo de negocio</legend>
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_TYPES.map((t) => (
                <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(t.id)} className={`min-h-[2.75rem] rounded-2xl border-2 border-punch-ink px-3 py-1.5 text-left text-sm font-bold leading-tight ${type === t.id ? 'bg-punch-yellow' : 'bg-white'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <ImageAdjuster label="Imagen de tu negocio" currentUrl={current} onChange={setLogo} onError={(m) => toast.error(m)} />
          {business.logoUrl && logo === undefined && (
            <button type="button" onClick={() => setLogo(null)} className="text-sm font-semibold text-slate-500 underline underline-offset-2">Quitar la imagen actual</button>
          )}
          {logo === null && <p className="text-sm font-semibold text-slate-600">Se quitará la imagen al guardar.</p>}
          <button type="button" onClick={save} disabled={saving} className="btn-primary w-full">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      )}
    </div>
  );
}

function CodeCard({ business, location, onRotate, title = 'Código de tu negocio', tone = '!bg-punch-yellow' }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.codeText);
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar. Selecciónalo y cópialo a mano.');
    }
  };
  const share = async () => {
    const where = business.locations.length > 1 || isEvent(location) ? ` (${location.name})` : '';
    const text = `Únete a ${business.name}${where} en TIP-IT. Entra a este enlace con tu cuenta: ${location.joinUrl} (código ${location.codeText})`;
    try {
      if (navigator.share) await navigator.share({ title: 'Únete en TIP-IT', text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    } catch {
      // share sheet closed
    }
  };
  return (
    <div className={`card ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
      <p className="mt-1 select-all font-display text-4xl font-extrabold tracking-[0.15em] md:text-5xl" aria-label={`Código ${location.codeText.split('').join(' ')}`}>
        {location.codeText}
      </p>
      <p className="mt-1 text-sm font-medium">
        {isEvent(location)
          ? 'Compártelo con quien participe en el evento. Cada persona recibe un QR solo para este evento.'
          : 'Compártelo con tu equipo. Cada persona lo escribe (o abre el enlace) desde su cuenta y recibe un QR de tu negocio.'}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="btn-secondary !py-2 text-sm">
          <Copy size={15} className="mr-1.5" /> Copiar
        </button>
        <button type="button" onClick={share} className="btn-primary !py-2 text-sm">
          <Share2 size={15} className="mr-1.5" /> Compartir
        </button>
      </div>
      {location.state !== 'ended' && (
        <button type="button" onClick={() => onRotate(location)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold underline underline-offset-2">
          <RefreshCw size={12} /> Cambiar el código (quienes ya están se quedan)
        </button>
      )}
    </div>
  );
}

function StatLine({ s, useTotal }) {
  const x = useTotal ? s.total : s.period;
  return (
    <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
      <div><dt className="text-xs font-bold uppercase text-slate-500">Propinas</dt><dd className="font-display text-lg font-extrabold">{x.tips}</dd></div>
      <div><dt className="text-xs font-bold uppercase text-slate-500">Estrellas</dt><dd><Stars value={x.rating} /></dd></div>
      <div><dt className="text-xs font-bold uppercase text-slate-500">Reseñas</dt><dd className="font-display text-lg font-extrabold">{x.reviews}</dd></div>
    </dl>
  );
}

function Compare({ teams }) {
  const maxTips = Math.max(1, ...teams.map((l) => l.period.tips));
  const bestTips = Math.max(...teams.map((l) => l.period.tips));
  const bestRating = Math.max(0, ...teams.map((l) => l.period.rating || 0));
  return (
    <>
      <h2 className="mt-8 font-display text-xl font-extrabold">Cómo le va a cada equipo</h2>
      <p className="text-sm text-slate-500">Lo mismo para cada equipo o ubicación, en el periodo que elegiste.</p>
      <ul className="mt-3 grid gap-3">
        {teams.map((l) => (
          <li key={l.id} className="card !p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-display text-lg font-extrabold"><MapPin size={16} /> {l.name}</p>
              <span className="text-xs font-bold text-slate-500">{l.members} {l.members === 1 ? 'persona' : 'personas'}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-punch-ink/10" role="img" aria-label={`${l.period.tips} propinas`}>
              <div className="h-full rounded-full bg-punch-orange" style={{ width: `${(l.period.tips / maxTips) * 100}%` }} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-x-4 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Propinas</dt>
                <dd className="font-display text-lg font-extrabold">
                  {l.period.tips}
                  {l.period.tips > 0 && l.period.tips === bestTips && teams.length > 1 && <span className="ml-1.5"><Badge>Más</Badge></span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Estrellas</dt>
                <dd>
                  <Stars value={l.period.rating} />
                  {l.period.rating && l.period.rating === bestRating && teams.length > 1 && <span className="ml-1.5"><Badge>Mejor</Badge></span>}
                </dd>
              </div>
              <div><dt className="text-xs font-bold uppercase text-slate-500">Reseñas</dt><dd className="font-display text-lg font-extrabold">{l.period.reviews}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

function EventsSection({ events, onSeeReviews }) {
  return (
    <>
      <h2 className="mt-8 font-display text-xl font-extrabold">Eventos</h2>
      <p className="text-sm text-slate-500">Cada evento cuenta solo lo que llegó por su QR mientras duró. Cuando termina, sus resultados se quedan aquí.</p>
      <ul className="mt-3 grid gap-3">
        {events.map((e) => (
          <li key={e.id} className="card !p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-display text-lg font-extrabold"><CalendarDays size={16} /> {e.name}</p>
              <Badge tone={e.state === 'live' ? 'bg-emerald-200' : e.state === 'ended' ? 'bg-slate-200' : 'bg-punch-yellow'}>{STATE[e.state] || 'Evento'}</Badge>
            </div>
            {e.startsAt && <p className="mt-1 text-sm text-slate-500">{range(e.startsAt, e.endsAt)}</p>}
            <StatLine s={e} useTotal />
            <p className="mt-2 text-xs text-slate-500">{e.members} {e.members === 1 ? 'persona participó' : 'personas participaron'}.</p>
            <button type="button" onClick={() => onSeeReviews(e.id)} className="mt-2 text-sm font-bold underline underline-offset-2">Ver las reseñas de este evento</button>
          </li>
        ))}
      </ul>
    </>
  );
}

function memberRule(m) {
  if (m.location?.kind === 'event') return `Evento: ${range(m.window.start, m.window.end)}`;
  if (m.scope === 'qr') return `Cuenta lo que llega por el QR de tu negocio, desde el ${sinceText(m.joinedAt)}`;
  return `Tiempo completo, desde el ${sinceText(m.joinedAt)}`;
}

function Overview({ data, days, setDays, location, setLocation, onRemove, onMove, onRotate, onSeeReviews }) {
  const t = data.totals.period;
  const teams = data.locations.filter((l) => !isEvent(l));
  const events = data.locations.filter((l) => isEvent(l));
  const many = data.locations.length > 1;
  const single = !many ? data.business.locations[0] : null;
  const focus = data.locations.find((l) => l.id === location);
  const eventFocus = isEvent(focus);

  return (
    <>
      {single && <div className="mt-6"><CodeCard business={data.business} location={single} onRotate={onRotate} /></div>}

      {!data.members.length && !many && (
        <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-medium ring-1 ring-punch-ink/15">
          Aquí aparecerá tu gente en cuanto se una con tu código. Si trabajas con un evento de pocos días, créalo en la pestaña <strong>Equipos y eventos</strong>.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Periodo">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            aria-pressed={days === p.days}
            className={`rounded-full border-2 border-punch-ink px-4 py-1.5 font-display text-sm font-extrabold transition ${days === p.days ? 'bg-punch-ink text-white' : 'bg-white hover:bg-punch-yellow'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {many && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Equipo o evento">
          {[{ id: '', name: 'Todo el negocio' }, ...data.locations].map((l) => (
            <button
              key={l.id || 'all'}
              type="button"
              onClick={() => setLocation(l.id)}
              aria-pressed={location === l.id}
              className={`flex items-center gap-1 rounded-full border-2 border-punch-ink px-4 py-1.5 font-display text-sm font-extrabold transition ${location === l.id ? 'bg-punch-orange' : 'bg-white hover:bg-punch-yellow'}`}
            >
              {isEvent(l) && <CalendarDays size={13} />} {l.name}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        {eventFocus ? 'Resultados de todo el evento.' : `Últimos ${days} días`} Cada persona se cuenta solo desde el día que se unió.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card !bg-punch-pink">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"><Users size={14} /> Personas</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{data.totals.members}</p>
        </div>
        <div className="card !bg-punch-yellow">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"><HandCoins size={14} /> Propinas</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{eventFocus ? data.totals.total.tips : t.tips}</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wide">Estrellas</p>
          <p className="mt-1 text-2xl"><Stars value={eventFocus ? data.totals.total.rating : t.rating} /></p>
          <p className="text-xs text-slate-500">promedio</p>
        </div>
        <div className="card">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"><MessageSquareText size={14} /> Reseñas</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{eventFocus ? data.totals.total.reviews : t.reviews}</p>
        </div>
      </div>
      {data.totals.pendingReviews > 0 && (
        <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-medium text-slate-500">
          Hay {data.totals.pendingReviews} comentarios sin propina en revisión. Aparecerán aquí cuando TIP-IT los publique.
        </p>
      )}

      {!location && teams.length > 1 && <Compare teams={teams} />}
      {!location && events.length > 0 && <EventsSection events={events} onSeeReviews={onSeeReviews} />}

      <h2 className="mt-8 font-display text-xl font-extrabold">{location ? `Personas de ${focus?.name || 'este equipo'}` : 'Tu gente'}</h2>
      {!data.members.length ? (
        <div className="mt-3">
          <EmptyState person="stylist" title="Aún nadie se une" body="Comparte tu código. Cuando alguien lo use, aparecerá aquí con sus números." />
        </div>
      ) : (
        <ul className="mt-3 grid gap-3">
          {data.members.map((m) => {
            const ev = m.location?.kind === 'event';
            return (
              <li key={m.id} className="card !p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={m.avatarUrl} name={m.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-extrabold">{m.name}</p>
                    <p className="truncate text-sm text-slate-500">@{m.username}{m.occupation ? ` · ${m.occupation}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(m)}
                    aria-label={`Quitar a ${m.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-punch-ink/30 text-slate-500 hover:border-rose-400 hover:text-rose-700"
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{memberRule(m)}</p>
                {many && !ev && (
                  <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <MapPin size={13} /> Equipo
                    <select
                      className="rounded-full border-2 border-punch-ink/30 bg-white px-2 py-1 text-xs font-bold text-punch-ink"
                      value={m.location?.id || ''}
                      onChange={(e) => onMove(m, e.target.value)}
                      aria-label={`Equipo de ${m.name}`}
                    >
                      {teams.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </label>
                )}
                {ev && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500"><CalendarDays size={13} /> {m.location.name}</p>}
                <StatLine s={m} useTotal={ev} />
                {!ev && (
                  <p className="mt-2 text-xs text-slate-500">
                    Desde que se unió: {m.total.tips} propinas
                    {m.total.rating ? ` · ${m.total.rating} de 5 (${m.total.ratingCount} calificaciones)` : ''}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Teams({ business, onChanged, onRotate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('team');
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  soon.setMinutes(0, 0, 0);
  const asLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [startsAt, setStartsAt] = useState(asLocal(soon));
  const [endsAt, setEndsAt] = useState(asLocal(new Date(soon.getTime() + 2 * 24 * 60 * 60 * 1000)));
  const [saving, setSaving] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/business/locations', {
        name,
        kind: type,
        ...(type === 'event' ? { startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() } : {}),
      });
      setName('');
      toast.success(type === 'event' ? 'Evento creado' : 'Equipo creado');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const rename = async (l) => {
    const next = window.prompt('Nuevo nombre', l.name);
    if (!next || next.trim().length < 2 || next.trim() === l.name) return;
    try {
      await api.patch(`/business/locations/${l.id}`, { name: next.trim() });
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
  const remove = async (l) => {
    if (!window.confirm(`¿Borrar ${l.name}? Su código dejará de servir.`)) return;
    try {
      await api.delete(`/business/locations/${l.id}`);
      toast.success('Borrado');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const teams = business.locations.filter((l) => !isEvent(l));
  const events = business.locations.filter((l) => isEvent(l));
  const Block = ({ l, i }) => (
    <div key={l.id}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-x-1.5 font-display text-lg font-extrabold">
          {isEvent(l) ? <CalendarDays size={16} /> : <MapPin size={16} />} {l.name}
          <span className="text-xs font-bold text-slate-500">· {l.memberCount} {l.memberCount === 1 ? 'persona' : 'personas'}</span>
          {isEvent(l) && <Badge tone={l.state === 'live' ? 'bg-emerald-200' : l.state === 'ended' ? 'bg-slate-200' : 'bg-punch-yellow'}>{STATE[l.state]}</Badge>}
        </p>
        <span className="flex gap-1.5">
          <button type="button" onClick={() => rename(l)} aria-label={`Cambiar nombre de ${l.name}`} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-punch-ink/30 hover:bg-punch-yellow"><Pencil size={14} /></button>
          {l.memberCount === 0 && (isEvent(l) || teams.length > 1) && (
            <button type="button" onClick={() => remove(l)} aria-label={`Borrar ${l.name}`} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-punch-ink/30 text-rose-700 hover:bg-rose-50"><Trash2 size={14} /></button>
          )}
        </span>
      </div>
      {isEvent(l) && l.startsAt && <p className="mb-2 text-sm text-slate-500">{range(l.startsAt, l.endsAt)}</p>}
      <CodeCard business={business} location={l} onRotate={onRotate} title={`Código de ${l.name}`} tone={i % 2 ? '!bg-punch-pink' : '!bg-punch-yellow'} />
    </div>
  );

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-slate-500">
        Un <strong>equipo</strong> es una sucursal, turno o área que sigue siempre. Un <strong>evento</strong> dura pocos días (un fin de semana, una feria): junta a quienes participan y, al terminar, ves cómo les fue. Cada uno tiene su propio código.
      </p>

      <h2 className="mt-5 font-display text-xl font-extrabold">Equipos</h2>
      <div className="mt-2 grid gap-4">{teams.map((l, i) => <Block key={l.id} l={l} i={i} />)}</div>

      {events.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-xl font-extrabold">Eventos</h2>
          <div className="mt-2 grid gap-4">{events.map((l, i) => <Block key={l.id} l={l} i={i + 1} />)}</div>
        </>
      )}

      <form onSubmit={add} className="mt-8 card space-y-3">
        <p className="flex items-center gap-1.5 font-display text-lg font-extrabold"><Plus size={18} /> Agregar</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Qué vas a agregar">
          {[{ id: 'team', label: 'Equipo fijo', hint: 'Sucursal, turno, área' }, { id: 'event', label: 'Evento', hint: 'De pocos días' }].map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={type === o.id}
              onClick={() => setType(o.id)}
              className={`rounded-2xl border-2 p-3 text-left ${type === o.id ? 'border-punch-ink bg-punch-yellow' : 'border-punch-ink/20 bg-white'}`}
            >
              <span className="block font-display font-extrabold">{o.label}</span>
              <span className="block text-xs font-medium text-slate-500">{o.hint}</span>
            </button>
          ))}
        </div>
        <FormField label="Nombre" hint={type === 'event' ? 'Por ejemplo: Feria de primavera o Boda de Ana.' : 'Por ejemplo: Sucursal Norte, Turno de noche, Terraza.'}>
          {(p) => <input {...p} className="input-field" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} required />}
        </FormField>
        {type === 'event' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Empieza">{(p) => <input {...p} type="datetime-local" className="input-field" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />}</FormField>
            <FormField label="Termina">{(p) => <input {...p} type="datetime-local" className="input-field" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />}</FormField>
          </div>
        )}
        <button type="submit" disabled={saving || name.trim().length < 2} className="btn-primary w-full">
          {saving ? 'Creando...' : type === 'event' ? 'Crear evento y su código' : 'Crear equipo y su código'}
        </button>
      </form>
    </div>
  );
}

function Reviews({ members, locations, startLocation = '' }) {
  const [member, setMember] = useState('');
  const [location, setLocation] = useState(startLocation);
  const [stars, setStars] = useState('');
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (before) => {
      setLoading(true);
      try {
        const params = { limit: 20 };
        if (member) params.member = member;
        if (location) params.location = location;
        if (stars) params.stars = stars;
        if (before) params.before = before;
        const { data } = await api.get('/business/reviews', { params });
        setItems((prev) => (before ? [...prev, ...data.reviews] : data.reviews));
        setNext(data.next);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [member, stars, location]
  );

  useEffect(() => {
    load(null);
  }, [load]);

  return (
    <div className="mt-6">
      <div className={`grid gap-3 ${locations.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {locations.length > 1 && (
          <FormField label="Equipo o evento">
            {(p) => (
              <select {...p} className="input-field" value={location} onChange={(e) => { setLocation(e.target.value); setMember(''); }}>
                <option value="">Todos</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
          </FormField>
        )}
        <FormField label="Persona">
          {(p) => (
            <select {...p} className="input-field" value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">Toda tu gente</option>
              {[...new Map(members.filter((m) => !location || m.location?.id === location).map((m) => [m.username, m])).values()].map((m) => (
                <option key={m.username} value={m.username}>{m.name}</option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Estrellas">
          {(p) => (
            <select {...p} className="input-field" value={stars} onChange={(e) => setStars(e.target.value)}>
              <option value="">Todas</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'estrella' : 'estrellas'}</option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Ves las reseñas de cada persona solo desde el día que se unió. Puedes leerlas, pero no editarlas ni ocultarlas: eso protege la confianza de los clientes.
      </p>

      {loading && !items.length ? (
        <div className="mt-8 flex justify-center"><Spinner /></div>
      ) : !items.length ? (
        <div className="mt-4"><EmptyState person="stylist" title="Sin reseñas todavía" body="Aparecerán aquí en cuanto los clientes califiquen a tu gente." /></div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {items.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="card !p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-extrabold">
                  {r.member.name}
                  {r.member.location && locations.length > 1 ? <span className="ml-1.5 text-xs font-bold text-slate-500">· {r.member.location}</span> : null}
                </p>
                <span className="shrink-0 text-xs text-slate-500">{timeAgo(r.createdAt)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {r.rating ? (
                  <span className="flex gap-0.5" role="img" aria-label={`${r.rating} de 5 estrellas`}>
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={14} fill="#FF8243" stroke="#FF8243" />)}
                  </span>
                ) : null}
                <Badge>{r.kind === 'paid' ? 'Con propina' : 'Sin propina'}</Badge>
              </div>
              {r.text ? <p className="mt-2 text-sm leading-relaxed">{r.text}</p> : <p className="mt-2 text-sm text-slate-500">Solo dejó estrellas.</p>}
              <p className="mt-2 text-[11px] font-semibold text-slate-500">{r.author}</p>
            </li>
          ))}
        </ul>
      )}
      {next && (
        <button type="button" onClick={() => load(next)} disabled={loading} className="btn-secondary mt-4 w-full">
          {loading ? 'Cargando...' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

export default function BusinessPortal() {
  const { worker, refreshMe } = useAuth();
  const [business, setBusiness] = useState(undefined); // undefined = loading
  const [failed, setFailed] = useState(false);
  const [overview, setOverview] = useState(null);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('resumen');
  const [location, setLocation] = useState('');
  const [reviewsFor, setReviewsFor] = useState('');

  // One request loads everything: the overview carries the business and its teams. "No business
  // yet" is a normal answer and shows the create form. refreshMe only runs after creating one.
  const loadOverview = useCallback(async () => {
    try {
      const { data } = await api.get('/business/overview', { params: { days, ...(location ? { location } : {}) } });
      if (!data.business) {
        setBusiness(null);
        setOverview(null);
        setFailed(false);
        return;
      }
      const next = normalizeOverview(data);
      setOverview(next);
      setBusiness(next.business);
      setFailed(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setBusiness(null);
        setOverview(null);
      } else {
        // A server problem must never look like "you have no business".
        toast.error(getErrorMessage(err));
        setFailed(true);
      }
    }
  }, [days, location]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const created = async () => {
    await refreshMe(); // the menu shows "Mi negocio" for owners
    loadOverview();
  };

  const rotate = async (loc) => {
    if (!window.confirm('Se creará un código nuevo y el anterior dejará de servir. Quienes ya están se quedan. ¿Continuar?')) return;
    try {
      await api.post(`/business/locations/${loc.id}/code/rotate`);
      toast.success('Código nuevo listo');
      loadOverview();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const move = async (m, locationId) => {
    try {
      await api.patch(`/business/members/${m.id}`, { locationId });
      toast.success(`${m.name} cambió de equipo`);
      loadOverview();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`¿Quitar a ${m.name}? Dejarás de ver sus números. Puede volver a unirse con el código.`)) return;
    try {
      await api.delete(`/business/members/${m.id}`);
      toast.success('Listo, ya no está');
      loadOverview();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const seeReviews = (locationId) => {
    setReviewsFor(locationId);
    setTab('resenas');
  };

  if (failed && !business) {
    return (
      <div className="page-shell items-center text-center">
        <p className="mt-16 font-display text-2xl font-extrabold">No pudimos cargar tu negocio</p>
        <p className="mt-2 text-sm text-slate-500">Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" onClick={() => { setFailed(false); loadOverview(); }} className="btn-primary mt-6">Reintentar</button>
      </div>
    );
  }
  if (business === undefined) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  }
  if (!business) return <CreateBusiness onCreated={created} />;

  return (
    <div className="page-shell md:!max-w-4xl">
      <PageHeader eyebrow="Mi negocio" title={business.name} subtitle="Cuántas propinas, estrellas y reseñas tiene tu gente, desde el día que cada quien se unió." />
      <BusinessIdentity business={business} onSaved={() => loadOverview()} />

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Secciones">
        {[
          { id: 'resumen', label: 'Resumen', icon: HandCoins },
          { id: 'resenas', label: 'Reseñas', icon: MessageSquareText },
          { id: 'equipos', label: 'Equipos y eventos', icon: MapPin },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => { if (id === 'resenas') setReviewsFor(''); setTab(id); }}
            className={`flex items-center gap-1.5 rounded-full border-2 border-punch-ink px-4 py-2 font-display text-sm font-extrabold transition ${tab === id ? 'bg-punch-ink text-white' : 'bg-white hover:bg-punch-yellow'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {!overview ? (
        <div className="mt-8 flex justify-center"><Spinner /></div>
      ) : tab === 'resumen' ? (
        <Overview data={overview} days={days} setDays={setDays} location={location} setLocation={setLocation} onRemove={remove} onMove={move} onRotate={rotate} onSeeReviews={seeReviews} />
      ) : tab === 'resenas' ? (
        <Reviews key={reviewsFor} members={overview.members} locations={overview.locations} startLocation={reviewsFor} />
      ) : (
        <Teams business={overview?.business || business} onChanged={() => loadOverview()} onRotate={rotate} />
      )}

      {worker && <WalletButtons />}
    </div>
  );
}
