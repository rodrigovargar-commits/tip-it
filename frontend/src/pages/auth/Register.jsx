import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout.jsx';
import SignupSwitch from '../../components/SignupSwitch.jsx';
import useOtpConfig from '../../hooks/useOtpConfig.js';
import RegisterChooser from './RegisterChooser.jsx';

export default function Register() {
  const [searchParams] = useSearchParams();
  const config = useOtpConfig();
  const stepByStep = Boolean(config?.enabled);
  const roleParam = searchParams.get('role');
  // No role in the link: ask who the QR is for. Ads and old links that carry a
  // role keep going straight to their form, so nothing that already works changes.
  if (!roleParam) return <RegisterChooser />;
  // The marketing landing links here with ?role=worker so people who come to
  // receive tips start on the right option. In the step-by-step flow, receiving
  // is the main path (paying needs no account), so it is the default.
  const defaultRole = roleParam === 'team'
    ? 'team'
    : stepByStep
      ? roleParam === 'client'
        ? 'client'
        : 'worker'
      : roleParam === 'worker'
        ? 'worker'
        : 'client';

  return (
    <AuthLayout
      title={stepByStep ? undefined : 'Crear cuenta'}
      subtitle={roleParam === 'team' ? 'Crea tu cuenta y después tu negocio.' : '¿Cómo vas a usar TIP-IT?'}
      footer={
        stepByStep ? undefined : (
          <>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-brand-400">
              Inicia sesión
            </Link>
            <span className="mt-2 block text-xs text-slate-500">
              ¿Primera vez?{' '}
              <a href="/guia/" target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">
                Mira cómo crear tu QR paso a paso
              </a>
            </span>
          </>
        )
      }
    >
      <SignupSwitch defaultRole={defaultRole} />
    </AuthLayout>
  );
}
