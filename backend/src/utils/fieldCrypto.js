const crypto = require('crypto');

// Field-level encryption at rest for sensitive personal data (RV §7).
// AES-256-GCM; the key comes from DATA_ENCRYPTION_KEY (64 hex chars = 32 bytes).
// Without a key the value is stored as-is (dev/test) — production must set it.
const PREFIX = 'enc:v1:';

const getKey = () => {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return Buffer.from(hex, 'hex');
};

const encryptField = (plain) => {
  if (plain === null || plain === undefined || plain === '') return plain;
  if (String(plain).startsWith(PREFIX)) return plain;
  const key = getKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, data]).toString('base64');
};

const decryptField = (stored) => {
  if (typeof stored !== 'string' || !stored.startsWith(PREFIX)) return stored;
  const key = getKey();
  if (!key) return null;
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
};

module.exports = { encryptField, decryptField };
