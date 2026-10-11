import { Star } from 'lucide-react';

// Five stars, none chosen to begin with. Read by screen readers as a group of
// radio buttons ("1 de 5 estrellas" ...); pass readOnly to just display one.
export default function StarRating({ value = 0, onChange, readOnly = false, iconSize = 28, label = 'Calificación' }) {
  const stars = [1, 2, 3, 4, 5];

  if (readOnly) {
    return (
      <div className="flex gap-0.5" role="img" aria-label={`${value} de 5 estrellas`}>
        {stars.map((star) => (
          <Star key={star} size={iconSize} fill={star <= value ? '#FF8243' : 'none'} stroke={star <= value ? '#FF8243' : '#C9BA97'} strokeWidth={1.5} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} de 5 estrellas`}
          onClick={() => onChange?.(value === star ? 0 : star)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full leading-none transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-punch-ink"
        >
          <Star
            size={iconSize}
            fill={star <= value ? '#FF8243' : 'none'}
            stroke={star <= value ? '#FF8243' : '#C9BA97'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
