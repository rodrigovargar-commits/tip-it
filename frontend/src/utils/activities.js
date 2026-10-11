import { Scissors, Sparkles, Music, UtensilsCrossed, HeartPulse, Compass, Car, Grid2x2 } from 'lucide-react';

// What people do. Ids are stable and match backend/src/utils/activities.js;
// only labels and icons live here.
export const ACTIVITIES = [
  { id: 'barberia', label: 'Barbería', icon: Scissors, tone: 'yellow' },
  { id: 'belleza', label: 'Belleza y uñas', icon: Sparkles, tone: 'pink' },
  { id: 'musica', label: 'Música y arte', icon: Music, tone: 'orange' },
  { id: 'comida', label: 'Comida y bebida', icon: UtensilsCrossed, tone: 'teal' },
  { id: 'salud', label: 'Salud y bienestar', icon: HeartPulse, tone: 'pink' },
  { id: 'turismo', label: 'Turismo y guías', icon: Compass, tone: 'yellow' },
  { id: 'transporte', label: 'Transporte y valet', icon: Car, tone: 'teal' },
  { id: 'otro', label: 'Otro servicio', icon: Grid2x2, tone: 'orange' },
];

export const activityLabel = (id) => ACTIVITIES.find((a) => a.id === id)?.label || '';
