import { useRef } from 'react';

// Six boxes for the code we sent. Works with typing, pasting the whole code,
// the iOS/Android "autofill from message" suggestion (which drops all six
// digits into one box) and Backspace to go back.
export default function OtpInput({ value, onChange, onComplete, length = 6, disabled, hasError }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const commit = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const handleChange = (i, e) => {
    const typed = e.target.value.replace(/\D/g, '');
    if (!typed) return;
    const clean = commit(value.slice(0, i) + typed + value.slice(i + typed.length));
    refs.current[Math.min(i + typed.length, length - 1, clean.length)]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) {
        commit(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        commit(value.slice(0, i - 1) + value.slice(i));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    const clean = commit(pasted);
    refs.current[Math.min(clean.length, length - 1)]?.focus();
  };

  return (
    <div role="group" aria-label={`Código de ${length} dígitos`} className="flex justify-center gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? length : 1}
          disabled={disabled}
          aria-label={`Dígito ${i + 1}`}
          className={`h-14 w-11 rounded-2xl border-2 bg-white text-center font-display text-2xl font-extrabold outline-none transition focus:border-punch-ink focus:ring-2 focus:ring-punch-yellow disabled:opacity-60 sm:w-12 ${
            hasError ? 'border-red-700' : d ? 'border-punch-ink' : 'border-punch-ink/30'
          }`}
        />
      ))}
    </div>
  );
}
