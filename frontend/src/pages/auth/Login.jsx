import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useOtpConfig from '../../hooks/useOtpConfig.js';
import AuthLayout from '../../components/AuthLayout.jsx';
import CodeVerify from '../../components/CodeVerify.jsx';
import FormField from '../../components/FormField.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const config = useOtpConfig();
  const [mode, setMode] = useState('code'); // code | password
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const canUseCode = Boolean(config?.enabled);
  const showCode = canUseCode && mode === 'code';

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const enter = async (data) => {
    await login(data.token, data.user);
    toast.success(`Bienvenido, ${data.user.name.split(' ')[0]}`);
    navigate(data.user.isWorker ? '/worker/dashboard' : '/scan');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      await enter(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      ¿No tienes cuenta?{' '}
      <Link to="/register" className="font-semibold text-brand-400">
        Regístrate
      </Link>
    </>
  );

  if (showCode) {
    return (
      <AuthLayout footer={footer}>
        <CodeVerify
          purpose="login"
          channels={config.channels}
          onVerified={(data) => enter(data).catch((err) => toast.error(getErrorMessage(err)))}
          heading={
            <>
              <h1 className="text-3xl font-extrabold md:text-4xl">Iniciar sesión</h1>
              <p className="mt-1 text-sm text-slate-400 md:text-base">Te enviamos un código, sin contraseña.</p>
            </>
          }
        />
        <button type="button" onClick={() => setMode('password')} className="mt-5 w-full text-center text-sm font-semibold text-slate-400 underline underline-offset-2">
          Prefiero entrar con contraseña
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Ingresa a tu cuenta de TIP-IT." footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Correo">
          {(p) => (
            <input {...p} type="email" name="email" autoComplete="email" inputMode="email" value={form.email} onChange={handleChange} placeholder="tu@correo.com" className="input-field" required />
          )}
        </FormField>
        <FormField label="Contraseña">
          {(p) => (
            <input {...p} type="password" name="password" autoComplete="current-password" value={form.password} onChange={handleChange} placeholder="Tu contraseña" className="input-field" required />
          )}
        </FormField>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      {canUseCode && (
        <button type="button" onClick={() => setMode('code')} className="mt-5 w-full text-center text-sm font-semibold text-slate-400 underline underline-offset-2">
          Entrar con un código
        </button>
      )}
    </AuthLayout>
  );
}
