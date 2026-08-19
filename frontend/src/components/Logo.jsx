export default function Logo({ size = 40, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.58}
        height={size * 0.58}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="9" cy="9" r="6.5" stroke="white" strokeWidth="1.8" fillOpacity="0" />
        <circle cx="15" cy="15" r="6.5" fill="white" fillOpacity="0.95" />
      </svg>
    </div>
  );
}
