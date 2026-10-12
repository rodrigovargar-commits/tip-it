// Soft background shapes and little flourishes used across the site, taken
// from the brand sheets: pastel blobs, short "spark" dashes and a handwritten
// note. Purely decorative: hidden from screen readers and never clickable.
const BLOB = 'rounded-[58%_42%_55%_45%/50%_55%_45%_50%]';
const COLORS = {
  yellow: 'bg-punch-yellow',
  orange: 'bg-punch-orange',
  pink: 'bg-punch-pink',
  teal: 'bg-punch-teal',
  cream: 'bg-punch-cream',
};

export function Blob({ color = 'yellow', className = '', round = false }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute ${COLORS[color]} ${round ? 'rounded-full' : BLOB} ${className}`}
    />
  );
}

// Three short dashes, like a little burst of energy.
export function Sparks({ className = '' }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute block h-16 w-16 ${className}`}>
      <span className="absolute left-0 top-6 h-1.5 w-8 -rotate-[28deg] rounded-full bg-punch-orange" />
      <span className="absolute left-2 top-1 h-1.5 w-7 rotate-[60deg] rounded-full bg-punch-orange" />
      <span className="absolute left-7 top-10 h-1.5 w-6 rotate-[8deg] rounded-full bg-punch-yellow" />
    </span>
  );
}

export function Handwritten({ children, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute block font-display text-lg font-bold italic leading-tight text-punch-ink/80 ${className}`}
      style={{ fontFamily: '"Bradley Hand", "Segoe Print", "Marker Felt", "Comic Sans MS", cursive' }}
    >
      {children}
    </span>
  );
}

// The shapes behind every app screen (sign-up, checkout, profile...): a yellow
// quarter circle top-right and a pink blob low-left, like the onboarding sheet.
export function PageDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-punch-yellow/70" />
      <span className="absolute -right-10 top-40 h-20 w-20 rounded-full bg-punch-orange/80" />
      <Blob color="pink" className="-bottom-28 -left-24 h-72 w-72 opacity-60" />
    </div>
  );
}
