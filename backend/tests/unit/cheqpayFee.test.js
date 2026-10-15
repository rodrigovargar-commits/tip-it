const { feeOnCharge, netOfCharge, chargeForNet } = require('../../src/payments/cheqpay/fee');

describe('Cheqpay fee (3.3% + $1.30)', () => {
  it('matches the examples in the migration doc', () => {
    expect(feeOnCharge(2000)).toBe(196); // $20 -> $1.96
    expect(feeOnCharge(5000)).toBe(295); // $50 -> $2.95
    expect(feeOnCharge(10000)).toBe(460); // $100 -> $4.60
    expect(netOfCharge(5000)).toBe(4705);
  });

  it('charges exactly enough to leave the person the full tip when the fee is covered', () => {
    [2000, 5000, 10000, 12345, 50000, 99999].forEach((tip) => {
      const gross = chargeForNet(tip);
      expect(netOfCharge(gross)).toBeGreaterThanOrEqual(tip);
      expect(netOfCharge(gross - 1)).toBeLessThan(tip);
    });
  });

  it('covering the fee on a $50 tip costs $53.05 (the formula in the migration doc)', () => {
    expect(chargeForNet(5000)).toBe(5305);
    expect(feeOnCharge(5305)).toBe(305);
  });
});
