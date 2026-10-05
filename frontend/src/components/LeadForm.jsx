import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, HandCoins, Mic2, Scissors, UtensilsCrossed } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import { trackEvent } from '../utils/analytics.js';

// "Quiero que me ayuden" form: someone leaves a WhatsApp and/or an email and
// gets help setting up their account and QR in person. It creates NO account.
// Used on /unete and inside the landing's sign-up section.
export const CATEGORIES = [
  { id: 'barbero_estilista', label: 'Barbero / estilista', icon: Scissors },
  { id: 'musico_artista', label: 'Músico / artista', icon: Mic2 },
  { id: 'puesto_comida', label: 'Puesto de comida', icon: UtensilsCrossed },
  { id: 'otro', label: 'Otro servicio', icon: HandCoins },
];

export default function LeadForm({ source = 'landing' }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', category: '', zone: '', website: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) {
      toast.error('Elige a qué te dedicas');
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      toast.error('Déjanos un WhatsApp o un correo para contactarte');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leads', { ...form, source });
      trackEvent('lead_submitted', { source, category: form.category });
      setDone(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 size={48} className="mx-auto text-brand-400" />
        <h3 className="mt-4 font-display text-2xl font-extrabold">
          ¡Listo, {form.name.split(' ')[0]}!
        </h3>
        <p className="mt-2 font-medium text-slate-400">
          Ya quedaste en la lista. Te contactamos pronto para armar tu cuenta y tu QR en persona
          — toma unos 10 minutos.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot: invisible to people, tempting to bots. Anything typed here is discarded server-side. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-website">Sitio web</label>
        <input id="lead-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={handleChange} />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500" htmlFor="lead-name">Tu nombre</label>
        <input
          id="lead-name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          required
          maxLength={100}
          placeholder="Como te dicen tus clientes"
          className="input-field mt-1"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold text-slate-500" htmlFor="lead-phone">WhatsApp</label>
          <input
            id="lead-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={form.phone}
            onChange={handleChange}
            maxLength={30}
            placeholder="55 1234 5678"
            className="input-field mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500" htmlFor="lead-email">O tu correo</label>
          <input
            id="lead-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={handleChange}
            maxLength={120}
            placeholder="tucorreo@gmail.com"
            className="input-field mt-1"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs font-medium text-slate-500">Con uno de los dos basta.</p>

      <div>
        <label className="text-xs font-bold text-slate-500">¿A qué te dedicas?</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => setForm((f) => ({ ...f, category: id }))}
              aria-pressed={form.category === id}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 border-punch-ink p-3 text-center font-display text-xs font-extrabold transition ${
                form.category === id
                  ? 'bg-punch-yellow shadow-[3px_3px_0_0_#0A2F2F]'
                  : 'bg-white hover:bg-punch-pink/40'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500" htmlFor="lead-zone">Zona o colonia (opcional)</label>
        <input
          id="lead-zone"
          name="zone"
          value={form.zone}
          onChange={handleChange}
          maxLength={100}
          placeholder="Ej. Coyoacán centro"
          className="input-field mt-1"
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Enviando...' : 'Quiero que me ayuden'}
      </button>
    </form>
  );
}
