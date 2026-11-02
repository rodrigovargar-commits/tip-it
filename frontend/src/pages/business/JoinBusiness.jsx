import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import FormField from '../../components/FormField.jsx';
import Spinner from '../../components/Spinner.jsx';

const PENDING_KEY = 'tipit_join_code';
const clean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const pretty = (v) => (v.length > 4 ? `${v.slice(0, 4)}-${v.slice(4)}` : v);

export default function JoinBusiness() {
  const { user, worker, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(clean(params.get('c') || ''));
  const [found, setFound] = useState(null);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const join = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/business/join', { code, accept: true });
      try { localStorage.removeItem(PENDING_KEY); } catch { /* storage blocked */ }
      toast.success(`Ya eres parte de ${found.name}${found.location ? ` (${found.location})` : ''}`);
      navigate('/worker/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Mi equipo" title="Unirme a un negocio" subtitle="Escribe el código que te dio quien administra el negocio." />

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
          <FormField label="Código del negocio" error={error}>
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
              <p className="rounded-2xl bg-punch-yellow p-3 font-display text-lg font-extrabold">{found.name}{found.location ? <span className="block text-sm font-bold">{found.location}</span> : null}</p>
              <label className="flex items-start gap-3 text-sm font-medium">
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>
                  Acepto que {found.name} vea cuántas propinas recibo, mis estrellas y las reseñas que me dejan.
                  No verá cuánto dinero recibo: mi dinero llega directo a mi banco, y puedo salir del negocio cuando quiera.
                </span>
              </label>
              <button type="submit" disabled={!accepted || saving} className="btn-primary w-full">
                {saving ? 'Uniéndome...' : 'Unirme'}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
