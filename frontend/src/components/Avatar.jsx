export default function Avatar({ src, name, size = 56, className = '' }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
