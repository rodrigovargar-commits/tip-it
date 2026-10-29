import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Share2, RefreshCw, Star, Users, HandCoins, MessageSquareText, UserMinus } from 'lucide-react';
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

function CodeCard({ business, onRotate }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(business.codeText);
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar. Selecciónalo y cópialo a mano.');
    }
  };
  const share = async () => {
    const text = `Únete a ${business.name} en TIP-IT. Entra a este enlace con tu cuenta: ${business.joinUrl} (código ${business.codeText})`;
    try {
      if (navigator.share) await navigator.share({ title: 'Únete a mi negocio en TIP-IT', text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    } catch {
      // share sheet closed
    }
  };
  return (
    <div className="card !bg-punch-yellow">
      <p className="text-xs font-bold uppercase tracking-wide">Código de tu negocio</p>
      <p className="mt-1 select-all font-display text-4xl font-extrabold tracking-[0.15em] md:text-5xl" aria-label={`Código ${business.codeText.split('').join(' ')}`}>
        {business.codeText}
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
      <button type="button" onClick={onRotate} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold underline underline-offset-2">
        <RefreshCw size={12} /> Cambiar el código (el equipo que ya está se queda)
      </button>
    </div>
  );
}

function Overview({ data, days, setDays, onRemove }) {
  const t = data.totals.period;
  return (
    <>
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
          <p className="text-xs text-slate-500">promedio del equipo</p>
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

      <h2 className="mt-8 font-display text-xl font-extrabold">Tu equipo</h2>
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

function Reviews({ members }) {
  const [member, setMember] = useState('');
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
    [member, stars]
  );

  useEffect(() => {
    load(null);
  }, [load]);

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Persona">
          {(p) => (
            <select {...p} className="input-field" value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">Todo el equipo</option>
              {members.map((m) => (
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
                <p className="font-display font-extrabold">{r.member.name}</p>
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
      const { data } = await api.get('/business/overview', { params: { days } });
      setOverview(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [days]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  useEffect(() => {
    if (business) loadOverview();
  }, [business, loadOverview]);

  const rotate = async () => {
    if (!window.confirm('Se creará un código nuevo y el anterior dejará de servir. Quien ya está en tu equipo se queda. ¿Continuar?')) return;
    try {
      const { data } = await api.post('/business/code/rotate');
      setBusiness(data.business);
      toast.success('Código nuevo listo');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
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

      <div className="mt-6"><CodeCard business={business} onRotate={rotate} /></div>

      <div className="mt-6 flex gap-2" role="tablist" aria-label="Secciones">
        {[
          { id: 'resumen', label: 'Resumen', icon: HandCoins },
          { id: 'resenas', label: 'Reseñas', icon: MessageSquareText },
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
        <Overview data={overview} days={days} setDays={setDays} onRemove={remove} />
      ) : (
        <Reviews members={overview.members} />
      )}

      {worker && <WalletButtons />}
    </div>
  );
}
