// TIP-IT mark: two overlapping "coins" on a sunny disc. Same shape as before
// (one outline circle, one solid), recoloured to the Tropical punch palette.
export default function Logo({ size = 40, className = '' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
        <circle cx="9" cy="9" r="6" stroke="#0A2F2F" strokeWidth="2" />
        <circle cx="15" cy="15" r="6" fill="#FF8243" stroke="#0A2F2F" strokeWidth="2" />
      </svg>
    </span>
  );
}
