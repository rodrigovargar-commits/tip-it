import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Share2, RefreshCw, Star, Users, HandCoins, MessageSquareText, UserMinus, MapPin, Plus, Trash2, Pencil } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import FormField from '../../components/FormField.jsx';
import Spinner from '../../components/Spinner.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import WalletButtons from '../../components/WalletButtons.jsx';
import { timeAgo } from '../../utils/time.js';

const PERIODS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

function Stars({ value }) {
  if (!value) return <span className="text-sm text-slate-500">Sin calificaciones</span>;
  return (
    <span className="inline-flex items-center gap-1 font-display font-extrabold text-amber-700">
      <Star size={15} fill="#FF8243" stroke="#FF8243" /> {value}
    </span>
  );
}

function CreateBusiness({ onCreated }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/business', { name });
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
        title="Crea tu negocio"
        subtitle="Comparte un código con tu equipo y conoce mejor cómo les va: cuántas propinas reciben, sus estrellas y sus reseñas."
      />
      <ol className="mt-6 grid gap-3 text-sm font-medium">
        {['Creas tu negocio y recibes un código.', 'Cada persona de tu equipo se une con ese código desde su cuenta.', 'Tú ves cuántas propinas reciben, sus estrellas y lo que dicen de ellas. Nunca ves cuánto dinero.'].map((t, i) => (
          <li key={t} className="card flex items-center gap-3 !p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow font-display font-extrabold">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <form onSubmit={submit} className="mt-6 card space-y-4">
        <FormField label="Nombre de tu negocio" hint="Es el nombre que verá tu equipo al unirse.">
          {(p) => (
            <input {...p} className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Barbería La Navaja" minLength={2} maxLength={60} required />
          )}
        </FormField>
        <button type="submit" disabled={saving || name.trim().length < 2} className="btn-primary w-full">
          {saving ? 'Creando...' : 'Crear mi negocio'}
        </button>
        <p className="text-xs text-slate-500">
          Cada persona recibe su dinero directo en su banco y tiene sus propias reseñas. Tu negocio solo ve el número de propinas, las estrellas y las reseñas, no el dinero.
        </p>
      </form>
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
    const where = business.locations.length > 1 ? ` (${location.name})` : '';
    const text = `Únete a ${business.name}${where} en TIP-IT. Entra a este enlace con tu cuenta: ${location.joinUrl} (código ${location.codeText})`;
    try {
      if (navigator.share) await navigator.share({ title: 'Únete a mi negocio en TIP-IT', text });
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
      <p className="mt-1 text-sm font-medium">Compártelo con tu equipo. Cada persona lo escribe (o abre el enlace) desde su cuenta para unirse.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="btn-secondary !py-2 text-sm">
          <Copy size={15} className="mr-1.5" /> Copiar
        </button>
        <button type="button" onClick={share} className="btn-primary !py-2 text-sm">
          <Share2 size={15} className="mr-1.5" /> Compartir
        </button>
      </div>
      <button type="button" onClick={() => onRotate(location)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold underline underline-offset-2">
        <RefreshCw size={12} /> Cambiar el código (las personas que ya están se quedan)
      </button>
    </div>
  );
}

function Compare({ locations }) {
  const maxTips = Math.max(1, ...locations.map((l) => l.period.tips));
  const bestTips = Math.max(...locations.map((l) => l.period.tips));
  const bestRating = Math.max(0, ...locations.map((l) => l.period.rating || 0));
  return (
    <>
      <h2 className="mt-8 font-display text-xl font-extrabold">Comparar equipos</h2>
      <p className="text-sm text-slate-500">Lo mismo en cada equipo o ubicación, en el periodo que elegiste.</p>
      <ul className="mt-3 grid gap-3">
        {locations.map((l) => (
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
                  {l.period.tips > 0 && l.period.tips === bestTips && locations.length > 1 && <span className="ml-1.5 rounded-full bg-punch-yellow px-2 py-0.5 text-[10px] font-bold">Más</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Estrellas</dt>
                <dd>
                  <Stars value={l.period.rating} />
                  {l.period.rating && l.period.rating === bestRating && locations.length > 1 && <span className="ml-1.5 rounded-full bg-punch-yellow px-2 py-0.5 text-[10px] font-bold">Mejor</span>}
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

function Overview({ data, days, setDays, location, setLocation, onRemove, onMove, onRotate }) {
  const t = data.totals.period;
  const many = data.locations.length > 1;
  return (
    <>
      {!many && (
        <div className="mt-6"><CodeCard business={data.business} location={data.business.locations[0]} onRotate={onRotate} /></div>
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
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Equipo">
          {[{ id: '', name: 'Todo el negocio' }, ...data.locations].map((l) => (
            <button
              key={l.id || 'all'}
              type="button"
              onClick={() => setLocation(l.id)}
              aria-pressed={location === l.id}
              className={`rounded-full border-2 border-punch-ink px-4 py-1.5 font-display text-sm font-extrabold transition ${location === l.id ? 'bg-punch-orange' : 'bg-white hover:bg-punch-yellow'}`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card !bg-punch-pink">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"><Users size={14} /> Personas</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{data.totals.members}</p>
        </div>
        <div className="card !bg-punch-yellow">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"><HandCoins size={14} /> Propinas</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{t.tips}</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wide">Estrellas</p>
          <p className="mt-1 text-2xl"><Stars value={t.rating} /></p>
          <p className="text-xs text-slate-500">promedio</p>
        </div>
        <div className="card">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"><MessageSquareText size={14} /> Reseñas</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{t.reviews}</p>
        </div>
      </div>
      {data.totals.pendingReviews > 0 && (
        <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-medium text-slate-500">
          Hay {data.totals.pendingReviews} comentarios sin pago en revisión. Aparecerán aquí cuando TIP-IT los publique.
        </p>
      )}

      {many && !location && <Compare locations={data.locations} />}

      <h2 className="mt-8 font-display text-xl font-extrabold">{many && location ? 'Personas de este equipo' : 'Tu equipo'}</h2>
      {!data.members.length ? (
        <div className="mt-3">
          <EmptyState person="stylist" title="Aún nadie se une" body="Comparte tu código. Cuando alguien de tu equipo lo use, aparecerá aquí con sus números." />
        </div>
      ) : (
        <ul className="mt-3 grid gap-3">
          {data.members.map((m) => (
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
                  aria-label={`Quitar a ${m.name} del negocio`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-punch-ink/30 text-slate-500 hover:border-rose-400 hover:text-rose-700"
                >
                  <UserMinus size={16} />
                </button>
              </div>
              {many && (
                <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <MapPin size={13} /> Equipo
                  <select
                    className="rounded-full border-2 border-punch-ink/30 bg-white px-2 py-1 text-xs font-bold text-punch-ink"
                    value={m.location?.id || ''}
                    onChange={(e) => onMove(m, e.target.value)}
                    aria-label={`Equipo de ${m.name}`}
                  >
                    {data.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
              )}
              <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <div><dt className="text-xs font-bold uppercase text-slate-500">Propinas</dt><dd className="font-display text-lg font-extrabold">{m.period.tips}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-500">Estrellas</dt><dd><Stars value={m.period.rating} /></dd></div>
                <div><dt className="text-xs font-bold uppercase text-slate-500">Reseñas</dt><dd className="font-display text-lg font-extrabold">{m.period.reviews}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-slate-500">
                En total: {m.total.tips} propinas
                {m.total.rating ? ` · ${m.total.rating} de 5 (${m.total.ratingCount} calificaciones)` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Teams({ business, onChanged, onRotate }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/business/locations', { name });
      setName('');
      toast.success('Equipo creado');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const rename = async (l) => {
    const next = window.prompt('Nuevo nombre del equipo o ubicación', l.name);
    if (!next || next.trim().length < 2 || next.trim() === l.name) return;
    try {
      await api.patch(`/business/locations/${l.id}`, { name: next.trim() });
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
  const remove = async (l) => {
    if (!window.confirm(`¿Borrar el equipo ${l.name}? Su código dejará de servir.`)) return;
    try {
      await api.delete(`/business/locations/${l.id}`);
      toast.success('Equipo borrado');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-slate-500">
        Si tu negocio tiene varias ubicaciones o turnos, crea un equipo para cada uno. Cada equipo tiene su propio nombre y código, y podrás comparar cómo le va a cada uno.
      </p>
      <div className="mt-4 grid gap-4">
        {business.locations.map((l, i) => (
          <div key={l.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-display text-lg font-extrabold"><MapPin size={16} /> {l.name} <span className="text-xs font-bold text-slate-500">· {l.memberCount} {l.memberCount === 1 ? 'persona' : 'personas'}</span></p>
              <span className="flex gap-1.5">
                <button type="button" onClick={() => rename(l)} aria-label={`Cambiar nombre de ${l.name}`} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-punch-ink/30 hover:bg-punch-yellow"><Pencil size={14} /></button>
                {business.locations.length > 1 && l.memberCount === 0 && (
                  <button type="button" onClick={() => remove(l)} aria-label={`Borrar ${l.name}`} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-punch-ink/30 text-rose-700 hover:bg-rose-50"><Trash2 size={14} /></button>
                )}
              </span>
            </div>
            <CodeCard business={business} location={l} onRotate={onRotate} title={`Código de ${l.name}`} tone={i % 2 ? '!bg-punch-pink' : '!bg-punch-yellow'} />
          </div>
        ))}
      </div>

      <form onSubmit={add} className="mt-6 card space-y-3">
        <p className="flex items-center gap-1.5 font-display text-lg font-extrabold"><Plus size={18} /> Agregar equipo o ubicación</p>
        <FormField label="Nombre" hint="Por ejemplo: Sucursal Norte, Turno de noche, Terraza.">
          {(p) => <input {...p} className="input-field" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} placeholder="Sucursal Norte" required />}
        </FormField>
        <button type="submit" disabled={saving || name.trim().length < 2} className="btn-primary w-full">
          {saving ? 'Creando...' : 'Crear equipo y su código'}
        </button>
      </form>
    </div>
  );
}

function Reviews({ members, locations }) {
  const [member, setMember] = useState('');
  const [location, setLocation] = useState('');
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
          <FormField label="Equipo">
            {(p) => (
              <select {...p} className="input-field" value={location} onChange={(e) => { setLocation(e.target.value); setMember(''); }}>
                <option value="">Todos los equipos</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
          </FormField>
        )}
        <FormField label="Persona">
          {(p) => (
            <select {...p} className="input-field" value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">Todo el equipo</option>
              {members.filter((m) => !location || m.location?.id === location).map((m) => (
                <option key={m.id} value={m.username}>{m.name}</option>
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
        Puedes leer todas las reseñas de tu equipo. No se pueden editar ni ocultar: eso protege la confianza de tus clientes en ellas.
      </p>

      {loading && !items.length ? (
        <div className="mt-8 flex justify-center"><Spinner /></div>
      ) : !items.length ? (
        <div className="mt-4"><EmptyState person="stylist" title="Sin reseñas todavía" body="Aparecerán aquí en cuanto los clientes califiquen a tu equipo." /></div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {items.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="card !p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-extrabold">{r.member.name}{r.member.location && locations.length > 1 ? <span className="ml-1.5 text-xs font-bold text-slate-500">· {r.member.location}</span> : null}</p>
                <span className="shrink-0 text-xs text-slate-500">{timeAgo(r.createdAt)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {r.rating ? (
                  <span className="flex gap-0.5" role="img" aria-label={`${r.rating} de 5 estrellas`}>
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={14} fill="#FF8243" stroke="#FF8243" />)}
                  </span>
                ) : null}
                <span className="rounded-full bg-punch-yellow px-2 py-0.5 text-[11px] font-bold">
                  {r.kind === 'paid' ? 'Con propina' : 'Sin propina'}
                </span>
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
  const [overview, setOverview] = useState(null);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('resumen');
  const [location, setLocation] = useState('');

  const loadBusiness = useCallback(async () => {
    try {
      const { data } = await api.get('/business/me');
      setBusiness(data.business);
      await refreshMe();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusiness(null);
    }
  }, [refreshMe]);

  const loadOverview = useCallback(async () => {
    try {
      const { data } = await api.get('/business/overview', { params: { days, ...(location ? { location } : {}) } });
      setOverview(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [days, location]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  useEffect(() => {
    if (business) loadOverview();
  }, [business, loadOverview]);

  const rotate = async (loc) => {
    if (!window.confirm('Se creará un código nuevo y el anterior dejará de servir. Las personas que ya están se quedan. ¿Continuar?')) return;
    try {
      await api.post(`/business/locations/${loc.id}/code/rotate`);
      toast.success('Código nuevo listo');
      await loadBusiness();
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

  const teamsChanged = async () => {
    await loadBusiness();
    loadOverview();
  };

  const remove = async (m) => {
    if (!window.confirm(`¿Quitar a ${m.name} de tu negocio? Dejarás de ver sus números. Puede volver a unirse con el código.`)) return;
    try {
      await api.delete(`/business/members/${m.id}`);
      toast.success('Listo, ya no está en tu equipo');
      loadOverview();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (business === undefined) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  }
  if (!business) return <CreateBusiness onCreated={loadBusiness} />;

  return (
    <div className="page-shell md:!max-w-4xl">
      <PageHeader eyebrow="Mi negocio" title={business.name} subtitle="Cuántas propinas, estrellas y reseñas tiene cada persona de tu equipo." />

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Secciones">
        {[
          { id: 'resumen', label: 'Resumen', icon: HandCoins },
          { id: 'resenas', label: 'Reseñas', icon: MessageSquareText },
          { id: 'equipos', label: 'Equipos', icon: MapPin },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-full border-2 border-punch-ink px-4 py-2 font-display text-sm font-extrabold transition ${tab === id ? 'bg-punch-ink text-white' : 'bg-white hover:bg-punch-yellow'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {!overview ? (
        <div className="mt-8 flex justify-center"><Spinner /></div>
      ) : tab === 'resumen' ? (
        <Overview data={overview} days={days} setDays={setDays} location={location} setLocation={setLocation} onRemove={remove} onMove={move} onRotate={rotate} />
      ) : tab === 'resenas' ? (
        <Reviews members={overview.members} locations={overview.locations} />
      ) : (
        <Teams business={business} onChanged={teamsChanged} onRotate={rotate} />
      )}

      {worker && <WalletButtons />}
    </div>
  );
}
