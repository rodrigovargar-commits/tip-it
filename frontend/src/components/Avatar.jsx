import { photoSrc } from '../utils/avatar.js';

export default function Avatar({ src, name, size = 56, className = '' }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={photoSrc(src)}
        alt={name || 'Avatar'}
        width={size}
        height={size}
        decoding="async"
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-pink font-display font-extrabold text-punch-ink ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
