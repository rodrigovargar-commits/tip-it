import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AtSign, CalendarClock, Mail, MessageCircle, Plus, RefreshCw, LogOut } from 'lucide-react';
import Spinner from '../components/Spinner.jsx';
import {
  LEAD_STAGES,
  OPEN_STAGES,
  messageFor,
  whatsappUrl,
  emailUrl,
  instagramUrl,
} from '../utils/followUpMessages.js';

// Centro de mando: the owner's private page to see the numbers, follow up
// every prospect and every new account, and see which source brings people.
// Gated by the same shared admin key as /api/admin/* (kept in this browser
// only). It uses its own axios instance so a 401 here never logs anyone out
// of the app.

const KEY_STORAGE = 'tipit_admin_key';
const DAY = 24 * 60 * 60 * 1000;

// Goals agreed for the first 30 days (see the business brief).
const GOALS = { users: 30, tips: 50 };

const CATEGORY_LABELS = {
  barbero_estilista: 'Barbería / belleza',
  musico_artista: 'Música / arte',
  puesto_comida: 'Comida',
  otro: 'Otro servicio',
};

function readKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

function saveKey(k) {
  try {
    if (k) localStorage.setItem(KEY_STORAGE, k);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // storage blocked: the key just lasts this visit
  }
}

function adminApi(key) {
  return axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin`,
    headers: { 'x-admin-key': key },
  });
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—';
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};
// Dates are picked as calendar days in Mexico; they are sent as local noon so
// the day never shifts when the server stores them in UTC.
const pad = (n) => String(n).padStart(2, '0');
const toDateInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const dayToIso = (v) => (v ? new Date(`${v}T12:00:00`).toISOString() : null);
const inDays = (n) => toDateInput(new Date(Date.now() + n * DAY));

// What an account needs next, from the data the server sends.
function userState(u) {
  if (u.tips > 0) return { id: 'activo', label: `${u.tips} propina${u.tips === 1 ? '' : 's'}`, tone: 'bg-brand-100' };
  if (!u.ready) return { id: 'sin_banco', label: 'Sin banco', tone: 'bg-punch-pink' };
  return { id: 'sin_propinas', label: 'Sin propinas', tone: 'bg-punch-yellow' };
}

function Contact({ name, phone, email, instagram, kind }) {
  const text = messageFor(kind, name);
  const wa = whatsappUrl(phone, text);
  const mail = emailUrl(email, text);
  const ig = instagramUrl(instagram);
  const cls =
    'inline-flex items-center gap-1.5 rounded-full border-2 border-punch-ink bg-white px-3 py-1 font-display text-xs font-extrabold hover:bg-punch-yellow';
  return (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className={cls}>
          <MessageCircle size={14} /> WhatsApp
        </a>
      )}
      {mail && (
        <a href={mail} className={cls}>
          <Mail size={14} /> Correo
        </a>
      )}
      {ig && (
        <a href={ig} target="_blank" rel="noreferrer" className={cls}>
          <AtSign size={14} /> @{instagram}
        </a>
      )}
      {!wa && !mail && !ig && <span className="text-xs text-slate-500">Sin forma de contacto</span>}
    </div>
  );
}

function Stat({ label, value, goal }) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : null;
  return (
    <div className="card !p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">
        {value}
        {goal ? <span className="text-base text-slate-500"> / {goal}</span> : null}
      </p>
      {pct !== null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden>
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function Section({ title, hint, children, count }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold">
        {title} {typeof count === 'number' && <span className="text-slate-500">({count})</span>}
      </h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <p className="rounded-2xl border-2 border-dashed border-slate-700 p-4 text-sm text-slate-500">{children}</p>;
}

function LeadCard({ lead, onSave }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const stageLabel = LEAD_STAGES.find((s) => s.id === lead.stage)?.label || lead.stage;
  const due = lead.nextFollowUp && new Date(lead.nextFollowUp) <= endOfToday();

  const save = async (patch) => {
    setBusy(true);
    try {
      await onSave(lead._id, patch);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card !p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-extrabold">{lead.name}</p>
          <p className="text-sm text-slate-500">
            {CATEGORY_LABELS[lead.category] || lead.category}
            {lead.zone ? ` · ${lead.zone}` : ''} · llegó por <b>{lead.source || 'landing'}</b> · {fmtDate(lead.createdAt)}
          </p>
          {lead.account && (
            <p className="mt-1 text-sm font-bold text-brand-300">
              Ya tiene cuenta{lead.account.username ? ` (@${lead.account.username})` : ''}
              {lead.account.ready ? ', banco conectado' : ', sin banco'} · {lead.account.tips} propinas
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full border-2 border-punch-ink bg-punch-yellow px-3 py-0.5 font-display text-xs font-extrabold">
            {stageLabel}
          </span>
          {lead.nextFollowUp && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${due ? 'text-punch-orange' : 'text-slate-500'}`}>
              <CalendarClock size={13} /> {fmtDate(lead.nextFollowUp)}
            </span>
          )}
        </div>
      </div>
      {lead.objection && <p className="mt-2 text-sm">Objeción: “{lead.objection}”</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Contact {...lead} kind={lead.stage === 'descartado' ? 'contactado' : lead.stage} />
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-bold underline">
          {open ? 'Cerrar' : 'Actualizar'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t-2 border-slate-800 pt-4">
          <div className="flex flex-wrap gap-2">
            {LEAD_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => save({ stage: s.id })}
                className={`rounded-full border-2 px-3 py-1 text-xs font-extrabold ${
                  s.id === lead.stage ? 'border-punch-ink bg-punch-yellow' : 'border-slate-700 bg-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold">Próximo seguimiento:</span>
            {[
              ['Mañana', 1],
              ['En 3 días', 3],
              ['En 1 semana', 7],
            ].map(([label, n]) => (
              <button key={n} type="button" disabled={busy} onClick={() => save({ nextFollowUp: dayToIso(inDays(n)) })} className="rounded-full border-2 border-slate-700 bg-white px-3 py-1 text-xs font-bold">
                {label}
              </button>
            ))}
            <input
              type="date"
              className="input-field !w-auto !py-1 text-sm"
              defaultValue={toDateInput(lead.nextFollowUp)}
              onChange={(e) => e.target.value && save({ nextFollowUp: dayToIso(e.target.value) })}
            />
            {lead.nextFollowUp && (
              <button type="button" disabled={busy} onClick={() => save({ nextFollowUp: null })} className="text-xs underline">
                Quitar fecha
              </button>
            )}
          </div>
          <label className="block text-sm font-bold">
            Objeción (con sus palabras)
            <input
              className="input-field mt-1"
              defaultValue={lead.objection}
              maxLength={200}
              onBlur={(e) => e.target.value !== lead.objection && save({ objection: e.target.value })}
            />
          </label>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!note.trim()) return;
              await save({ note });
              setNote('');
            }}
          >
            <input className="input-field" placeholder="Nota (qué pasó, qué sigue)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
            <button type="submit" disabled={busy} className="btn-secondary !px-4 !py-2 text-sm">
              Guardar
            </button>
          </form>
          {lead.notes?.length > 0 && (
            <ul className="space-y-1 text-sm">
              {[...lead.notes].reverse().map((n) => (
                <li key={n._id || n.at}>
                  <span className="text-slate-500">{fmtDate(n.at)}:</span> {n.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NewLeadForm({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2">
        <Plus size={18} /> Agregar prospecto
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.nextFollowUp = dayToIso(data.nextFollowUp);
    setBusy(true);
    setError('');
    try {
      await onCreate(data);
      setOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card grid gap-3 !p-4 sm:grid-cols-2">
      <input name="name" required className="input-field" placeholder="Nombre" maxLength={100} />
      <input name="phone" className="input-field" placeholder="WhatsApp (10 dígitos)" maxLength={30} />
      <input name="instagram" className="input-field" placeholder="Instagram (@usuario)" maxLength={60} />
      <input name="email" type="email" className="input-field" placeholder="Correo" maxLength={120} />
      <select name="category" className="input-field" defaultValue="otro">
        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <input name="zone" className="input-field" placeholder="Zona o colonia" maxLength={100} />
      <select name="source" className="input-field" defaultValue="visita">
        <option value="visita">Visita en persona</option>
        <option value="instagram_dm">Mensaje de Instagram</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="referido">Referido</option>
        <option value="evento">Evento</option>
      </select>
      <input name="nextFollowUp" type="date" className="input-field" defaultValue={inDays(2)} />
      <input name="note" className="input-field sm:col-span-2" placeholder="Nota: qué le interesó, qué objeción dio" maxLength={500} />
      {error && <p className="text-sm font-bold text-punch-orange sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn-primary">
          Guardar
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function UserRow({ u }) {
  const st = userState(u);
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 !p-4">
      <div>
        <p className="font-display font-extrabold">
          {u.name} <span className="text-sm text-slate-500">@{u.username}</span>
        </p>
        <p className="text-sm text-slate-500">
          Cuenta desde {fmtDate(u.createdAt)}
          {u.source ? ` · llegó por ${u.source}` : ''}
          {u.lastTipAt ? ` · última propina ${fmtDate(u.lastTipAt)}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border-2 border-punch-ink px-3 py-0.5 font-display text-xs font-extrabold ${st.tone}`}>{st.label}</span>
        <Contact name={u.name} phone={u.phone} email={u.email} kind={st.id} />
      </div>
    </div>
  );
}

const TABS = [
  ['hoy', 'Hoy'],
  ['prospectos', 'Prospectos'],
  ['usuarios', 'Usuarios'],
  ['fuentes', 'Fuentes'],
];

export default function AdminPortal() {
  const [key, setKey] = useState(readKey);
  const [draftKey, setDraftKey] = useState('');
  const [tab, setTab] = useState('hoy');
  const [stageFilter, setStageFilter] = useState('abiertos');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const api = useMemo(() => adminApi(key), [key]);

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError('');
    try {
      const [stats, leads, users, sources] = await Promise.all([
        api.get('/stats'),
        api.get('/leads'),
        api.get('/users'),
        api.get('/sources?days=30'),
      ]);
      setData({ stats: stats.data, leads: leads.data.leads, users: users.data.users, sources: sources.data.sources });
    } catch (err) {
      if (err?.response?.status === 401) {
        saveKey('');
        setKey('');
        setError('Esa clave no es correcta.');
      } else {
        setError('No se pudo cargar. Revisa tu conexión e intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, key]);

  useEffect(() => {
    load();
  }, [load]);

  const updateLead = async (id, patch) => {
    const res = await api.patch(`/leads/${id}`, patch);
    setData((d) => ({
      ...d,
      leads: d.leads.map((l) => (l._id === id ? { ...l, ...res.data.lead, account: l.account } : l)),
    }));
  };

  const createLead = async (body) => {
    const res = await api.post('/leads', body);
    setData((d) => ({ ...d, leads: [{ ...res.data.lead, account: null }, ...d.leads] }));
  };

  if (!key) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="font-display text-3xl font-extrabold">Centro de mando</h1>
        <p className="mt-2 text-slate-500">Escribe la clave de administración (ADMIN_STATS_KEY). Se guarda solo en este navegador.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const k = draftKey.trim();
            if (!k) return;
            saveKey(k);
            setKey(k);
          }}
        >
          <input type="password" autoComplete="current-password" className="input-field" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} placeholder="Clave" />
          {error && <p className="text-sm font-bold text-punch-orange">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        {loading ? <Spinner /> : <p className="font-bold text-punch-orange">{error}</p>}
        {!loading && (
          <button type="button" className="btn-secondary" onClick={load}>
            Reintentar
          </button>
        )}
      </div>
    );
  }

  const { stats, leads, users, sources } = data;
  const now = Date.now();
  const open = leads.filter((l) => OPEN_STAGES.includes(l.stage));
  const dueToday = open
    .filter((l) => l.nextFollowUp && new Date(l.nextFollowUp) <= endOfToday())
    .sort((a, b) => new Date(a.nextFollowUp) - new Date(b.nextFollowUp));
  const fresh = open.filter((l) => l.stage === 'nuevo' && !l.nextFollowUp);
  const forgotten = open.filter(
    (l) => l.stage !== 'nuevo' && !l.nextFollowUp && now - new Date(l.updatedAt || l.createdAt) > 3 * DAY
  );
  const stuck = users.filter((u) => u.tips === 0 && now - new Date(u.createdAt) > 2 * DAY);
  const recentlyActive = users.filter((u) => u.lastTipAt && now - new Date(u.lastTipAt) < 7 * DAY);
  const shownLeads =
    stageFilter === 'abiertos' ? open : stageFilter === 'todos' ? leads : leads.filter((l) => l.stage === stageFilter);
  const f = stats.funnel;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Centro de mando</h1>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-secondary inline-flex items-center gap-2 !px-4 !py-2 text-sm">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <button
            type="button"
            onClick={() => {
              saveKey('');
              setKey('');
              setData(null);
            }}
            className="btn-secondary inline-flex items-center gap-2 !px-4 !py-2 text-sm"
            aria-label="Salir"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto" aria-label="Secciones del centro de mando">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full border-2 px-4 py-1.5 font-display text-sm font-extrabold ${
              tab === id ? 'border-punch-ink bg-punch-yellow shadow-[2px_2px_0_0_#0A2F2F]' : 'border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && <p className="mt-3 text-sm font-bold text-punch-orange">{error}</p>}

      {tab === 'hoy' && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Cuentas para recibir" value={f.workersRegistered} goal={GOALS.users} />
            <Stat label="Propinas cobradas" value={stats.transactions.succeeded} goal={GOALS.tips} />
            <Stat label="Propinas últimos 7 días" value={f.last7Days.succeededTips} />
            <Stat label="Prospectos sin contactar" value={leads.filter((l) => l.stage === 'nuevo').length} />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Embudo: {f.workersRegistered} cuentas → {f.onboardingComplete} con banco ({f.conversionPct.registeredToOnboarded}%) →{' '}
            {f.firstTipReceived} con 1ª propina ({f.conversionPct.onboardedToFirstTip}%) → {f.fivePlusTips} con 5 o más.
          </p>

          <Section title="Seguimientos para hoy" count={dueToday.length} hint="Prospectos con fecha de seguimiento de hoy o atrasada.">
            {dueToday.length ? dueToday.map((l) => <LeadCard key={l._id} lead={l} onSave={updateLead} />) : <Empty>Nada pendiente para hoy.</Empty>}
          </Section>
          <Section title="Nuevos sin contactar" count={fresh.length} hint="Escríbeles el mismo día: es cuando más se acuerdan de ti.">
            {fresh.length ? fresh.map((l) => <LeadCard key={l._id} lead={l} onSave={updateLead} />) : <Empty>No hay prospectos nuevos.</Empty>}
          </Section>
          {forgotten.length > 0 && (
            <Section title="Se quedaron sin fecha" count={forgotten.length} hint="Ya hablaste con ellos pero no tienen próximo seguimiento.">
              {forgotten.map((l) => (
                <LeadCard key={l._id} lead={l} onSave={updateLead} />
              ))}
            </Section>
          )}
          <Section title="Cuentas que aún no reciben propinas" count={stuck.length} hint="Crearon cuenta hace más de 2 días y no tienen ninguna propina. Ayúdales a terminar o a poner su QR a la vista.">
            {stuck.length ? stuck.map((u) => <UserRow key={u.id} u={u} />) : <Empty>Todas las cuentas ya recibieron al menos una propina.</Empty>}
          </Section>
          {recentlyActive.length > 0 && (
            <Section title="Recibieron propinas esta semana" count={recentlyActive.length} hint="Buen momento para pedir su opinión o una reseña real (con su permiso).">
              {recentlyActive.map((u) => (
                <UserRow key={u.id} u={u} />
              ))}
            </Section>
          )}
        </>
      )}

      {tab === 'prospectos' && (
        <div className="mt-6">
          <NewLeadForm onCreate={createLead} />
          <div className="mt-5 flex flex-wrap gap-2">
            {[['abiertos', `Abiertos (${open.length})`], ['todos', `Todos (${leads.length})`], ...LEAD_STAGES.map((s) => [s.id, `${s.label} (${leads.filter((l) => l.stage === s.id).length})`])].map(
              ([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStageFilter(id)}
                  className={`rounded-full border-2 px-3 py-1 text-xs font-extrabold ${stageFilter === id ? 'border-punch-ink bg-punch-yellow' : 'border-slate-700 bg-white'}`}
                >
                  {label}
                </button>
              )
            )}
          </div>
          <div className="mt-4 space-y-3">
            {shownLeads.length ? shownLeads.map((l) => <LeadCard key={l._id} lead={l} onSave={updateLead} />) : <Empty>No hay prospectos en esta etapa.</Empty>}
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <Section title="Cuentas para recibir propinas" count={users.length} hint="Más recientes primero. El botón abre un mensaje según lo que le falta a cada persona.">
          {users.length ? users.map((u) => <UserRow key={u.id} u={u} />) : <Empty>Aún no hay cuentas.</Empty>}
        </Section>
      )}

      {tab === 'fuentes' && (
        <Section title="De dónde llega la gente (últimos 30 días)" hint="Visitas contadas por nuestro servidor, sin cookies. Para medir un anuncio, comparte el enlace con ?src=nombre.">
          {sources.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-2 pr-3">Fuente</th>
                    <th className="py-2 pr-3">Visitas</th>
                    <th className="py-2 pr-3">Prospectos</th>
                    <th className="py-2 pr-3">Cuentas</th>
                    <th className="py-2">Visita → cuenta</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.source} className="border-t border-slate-800">
                      <td className="py-2 pr-3 font-bold">{s.source}</td>
                      <td className="py-2 pr-3">{s.visits}</td>
                      <td className="py-2 pr-3">{s.leads}</td>
                      <td className="py-2 pr-3">{s.accounts}</td>
                      <td className="py-2">{s.visits ? `${Math.round((s.accounts / s.visits) * 100)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Sin visitas registradas en este periodo.</Empty>
          )}
        </Section>
      )}
    </div>
  );
}
