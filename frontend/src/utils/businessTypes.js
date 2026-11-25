// Kinds of business, same list as backend/src/utils/businessTypes.js (id stored, label shown).
export const BUSINESS_TYPES = [
  { id: 'hotel', label: 'Hotel' },
  { id: 'restaurante', label: 'Restaurante o cafetería' },
  { id: 'bar', label: 'Bar o club nocturno' },
  { id: 'club_golf', label: 'Club de golf' },
  { id: 'estacionamiento', label: 'Estacionamiento o valet' },
  { id: 'spa', label: 'Spa o masajes' },
  { id: 'belleza', label: 'Barbería, salón o uñas' },
  { id: 'salud', label: 'Clínica o consultorio' },
  { id: 'farmacia', label: 'Farmacia' },
  { id: 'catering', label: 'Catering o banquetes' },
  { id: 'evento', label: 'Evento temporal' },
  { id: 'turismo', label: 'Tours y turismo' },
  { id: 'otro', label: 'Otro' },
];

export const businessTypeLabel = (id) => (BUSINESS_TYPES.find((t) => t.id === id) || BUSINESS_TYPES[BUSINESS_TYPES.length - 1]).label;

// Shown next to the terms checkbox; the server stores the version the owner accepted.
export const BUSINESS_TERMS_VERSION = '24 de noviembre de 2026';
