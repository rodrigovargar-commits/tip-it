import { useId } from 'react';

// A form control with a label that stays visible, optional help text and an
// error tied to the field (screen readers read both). Pass a render function
// to receive the props the control needs.
export default function FormField({ label, hint, error, optional, children }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(' ') || undefined;
  const controlProps = { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-sm font-bold text-punch-ink">
        {label}
        {optional && <span className="text-xs font-medium text-slate-500">(opcional)</span>}
      </label>
      {children(controlProps)}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
