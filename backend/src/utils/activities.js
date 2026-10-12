// Catalog of what people do. Stable ids (never the label) are what gets
// stored, so a label can be reworded later without touching any data.
// Mirrored in frontend/src/utils/activities.js.
const ACTIVITIES = [
  { id: 'barberia', label: 'Barbería' },
  { id: 'belleza', label: 'Belleza y uñas' },
  { id: 'musica', label: 'Música y arte' },
  { id: 'comida', label: 'Comida y bebida' },
  { id: 'salud', label: 'Salud y bienestar' },
  { id: 'turismo', label: 'Turismo y guías' },
  { id: 'transporte', label: 'Transporte y valet' },
  { id: 'otro', label: 'Otro servicio' },
];

const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id);

module.exports = { ACTIVITIES, ACTIVITY_IDS };
