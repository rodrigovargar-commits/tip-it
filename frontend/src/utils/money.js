// Money helpers. Amounts travel as integer cents (like the server does) and
// are only turned into text for display.
export const formatCents = (cents) =>
  `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const MIN_TIP_CENTS = 100; // $1.00
export const MAX_TIP_CENTS = 500000; // $5,000.00 (same limit as the server)

// "Otro importe": up to 5 whole digits and 2 decimals, with a dot or a single
// comma. Anything else (negatives, exponents, thousands separators, symbols,
// a third decimal) is an error, never silently corrected.
export function parseAmountInput(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { cents: null, error: null };
  if (!/^\d{1,5}([.,]\d{1,2})?$/.test(raw)) {
    return { cents: null, error: 'Ingresa un importe válido en MXN, con hasta dos decimales.' };
  }
  const cents = Math.round(Number(raw.replace(',', '.')) * 100);
  if (cents < MIN_TIP_CENTS) return { cents: null, error: 'El importe mínimo es de $1.00.' };
  if (cents > MAX_TIP_CENTS) return { cents: null, error: 'El importe máximo es de $5,000.00.' };
  return { cents, error: null };
}

// Same rules as the server. Stripe: commission = percent of the tip + a fixed
// amount. Cheqpay: one rate on the whole charge, so covering the fee raises the
// charge just enough for the person to receive the full tip.
export function quote(tipCents, coverFee, info) {
  const { feePercent, feeFixedCents } = info;
  if (info.provider === 'cheqpay') {
    const feeOf = (gross) => Math.round((gross * feePercent) / 100) + feeFixedCents;
    const netOf = (gross) => gross - feeOf(gross);
    let total = tipCents;
    if (coverFee) {
      total = Math.ceil((tipCents + feeFixedCents) / (1 - feePercent / 100));
      while (netOf(total) < tipCents) total += 1;
      while (netOf(total - 1) >= tipCents) total -= 1;
    }
    return { fee: feeOf(total), total, net: netOf(total), tip: tipCents };
  }
  const fee = Math.round((tipCents * feePercent) / 100) + feeFixedCents;
  const total = coverFee ? tipCents + fee : tipCents;
  return { fee, total, net: total - fee, tip: tipCents };
}
