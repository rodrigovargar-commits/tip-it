// Which payment provider the app uses. Stripe is the default and stays intact;
// Cheqpay is switched on only with PAYMENT_PROVIDER=cheqpay.
const providerName = () => (String(process.env.PAYMENT_PROVIDER || 'stripe').toLowerCase() === 'cheqpay' ? 'cheqpay' : 'stripe');

// Can this person receive a tip through the active provider?
//  - Stripe: they finished Stripe's onboarding.
//  - Cheqpay: their Cheqpay application was approved. While the sandbox has a
//    single test merchant, CHEQPAY_ALLOW_ALL_USERS=true lets every profile
//    receive (all test money lands on that merchant). Never set it in production.
function canReceiveTips(worker) {
  if (providerName() === 'cheqpay') {
    return worker.cheqpay?.status === 'approved' || process.env.CHEQPAY_ALLOW_ALL_USERS === 'true';
  }
  return Boolean(worker.stripeOnboardingComplete);
}

module.exports = { providerName, canReceiveTips };
