import { Store } from 'lucide-react';
import { photoSrc } from '../utils/avatar.js';

// "Works at [logo] Club Campestre": shown on the public profile of everyone on a business team,
// and in the preview the owner sees when creating the business. `logo` can also be a data URL (preview).
export default function BusinessBadge({ business, logo = null, className = '' }) {
  if (!business?.name) return null;
  const src = logo || photoSrc(business.logoUrl);
  return (
    <div className={`inline-flex max-w-full items-center gap-2.5 rounded-full border-2 border-punch-ink bg-white py-1 pl-1 pr-4 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-punch-ink bg-punch-yellow">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Store size={16} aria-hidden="true" />}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Trabaja en</span>
        <span className="block truncate font-display text-sm font-extrabold">{business.name}</span>
        {business.typeLabel ? <span className="block truncate text-xs font-medium text-slate-500">{business.typeLabel}</span> : null}
      </span>
    </div>
  );
}
