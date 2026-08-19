import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function WorkerSetup() {
  const navigate = useNavigate();
  const { worker, user, refreshMe } = useAuth();
  const [form, setForm] = useState({ username: '', bio: '' });
  const [loading, setLoading] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({ email: '', password: '' });
  const [upgrading, setUpgrading] = useState(false);

  if (worker) {
    navigate('/worker/dashboard');
    return null;
  }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/workers/register', form);
      await refreshMe();
      toast.success('¡Tu perfil de trabajador está listo!');
      navigate('/worker/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeChange = (e) =>
    setUpgradeForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    setUpgrading(true);
    try {
      await api.post('/users/upgrade', upgradeForm);
      await refreshMe();
      toast.success('¡Cuenta protegida con contraseña!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpgrading(false);
    }
  };

  if (user?.isGuest) {
    return (
      <div className="page-shell justify-center pb-10">
        <h1 className="text-2xl font-bold">Protege tu cuenta</h1>
        <p className="mt-1 text-sm text-slate-400">
          Para recibir pagos necesitas una contraseña — así nadie más que tú puede entrar a tu
          cuenta y disponer de tu dinero.
        </p>

        <form onSubmit={handleUpgradeSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            name="email"
            value={upgradeForm.email}
            onChange={handleUpgradeChange}
            placeholder="Email"
            className="input-field"
            required
          />
          <input
            type="password"
            name="password"
            value={upgradeForm.password}
            onChange={handleUpgradeChange}
            placeholder="Contraseña (mín. 8 caracteres)"
            className="input-field"
            minLength={8}
            required
          />
          <button type="submit" disabled={upgrading} className="btn-primary w-full">
            {upgrading ? 'Guardando...' : 'Continuar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-shell justify-center pb-10">
      <h1 className="text-2xl font-bold">Configura tu perfil</h1>
      <p className="mt-1 text-sm text-slate-400">
        Elige tu username único. Con él generamos tu QR para recibir pagos.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
            <span className="text-slate-500">@</span>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="usuario"
              className="w-full bg-transparent px-2 py-3 text-slate-100 outline-none"
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_.]+"
              required
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Solo letras, números, punto y guion bajo.</p>
        </div>
        <textarea
          name="bio"
          value={form.bio}
          onChange={handleChange}
          placeholder="Cuéntale a la gente a qué te dedicas (opcional)"
          className="input-field h-24 resize-none"
          maxLength={280}
        />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Guardando...' : 'Crear mi perfil'}
        </button>
      </form>

      <Link to="/scan" className="mt-6 flex items-center justify-center gap-1 text-center text-sm text-slate-400">
        Solo quiero enviar pagos por ahora
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
