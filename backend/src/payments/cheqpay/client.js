const AppError = require('../../utils/AppError');

// Thin client for Cheqpay's REST API (hosted payment links). Keys come from the
// environment and never leave the server. Amounts in the API are pesos; the rest
// of the app works in cents, so conversion happens here.
const baseUrl = () => process.env.CHEQPAY_API_URL || 'https://api.sandbox.cheqpay.mx';

const centsToPesos = (cents) => Math.round(cents) / 100;

async function request(path, { method = 'GET', body } = {}) {
  const key = process.env.CHEQPAY_SECRET_KEY;
  if (!key) throw new AppError('Los cobros con Cheqpay no están configurados', 503);

  const headers = { 'x-api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.CHEQPAY_MERCHANT_ID) headers['x-merchant-id'] = process.env.CHEQPAY_MERCHANT_ID;

  let res;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AppError('No pudimos conectar con el procesador de pagos. Intenta de nuevo.', 502);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    // Never echo Cheqpay's message to the client (it can mention credentials).
    const err = new AppError('El procesador de pagos rechazó la solicitud', res.status === 401 ? 502 : 400);
    err.cheqpayStatus = res.status;
    err.cheqpayMessage = data?.message || data?.error?.message || '';
    throw err;
  }
  return data;
}

// One hosted checkout for one tip. `externalId` makes the call idempotent, so a
// retry of the same tip returns the same link instead of creating a second one.
async function createPaymentLink({ amountCents, name, description, redirectUrl, cancelUrl, externalId, reference, metadata, expiresAt }) {
  const price = centsToPesos(amountCents);
  return request('/lps/payment-links', {
    method: 'POST',
    body: {
      name,
      description,
      products: [{ name, description, qty: 1, price, total: price }],
      currency: 'MXN',
      totals: { total: price },
      paymentMethods: ['card'],
      redirectUrl,
      cancelUrl,
      externalId,
      reference,
      metadata,
      ...(expiresAt ? { expiresAt } : {}),
    },
  });
}

const getInvoice = (id) => request(`/lps/invoices/${encodeURIComponent(id)}`);

module.exports = { createPaymentLink, getInvoice, centsToPesos };
