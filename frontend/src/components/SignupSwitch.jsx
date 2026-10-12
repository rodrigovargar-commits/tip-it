import RegisterForm from './RegisterForm.jsx';
import SignupFlow from './SignupFlow.jsx';
import useOtpConfig from '../hooks/useOtpConfig.js';
import Spinner from './Spinner.jsx';

// New step-by-step sign-up with a code when the server can send codes;
// otherwise the classic form, exactly as before.
export default function SignupSwitch({ defaultRole = 'client' }) {
  const config = useOtpConfig();
  if (!config) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (config.enabled) return <SignupFlow channels={config.channels} defaultRole={defaultRole} />;
  return <RegisterForm defaultRole={defaultRole} />;
}
