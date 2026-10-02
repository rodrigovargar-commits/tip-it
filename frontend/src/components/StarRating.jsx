import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, readOnly = false, iconSize = 28 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`leading-none transition ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
          aria-label={`${star} estrellas`}
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
