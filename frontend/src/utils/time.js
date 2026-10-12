// "Hace 3 días", "Hace 1 semana"... in Spanish, for review dates.
export function timeAgo(iso, now = Date.now()) {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  const units = [
    ['año', 365 * 86400],
    ['mes', 30 * 86400],
    ['semana', 7 * 86400],
    ['día', 86400],
    ['hora', 3600],
    ['minuto', 60],
  ];
  for (const [name, size] of units) {
    const n = Math.floor(secs / size);
    if (n >= 1) {
      const plural = name === 'mes' ? (n === 1 ? 'mes' : 'meses') : n === 1 ? name : `${name}s`;
      return `Hace ${n} ${plural}`;
    }
  }
  return 'Hace un momento';
}
