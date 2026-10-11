import { Star } from 'lucide-react';

// Reviews as shown on a public profile. Authors are anonymous unless they
// picked a nickname, and each one says whether a payment is behind it (a
// payment doesn't prove the service was good, but it does prove it happened).
export default function ReviewList({ reviews = [], limit, columns = false }) {
  const items = limit ? reviews.slice(0, limit) : reviews;
  if (!items.length) return null;
  return (
    <ul className={`grid gap-3 ${columns ? 'sm:grid-cols-2' : ''}`}>
      {items.map((r, i) => {
        const text = r.review || r.comment;
        return (
          <li key={i} className="rounded-2xl border-2 border-punch-ink/30 bg-white/60 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-punch-pink font-display text-sm font-extrabold">
                  {(r.clientName || 'A')[0].toUpperCase()}
                </span>
                <span className="text-sm font-bold">{r.clientName || 'Anónimo'}</span>
              </div>
              {r.rating ? (
                <span className="flex gap-0.5" role="img" aria-label={`${r.rating} de 5 estrellas`}>
                  {Array.from({ length: r.rating }).map((_, s) => (
                    <Star key={s} size={13} fill="#FF8243" stroke="#FF8243" />
                  ))}
                </span>
              ) : null}
            </div>
            {text ? <p className="mt-2 text-sm text-slate-300">“{text}”</p> : null}
            <p className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>{r.source === 'unpaid' ? 'Sin pago asociado' : 'Con pago asociado'}</span>
              {r.createdAt && <span>{new Date(r.createdAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })}</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
