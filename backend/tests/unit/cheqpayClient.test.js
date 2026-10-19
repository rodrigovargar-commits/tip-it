const { createPaymentLink, getInvoice, centsToPesos } = require('../../src/payments/cheqpay/client');

describe('Cheqpay client', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    process.env.CHEQPAY_SECRET_KEY = 'sk_test_unit';
    process.env.CHEQPAY_API_URL = 'https://api.sandbox.cheqpay.mx';
    delete process.env.CHEQPAY_MERCHANT_ID;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  const ok = (body) => jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(body) });

  it('converts cents to pesos', () => {
    expect(centsToPesos(5295)).toBe(52.95);
    expect(centsToPesos(2000)).toBe(20);
  });

  it('creates a card-only hosted link in pesos, with the key in the header and an idempotency id', async () => {
    global.fetch = ok({ id: 'lnk_1', url: 'https://pay.cheqpay.mx/lnk_1' });
    const link = await createPaymentLink({
      amountCents: 5295, name: 'Propina', description: 'Propina para Carlos',
      redirectUrl: 'https://www.tipit.com.mx/pagar/carlos?cp_status={status}&cp_invoice_id={invoiceId}',
      cancelUrl: 'https://www.tipit.com.mx/p/carlos', externalId: 'tip-123',
    });
    expect(link.url).toContain('cheqpay');
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.sandbox.cheqpay.mx/lps/payment-links');
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe('sk_test_unit');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ currency: 'MXN', paymentMethods: ['card'], externalId: 'tip-123', totals: { total: 52.95 } });
    expect(body.products[0]).toMatchObject({ qty: 1, price: 52.95, total: 52.95 });
  });

  it('sends the merchant id when there is one', async () => {
    process.env.CHEQPAY_MERCHANT_ID = 'mer_1';
    global.fetch = ok({});
    await getInvoice('inv/1');
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.sandbox.cheqpay.mx/lps/invoices/inv%2F1');
    expect(init.headers['x-merchant-id']).toBe('mer_1');
  });

  it('hides Cheqpay error text from the caller and keeps it for the logs', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '{"message":"Invalid api key"}' });
    await expect(createPaymentLink({ amountCents: 2000, name: 'x', externalId: 'a' })).rejects.toMatchObject({
      message: 'El procesador de pagos rechazó la solicitud',
      cheqpayStatus: 401,
      cheqpayMessage: 'Invalid api key',
    });
  });

  it('fails clearly when there is no key, and when the network is down', async () => {
    delete process.env.CHEQPAY_SECRET_KEY;
    await expect(getInvoice('1')).rejects.toMatchObject({ statusCode: 503 });
    process.env.CHEQPAY_SECRET_KEY = 'sk_test_unit';
    global.fetch = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(getInvoice('1')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('uses a given merchant id instead of the default one', async () => {
    process.env.CHEQPAY_MERCHANT_ID = 'default_merchant';
    global.fetch = ok({});
    await getInvoice('inv1', 'person_merchant');
    expect(global.fetch.mock.calls[0][1].headers['x-merchant-id']).toBe('person_merchant');
  });
});
