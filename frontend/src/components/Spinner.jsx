export default function Spinner({ className = '' }) {
  return (
    <div
      className={`h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-brand-500 ${className}`}
      role="status"
      aria-label="Cargando"
    />
  );
}
