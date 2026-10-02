import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AuthLayout from '../../components/AuthLayout.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      await login(data.token, data.user);
      toast.success(`Bienvenido, ${data.user.name.split(' ')[0]}`);
      navigate('/scan');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Ingresa a tu cuenta de TIP-IT."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-brand-400">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Contraseña"
          className="input-field"
          required
        />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </AuthLayout>
  );
}
