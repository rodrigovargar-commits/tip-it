// Cheqpay's rate: one single fee per charge, 3.3% + $1.30 MXN (no split).
// All amounts here are in cents (integers).
const PERCENT = () => Number(process.env.CHEQPAY_FEE_PERCENT || 3.3);
const FIXED_CENTS = () => Math.round(Number(process.env.CHEQPAY_FEE_FIXED_CENTS || 130));

// Fee Cheqpay takes out of a charge of `grossCents`.
const feeOnCharge = (grossCents) => Math.round((grossCents * PERCENT()) / 100) + FIXED_CENTS();

// What the person receives from a charge.
const netOfCharge = (grossCents) => grossCents - feeOnCharge(grossCents);

// Smallest charge that leaves the person exactly `netCents` (the sender chose to
// cover the fee). The fee is computed on the whole charge, so it is solved from
// the formula and then corrected by a cent or two for rounding.
const chargeForNet = (netCents) => {
  let gross = Math.ceil((netCents + FIXED_CENTS()) / (1 - PERCENT() / 100));
  while (netOfCharge(gross) < netCents) gross += 1;
  while (netOfCharge(gross - 1) >= netCents) gross -= 1;
  return gross;
};

module.exports = { feeOnCharge, netOfCharge, chargeForNet };
