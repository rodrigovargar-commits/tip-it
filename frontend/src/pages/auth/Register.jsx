import { Link, useSearchParams } from 'react-router-dom';
import RegisterForm from '../../components/RegisterForm.jsx';

export default function Register() {
  const [searchParams] = useSearchParams();
  // The marketing landing links here with ?role=worker so people who come to
  // receive tips start on the right option.
  const defaultRole = searchParams.get('role') === 'worker' ? 'worker' : 'client';

  return (
    <div className="page-shell justify-center pb-10">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-slate-400">¿Cómo vas a usar TIP-IT?</p>

      <div className="mt-4">
        <RegisterForm defaultRole={defaultRole} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-brand-400">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
