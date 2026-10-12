const { normalizePhone, normalizeEmail, normalizeDestination, maskDestination } = require('../../src/utils/otp/normalize');

describe('normalizePhone', () => {
  it.each([
    ['5512345678', '+525512345678'],
    ['55 1234 5678', '+525512345678'],
    ['(55) 1234-5678', '+525512345678'],
    ['+52 55 1234 5678', '+525512345678'],
    ['525512345678', '+525512345678'],
    ['+5215512345678', '+525512345678'], // old mobile prefix
    ['+14155552671', '+14155552671'],
  ])('turns %s into %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each([[''], ['abc'], ['12345'], ['55123456789012345'], [null]])('rejects %s', (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe('normalizeEmail / normalizeDestination / mask', () => {
  it('lowercases and trims a valid email, rejects a bad one', () => {
    expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com');
    expect(normalizeEmail('nope')).toBeNull();
  });
  it('picks the right normalizer per channel', () => {
    expect(normalizeDestination('email', 'A@b.co')).toBe('a@b.co');
    expect(normalizeDestination('sms', '5512345678')).toBe('+525512345678');
    expect(normalizeDestination('whatsapp', '5512345678')).toBe('+525512345678');
  });
  it('masks what it shows back', () => {
    expect(maskDestination('email', 'ana.garcia@example.com')).toMatch(/^an•+@example\.com$/);
    expect(maskDestination('sms', '+525512345678')).toBe('+52 •••• 5678');
  });
});
