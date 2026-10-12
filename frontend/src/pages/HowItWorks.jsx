import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import IconBadge from '../components/IconBadge.jsx';
import { QrCode, Calculator, ShieldCheck, HandCoins, UserPlus, Star } from 'lucide-react';

const forClients = [
  {
    icon: QrCode,
    title: 'Escanea o busca',
    desc: 'Apunta la cámara al QR de la persona, o busca su usuario. Se abre su perfil; no hace falta descargar nada.',
  },
  {
    icon: Calculator,
    title: 'Elige cómo agradecer',
    desc: 'Un comentario, una propina o las dos cosas. Si dejas propina, tú decides cuánto; no pedimos nombre ni ningún dato.',
  },
  {
    icon: ShieldCheck,
    title: 'Paga seguro',
    desc: 'Con Apple Pay, Google Pay o tarjeta, procesado por Stripe. TIP-IT nunca ve ni guarda tu tarjeta.',
  },
  {
    icon: Star,
    title: 'Deja tu comentario (opcional)',
    desc: 'Después de pagar puedes dejar estrellas y un comentario; ayuda a la persona a construir su reputación.',
  },
];

const forWorkers = [
  {
    icon: UserPlus,
    title: 'Crea tu cuenta',
    desc: 'Con tu teléfono o tu correo y un código que te enviamos, sin contraseña. Elige tu usuario y generamos tu QR.',
  },
  {
    icon: ShieldCheck,
    title: 'Conecta tu banco',
    desc: 'Verificación rápida con Stripe Connect, para que el dinero llegue directo a tu cuenta.',
  },
  {
    icon: QrCode,
    title: 'Comparte tu QR',
    desc: 'Imprímelo, pégalo donde trabajas, o compártelo por WhatsApp — cada pago te llega directo.',
  },
  {
    icon: HandCoins,
    title: 'Cobra y crece',
    desc: 'Ve tu total recibido, tus reseñas y tu reputación desde un solo panel.',
  },
];

const faqs = [
  ['¿Necesito crear una cuenta para pagar?', 'No. Escaneas, ves el perfil, eliges el monto y pagas. No pedimos nombre ni ningún dato.'],
  ['¿TIP-IT guarda mi tarjeta?', 'Nunca. El pago lo procesa Stripe directamente — TIP-IT no ve ni almacena números de tarjeta.'],
  ['¿Cuánto cobra TIP-IT?', 'Una comisión pequeña por transacción, siempre visible antes de pagar. Quien envía el pago puede elegir cubrirla para que la persona reciba el 100%.'],
  ['¿Cómo recibo mi dinero si recibo propinas?', 'Se transfiere directo a tu cuenta bancaria a través de Stripe Connect — TIP-IT no retiene el dinero en ningún momento.'],
  ['¿Puedo dejar un comentario sin pagar?', 'Sí. Entra a su perfil y toca “Dejar un comentario”. Revisamos los comentarios antes de publicarlos y se marcan como “Sin pago asociado”.'],
  ['¿Qué pasa si quiero recibir pagos más adelante?', 'Solo necesitas poner una contraseña para proteger tu cuenta y conectar tu banco — lo puedes hacer cuando quieras desde tu perfil.'],
];

function StepList({ steps }) {
  return (
    <div className="mt-4 space-y-3">
      {steps.map(({ icon: Icon, title, desc }, i) => (
        <div key={i} className="card flex items-start gap-3">
          <IconBadge icon={Icon} tone={['yellow', 'pink', 'orange', 'teal'][i % 4]} size={44} />
          <div>
            <p className="font-semibold text-slate-100">{title}</p>
            <p className="mt-0.5 text-sm text-slate-400">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div className="page-shell">
      <PageHeader
        back={{ to: '/', label: 'Página principal' }}
        eyebrow="Guía de la app"
        title="¿Cómo funciona TIP-IT?"
        subtitle="Dar o recibir propinas toma menos de un minuto. Así funciona cada lado."
      />

      <h2 className="mt-8 text-2xl font-extrabold">Si vas a dar propina</h2>
      <StepList steps={forClients} />

      <h2 className="mt-10 text-2xl font-extrabold">Si vas a recibir propinas</h2>
      <StepList steps={forWorkers} />

      <h2 className="mt-10 text-2xl font-extrabold">Preguntas frecuentes</h2>
      <div className="mt-4 space-y-4">
        {faqs.map(([q, a], i) => (
          <div key={i}>
            <p className="font-semibold text-slate-100">{q}</p>
            <p className="mt-1 text-sm text-slate-400">{a}</p>
          </div>
        ))}
      </div>

      <Link to="/scan" className="btn-primary mt-10 w-full">
        Empezar
      </Link>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Dudas? Escríbenos al{' '}
        <span className="font-semibold text-slate-300">55 8007 5613</span>
      </p>
    </div>
  );
}
