jest.mock('../../src/config/stripe', () => ({ accounts: { retrieve: jest.fn() } }));
const stripe = require('../../src/config/stripe');
const refresh = require('../../src/utils/refreshStripeReadiness');

const makeWorker = (over = {}) => ({
  _id: `w${Math.random()}`,
  stripeAccountId: 'acct_1',
  stripeOnboardingComplete: false,
  save: jest.fn().mockResolvedValue(),
  ...over,
});

describe('refreshStripeReadiness', () => {
  beforeEach(() => stripe.accounts.retrieve.mockReset());

  it('marks the worker ready when Stripe says the account can take charges', async () => {
    stripe.accounts.retrieve.mockResolvedValue({ details_submitted: true, charges_enabled: true });
    const w = makeWorker();
    await refresh(w);
    expect(w.stripeOnboardingComplete).toBe(true);
    expect(w.save).toHaveBeenCalled();
  });

  it('leaves the worker not ready when Stripe is still waiting on something', async () => {
    stripe.accounts.retrieve.mockResolvedValue({ details_submitted: true, charges_enabled: false });
    const w = makeWorker();
    await refresh(w);
    expect(w.stripeOnboardingComplete).toBe(false);
    expect(w.save).not.toHaveBeenCalled();
  });

  it('does not ask Stripe for workers already ready or without an account', async () => {
    await refresh(makeWorker({ stripeOnboardingComplete: true }));
    await refresh(makeWorker({ stripeAccountId: null }));
    expect(stripe.accounts.retrieve).not.toHaveBeenCalled();
  });

  it('asks at most once every 30 seconds for the same worker, and survives a Stripe error', async () => {
    stripe.accounts.retrieve.mockRejectedValue(new Error('network'));
    const w = makeWorker();
    await expect(refresh(w)).resolves.toBe(w);
    await refresh(w);
    expect(stripe.accounts.retrieve).toHaveBeenCalledTimes(1);
  });
});
