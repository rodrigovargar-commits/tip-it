import { Star } from 'lucide-react';

const statusLabel = {
  succeeded: { text: 'Completada', className: 'bg-emerald-500/15 text-emerald-400' },
  pending: { text: 'Pendiente', className: 'bg-amber-500/15 text-amber-400' },
  failed: { text: 'Fallida', className: 'bg-rose-500/15 text-rose-400' },
  canceled: { text: 'Cancelada', className: 'bg-slate-500/15 text-slate-400' },
};

export default function TransactionCard({ transaction, perspective }) {
  const amount = (transaction.amount / 100).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });
  const status = statusLabel[transaction.status] || statusLabel.pending;
  const counterpart =
    perspective === 'worker' ? transaction.client?.name || 'Cliente' : `@${transaction.worker?.username || ''}`;

  return (
    <div className="card flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-slate-100">{counterpart}</p>
        <p className="text-xs text-slate-500">
          {new Date(transaction.createdAt).toLocaleString('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
        {transaction.comment ? (
          <p className="mt-2 text-sm italic text-slate-400">“{transaction.comment}”</p>
        ) : null}
        {transaction.rating ? (
          <div className="mt-1 flex gap-0.5">
            {Array.from({ length: transaction.rating }).map((_, i) => (
              <Star key={i} size={14} fill="#fbbf24" stroke="#fbbf24" />
            ))}
          </div>
        ) : null}
        {transaction.review ? (
          <p className="mt-1 text-sm italic text-slate-400">“{transaction.review}”</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="text-lg font-bold text-slate-100">{amount}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
          {status.text}
        </span>
      </div>
    </div>
  );
}
