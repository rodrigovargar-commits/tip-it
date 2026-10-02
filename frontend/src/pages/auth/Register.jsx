import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout.jsx';
import RegisterForm from '../../components/RegisterForm.jsx';

export default function Register() {
  const [searchParams] = useSearchParams();
  // The marketing landing links here with ?role=worker so people who come to
  // receive tips start on the right option.
  const defaultRole = searchParams.get('role') === 'worker' ? 'worker' : 'client';

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="¿Cómo vas a usar TIP-IT?"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-400">
            Inicia sesión
          </Link>
        </>
      }
    >
      <RegisterForm defaultRole={defaultRole} />
    </AuthLayout>
  );
}
