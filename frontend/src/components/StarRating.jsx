export default function StarRating({ value = 0, onChange, readOnly = false, size = 'text-2xl' }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className={`flex gap-1 ${size}`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`leading-none transition ${
            star <= value ? 'text-amber-400' : 'text-slate-700'
          } ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          aria-label={`${star} estrellas`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
