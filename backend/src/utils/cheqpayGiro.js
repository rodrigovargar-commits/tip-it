// "Giro del comercio" options of Cheqpay's onboarding form (Persona Física),
// copied as they appear there. Ids are stable; labels are what Cheqpay shows.
const GIROS = [
  { id: 'servicios_profesionales', label: 'Servicios profesionales' },
  { id: 'barberias', label: 'Barberías' },
  { id: 'esteticas', label: 'Estéticas' },
  { id: 'musica', label: 'Música' },
  { id: 'espectaculos', label: 'Espectáculos' },
  { id: 'alimentos', label: 'Alimentos y puestos' },
  { id: 'domicilio', label: 'Servicios a domicilio' },
  { id: 'otros', label: 'Otros servicios' },
];

const GIRO_IDS = GIROS.map((g) => g.id);

// Suggested giro for each TIP-IT activity. The person can change it. Tourism,
// health and transport have no exact match in Cheqpay's list, so those are a
// best guess: health and tourism go to "Servicios profesionales", transport to
// "Otros servicios" (with its own description).
const ACTIVITY_TO_GIRO = {
  barberia: 'barberias',
  belleza: 'esteticas',
  musica: 'musica',
  comida: 'alimentos',
  salud: 'servicios_profesionales',
  turismo: 'servicios_profesionales',
  transporte: 'otros',
  otro: 'otros',
};

const ACTIVITY_OTHER_TEXT = { transporte: 'Transporte y valet' };

const suggestGiro = (activity) => ({
  giro: ACTIVITY_TO_GIRO[activity] || '',
  giroOther: ACTIVITY_OTHER_TEXT[activity] || '',
});

// Persona Física RFC: 4 letters + 6 digits (birth date) + 3 homoclave characters.
const RFC_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;

const normalizeRfc = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();

module.exports = { GIROS, GIRO_IDS, ACTIVITY_TO_GIRO, suggestGiro, RFC_FISICA, normalizeRfc };
