// An icon on a soft colour disc — the icon style used across the app (steps,
// features, forms). Pass `icon` (a Lucide component) or `svg` (the name of one of
// the brand icons in /public/art/icons, drawn in the brand sheet's style). The
// brand icons are single-colour shapes, so they take the disc's text colour.
const TONES = {
  yellow: 'bg-punch-yellow text-punch-ink',
  orange: 'bg-punch-orange text-punch-ink',
  pink: 'bg-punch-pink text-punch-ink',
  teal: 'bg-punch-tealdark text-white',
  ink: 'bg-punch-ink text-punch-yellow',
};

export default function IconBadge({ icon: Icon, svg, tone = 'yellow', size = 44, className = '' }) {
  const inner = Math.round(size * 0.52);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${TONES[tone] || TONES.yellow} ${className}`}
      style={{ width: size, height: size }}
    >
      {svg ? (
        <span
          style={{
            width: inner,
            height: inner,
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(/art/icons/${svg}.svg)`,
            maskImage: `url(/art/icons/${svg}.svg)`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
      ) : (
        <Icon size={inner} strokeWidth={2.2} />
      )}
    </span>
  );
}
