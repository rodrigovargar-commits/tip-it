// TIP-IT mark ("Original" from the brand sheet): a big yellow circle with a
// smaller orange one over its lower-right edge, both outlined in dark green.
// On dark backgrounds the outline is dropped and the two colours carry it.
export default function Logo({ size = 40, onDark = false, className = '' }) {
  const stroke = onDark ? 'none' : '#0A2F2F';
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <circle cx="38" cy="38" r="31" fill="#FCE883" stroke={stroke} strokeWidth="7" />
      <circle cx="62" cy="62" r="23" fill="#FF8243" stroke={stroke} strokeWidth="7" />
    </svg>
  );
}

// "TIP-IT" in the heavy display face, with the hyphen as a rounded orange bar.
export function Wordmark({ className = '', onDark = false }) {
  return (
    <span className={`font-display font-extrabold leading-none tracking-tight ${onDark ? 'text-white' : 'text-punch-ink'} ${className}`}>
      TIP
      <span aria-hidden="true" className="mx-[0.05em] inline-block h-[0.16em] w-[0.31em] translate-y-[-0.14em] rounded-full bg-punch-orange align-middle" />
      IT
    </span>
  );
}

export function LogoFull({ size = 36, onDark = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} onDark={onDark} />
      <Wordmark onDark={onDark} className="text-xl md:text-2xl" />
    </span>
  );
}
