import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Consistent page title block for every app screen: optional back pill,
// small tilted eyebrow chip, big display title and a friendly subtitle.
export default function PageHeader({ title, subtitle, eyebrow, back, action, className = '' }) {
  return (
    <div className={className}>
      {back && (
        <Link
          to={back.to}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border-2 border-punch-ink bg-white px-3.5 py-1.5 font-display text-sm font-extrabold transition hover:bg-punch-yellow"
        >
          <ArrowLeft size={15} strokeWidth={2.6} />
          {back.label || 'Volver'}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <span className="mb-2 inline-block -rotate-2 rounded-full border-2 border-punch-ink bg-punch-yellow px-3 py-0.5 font-display text-xs font-extrabold uppercase tracking-wider">
              {eyebrow}
            </span>
          )}
          <h1 className="text-3xl font-extrabold leading-none md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-sm font-medium text-slate-400 md:text-base">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
