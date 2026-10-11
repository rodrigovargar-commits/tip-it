// A line icon on a soft colour disc — the icon style used across the app
// (steps, features, forms). One place, so every icon looks like family.
const TONES = {
  yellow: 'bg-punch-yellow text-punch-ink',
  orange: 'bg-punch-orange text-punch-ink',
  pink: 'bg-punch-pink text-punch-ink',
  teal: 'bg-punch-tealdark text-white',
  ink: 'bg-punch-ink text-punch-yellow',
};

export default function IconBadge({ icon: Icon, tone = 'yellow', size = 44, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${TONES[tone] || TONES.yellow} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  );
}
