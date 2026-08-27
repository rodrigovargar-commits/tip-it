import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wallet, HandCoins, ArrowLeftRight } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { trackEvent } from '../../utils/analytics.js';

const ROLES = [
  { id: 'client', icon: Wallet, label: 'Enviar pagos', hint: 'Solo voy a pagar a otros' },
  { id: 'worker', icon: HandCoins, label: 'Recibir pagos', hint: 'Solo voy a cobrar' },
  { id: 'both', icon: ArrowLeftRight, label: 'Ambos', hint: 'Quiero enviar y recibir' },
];

export default function Register() {
  const navigate = useNavigate();
  const { login, refreshMe } = useAuth();
  const [role, setRole] = useState('client'); // client | worker | both
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);

  const needsUsername = role === 'worker' || role === 'both';

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsUsername && !form.username.trim()) {
      toast.error('Elige un username para tu perfil');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      await login(data.token, data.user);
      trackEvent('sign_up', { method: 'email', role });

      if (needsUsername) {
        await api.post('/workers/register', { username: form.username });
        await refreshMe();
        toast.success('¡Cuenta y perfil listos!');
        navigate('/worker/onboarding');
      } else {
        toast.success('¡Cuenta creada!');
        navigate('/scan');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell justify-center pb-10">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-slate-400">¿Cómo vas a usar TIP-IT?</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {ROLES.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setRole(id)}
            className={`card flex flex-col items-center gap-1.5 !p-3 transition ${
              role === id ? 'border-brand-500 bg-brand-500/10' : ''
            }`}
          >
            <Icon size={20} className={role === id ? 'text-brand-400' : 'text-slate-400'} />
            <span className="text-center text-xs font-semibold leading-tight">{label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        {ROLES.find((r) => r.id === role)?.hint}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nombre completo"
          className="input-field"
          required
        />
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="input-field"
          required
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Teléfono"
          className="input-field"
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Contraseña (mín. 8 caracteres)"
          className="input-field"
          minLength={8}
          required
        />

        {needsUsername && (
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
            <span className="text-slate-500">@</span>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="tu_username"
              className="w-full bg-transparent px-2 py-3 text-slate-100 outline-none"
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_.]+"
              required
            />
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          Al crear tu cuenta aceptas los{' '}
          <Link to="/terminos" className="text-brand-400" target="_blank">
            Términos
          </Link>{' '}
          y el{' '}
          <Link to="/privacidad" className="text-brand-400" target="_blank">
            Aviso de privacidad
          </Link>
          .
        </p>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-brand-400">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
