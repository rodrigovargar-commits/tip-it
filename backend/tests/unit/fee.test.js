const { calculateFee } = require('../../src/controllers/tipController');

// Business rule: platform commission = percent (from env) + fixed cents.
// PLATFORM_FEE_PERCENT=6, PLATFORM_FEE_FIXED_CENTS=400 (set in tests/setup.js),
// matching production's real, cost-calibrated values.
describe('calculateFee (business rule)', () => {
  it('applies 6% + $4.00 MXN on a typical tip', () => {
    // $50.00 tip -> 5000 cents. 6% of 5000 = 300, + 400 fixed = 700 (=$7.00)
    expect(calculateFee(5000)).toBe(700);
  });

  it('rounds the percentage portion to the nearest cent', () => {
    // $10.33 tip -> 1033 cents. 6% of 1033 = 61.98 -> rounds to 62, + 400 = 462
    expect(calculateFee(1033)).toBe(462);
  });

  it('never returns less than the fixed fee, even for the smallest tip', () => {
    // $1.00 tip -> 100 cents. 6% of 100 = 6, + 400 = 406
    expect(calculateFee(100)).toBe(406);
  });

  it('scales linearly with larger amounts', () => {
    // $1,000.00 tip -> 100000 cents. 6% of 100000 = 6000, + 400 = 6400
    expect(calculateFee(100000)).toBe(6400);
  });

  it('rejection case: a fee this size is always smaller than the tip itself for realistic amounts', () => {
    // Guards against a future change to the formula silently making the
    // commission exceed (or equal) the tip for normal amounts.
    const tip = 5000;
    expect(calculateFee(tip)).toBeLessThan(tip);
  });
});
