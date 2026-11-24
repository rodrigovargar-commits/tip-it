// Kinds of business that can create a team on TIP-IT. The id is what is stored; the label is
// what people read. The same list lives in frontend/src/utils/businessTypes.js.
const BUSINESS_TYPES = [
  ['hotel', 'Hotel'],
  ['restaurante', 'Restaurante o cafetería'],
  ['bar', 'Bar o club nocturno'],
  ['club_golf', 'Club de golf'],
  ['estacionamiento', 'Estacionamiento o valet'],
  ['spa', 'Spa o masajes'],
  ['belleza', 'Barbería, salón o uñas'],
  ['salud', 'Clínica o consultorio'],
  ['farmacia', 'Farmacia'],
  ['catering', 'Catering o banquetes'],
  ['evento', 'Evento temporal'],
  ['turismo', 'Tours y turismo'],
  ['otro', 'Otro'],
];

const BUSINESS_TYPE_IDS = BUSINESS_TYPES.map(([id]) => id);
const typeLabel = (id) => (BUSINESS_TYPES.find(([k]) => k === id) || BUSINESS_TYPES[BUSINESS_TYPES.length - 1])[1];

// Version of the business terms the owner accepted. Bump it when the text changes.
const BUSINESS_TERMS_VERSION = '2026-11-24';

module.exports = { BUSINESS_TYPES, BUSINESS_TYPE_IDS, typeLabel, BUSINESS_TERMS_VERSION };
