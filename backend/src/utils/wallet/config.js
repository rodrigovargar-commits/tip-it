// Apple Wallet and Google Wallet need accounts that only the owner can create
// (Apple Developer Program and a Google Wallet issuer). Until their keys are in
// the environment the buttons stay hidden and these helpers say "not available".
const env = (k) => (process.env[k] || '').trim();

function isGoogleConfigured() {
  return Boolean(env('GOOGLE_WALLET_ISSUER_ID') && env('GOOGLE_WALLET_CLIENT_EMAIL') && env('GOOGLE_WALLET_PRIVATE_KEY'));
}

function isAppleConfigured() {
  return Boolean(
    env('APPLE_WALLET_PASS_TYPE_ID') &&
      env('APPLE_WALLET_TEAM_ID') &&
      env('APPLE_WALLET_CERT_PEM_BASE64') &&
      env('APPLE_WALLET_KEY_PEM_BASE64') &&
      env('APPLE_WALLET_WWDR_PEM_BASE64')
  );
}

module.exports = { isGoogleConfigured, isAppleConfigured, env };
