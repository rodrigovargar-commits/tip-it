const { encryptField, decryptField } = require('../../src/utils/fieldCrypto');

describe('fieldCrypto (§7 encryption at rest)', () => {
  const OLD = process.env.DATA_ENCRYPTION_KEY;
  afterEach(() => {
    process.env.DATA_ENCRYPTION_KEY = OLD;
    if (OLD === undefined) delete process.env.DATA_ENCRYPTION_KEY;
  });

  it('round-trips and never stores plaintext when a key is set', () => {
    process.env.DATA_ENCRYPTION_KEY = 'a'.repeat(64);
    const enc = encryptField('INE123456');
    expect(enc).not.toContain('INE123456');
    expect(decryptField(enc)).toBe('INE123456');
  });

  it('uses a fresh IV each time', () => {
    process.env.DATA_ENCRYPTION_KEY = 'b'.repeat(64);
    expect(encryptField('X1')).not.toBe(encryptField('X1'));
  });

  it('returns null for tampered ciphertext', () => {
    process.env.DATA_ENCRYPTION_KEY = 'c'.repeat(64);
    const enc = encryptField('INE123456');
    expect(decryptField(enc.slice(0, -4) + 'AAAA')).toBeNull();
  });
});
