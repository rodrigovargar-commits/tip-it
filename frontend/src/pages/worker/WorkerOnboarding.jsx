import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ShieldCheck, Clock, Star } from 'lucide-react';

const STEPS = [
  {
    icon: QrCode,
    title: 'Tu QR es tu forma de cobrar',
    desc: 'Se generó solo con tu perfil. Compártelo, imprímelo o mándalo por WhatsApp — cada quien te paga escaneándolo o buscando tu username. Lo encuentras cuando quieras en "Mi QR".',
  },
  {
    icon: ShieldCheck,
    title: 'Conecta tu banco una sola vez',
    desc: 'Verificas tu identidad con Stripe para que el dinero llegue directo a tu cuenta — TIP-IT nunca lo retiene ni lo toca.',
  },
  {
    icon: Clock,
    title: 'Los primeros pagos tardan más',
    desc: 'Es normal, no es un error: Stripe retiene los primeros pagos de toda cuenta nueva unos días como medida de seguridad. Después de eso, tus pagos se liberan todos los días.',
  },
  {
    icon: Star,
    title: 'Tu reputación se construye sola',
    desc: 'Cada pago bien calificado se suma a tu perfil público — con el tiempo funciona como tu currículum frente a nuevos clientes.',
  },
];

export default function WorkerOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      navigate('/worker/dashboard');
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="page-shell justify-between pb-10">
      <div>
        <div className="mt-10 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-brand-500' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
            <Icon size={28} strokeWidth={2} />
          </span>
          <h1 className="mt-6 text-2xl font-bold">{current.title}</h1>
          <p className="mt-3 text-slate-400">{current.desc}</p>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={handleNext} className="btn-primary w-full">
          {isLast ? 'Entendido, vamos' : 'Siguiente'}
        </button>
        {!isLast && (
          <button
            onClick={() => navigate('/worker/dashboard')}
            className="w-full text-center text-sm text-slate-500"
          >
            Saltar
          </button>
        )}
      </div>
    </div>
  );
}
