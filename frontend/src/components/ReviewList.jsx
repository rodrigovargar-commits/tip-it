import { Star } from 'lucide-react';
import { timeAgo } from '../utils/time.js';

const initials = (name) => (name && name !== 'Anónimo' ? name.trim().slice(0, 2).toUpperCase() : 'A');

// Reviews as shown on a public profile: a soft card with the author's initials,
// stars, how long ago, and the words. Authors are anonymous unless they picked a
// nickname, and each one says whether a payment is behind it (a payment doesn't
// prove the service was good, but it does prove it happened).
export default function ReviewList({ reviews = [], limit, columns = false }) {
  const items = limit ? reviews.slice(0, limit) : reviews;
  if (!items.length) return null;
  return (
    <ul className={`grid gap-3 ${columns ? 'sm:grid-cols-2' : ''}`}>
      {items.map((r, i) => {
        const text = r.review || r.comment;
        return (
          <li key={i} className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_-14px_rgba(10,47,47,0.35)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-punch-pink font-display text-sm font-extrabold">
                {initials(r.clientName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  {r.rating ? (
                    <span className="flex gap-0.5" role="img" aria-label={`${r.rating} de 5 estrellas`}>
                      {Array.from({ length: r.rating }).map((_, s) => (
                        <Star key={s} size={14} fill="#FF8243" stroke="#FF8243" />
                      ))}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">{r.clientName || 'Anónimo'}</span>
                  )}
                  {r.createdAt && <span className="shrink-0 text-xs text-slate-500">{timeAgo(r.createdAt)}</span>}
                </div>
                {text ? <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{text}</p> : null}
                <p className="mt-2 text-[11px] font-semibold text-slate-500">
                  {r.rating ? `${r.clientName || 'Anónimo'} · ` : ''}
                  {r.source === 'unpaid' ? 'Sin pago asociado' : 'Con pago asociado'}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
