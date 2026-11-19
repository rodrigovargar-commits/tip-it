import { RefreshCw } from 'lucide-react';

// Shown when a page could not load after several tries (bad signal, server waking up).
// The person stays on the same page and can try again; we never bounce them somewhere else.
export default function LoadFailed({ onRetry }) {
  return (
    <div className="page-shell flex min-h-[60svh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-2xl font-extrabold">No pudimos abrir esta página</h1>
      <p className="mt-2 max-w-xs text-sm font-medium text-slate-500">
        Puede ser la señal o que el servidor tardó en despertar. Tu QR está bien: vuelve a intentar.
      </p>
      <button type="button" onClick={onRetry} className="btn-primary mt-6 inline-flex items-center gap-2">
        <RefreshCw size={16} /> Reintentar
      </button>
    </div>
  );
}
