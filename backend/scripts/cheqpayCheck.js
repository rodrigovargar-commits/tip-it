// Checks the Cheqpay credentials in backend/.env without printing them.
// Run: node scripts/cheqpayCheck.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const base = process.env.CHEQPAY_API_URL || 'https://api.sandbox.cheqpay.mx';
const key = (process.env.CHEQPAY_SECRET_KEY || '').trim();
const merchant = (process.env.CHEQPAY_MERCHANT_ID || '').trim();

const describe = (name, value, prefix) => {
  const clean = value.replace(/[\x21-\x7e]/g, '');
  const ok = value && (!prefix || value.startsWith(prefix));
  console.log(`${ok ? 'OK ' : 'MAL'} ${name}: ${value ? `${value.length} caracteres` : 'VACÍA'}${prefix ? `, empieza con ${prefix}: ${value.startsWith(prefix) ? 'sí' : 'no'}` : ''}${clean ? ', tiene espacios o caracteres raros' : ''}`);
};

describe('CHEQPAY_SECRET_KEY', key, 'sk_test_');
describe('CHEQPAY_MERCHANT_ID', merchant);

(async () => {
  if (!key) return;
  const headers = { 'x-api-key': key, 'Content-Type': 'application/json' };
  if (merchant) headers['x-merchant-id'] = merchant;
  for (const [method, path, body] of [
    ['GET', '/pos/v2/customers?limit=1'],
    ['POST', '/lps/payment-links/list', '{}'],
  ]) {
    try {
      const res = await fetch(base + path, { method, headers, body });
      const text = (await res.text()).replaceAll(key, '***').slice(0, 120);
      console.log(`${res.ok ? 'OK ' : 'MAL'} ${method} ${path} -> ${res.status} ${text}`);
    } catch (e) {
      console.log(`MAL ${method} ${path} -> sin conexión (${e.message})`);
    }
  }
})();
