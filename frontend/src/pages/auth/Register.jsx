import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout.jsx';
import SignupSwitch from '../../components/SignupSwitch.jsx';
import useOtpConfig from '../../hooks/useOtpConfig.js';

export default function Register() {
  const [searchParams] = useSearchParams();
  const config = useOtpConfig();
  const stepByStep = Boolean(config?.enabled);
  // The marketing landing links here with ?role=worker so people who come to
  // receive tips start on the right option. In the step-by-step flow, receiving
  // is the main path (paying needs no account), so it is the default.
  const defaultRole = stepByStep
    ? searchParams.get('role') === 'client'
      ? 'client'
      : 'worker'
    : searchParams.get('role') === 'worker'
      ? 'worker'
      : 'client';

  return (
    <AuthLayout
      title={stepByStep ? undefined : 'Crear cuenta'}
      subtitle="¿Cómo vas a usar TIP-IT?"
      footer={
        stepByStep ? undefined : (
          <>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-brand-400">
              Inicia sesión
            </Link>
          </>
        )
      }
    >
      <SignupSwitch defaultRole={defaultRole} />
    </AuthLayout>
  );
}
