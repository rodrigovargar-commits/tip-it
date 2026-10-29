const crypto = require('crypto');

// No 0/O, 1/I/L: a code read aloud or typed from a photo must not be ambiguous.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

function generateBusinessCode() {
  const bytes = crypto.randomBytes(LENGTH);
  let out = '';
  for (let i = 0; i < LENGTH; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Accepts "abcd-2345", "ABCD 2345" or "ABCD2345"; returns "ABCD2345" or null.
function normalizeBusinessCode(input) {
  const clean = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== LENGTH) return null;
  for (const ch of clean) if (!ALPHABET.includes(ch)) return null;
  return clean;
}

function formatBusinessCode(code) {
  return code ? `${code.slice(0, 4)}-${code.slice(4)}` : '';
}

module.exports = { generateBusinessCode, normalizeBusinessCode, formatBusinessCode, ALPHABET, LENGTH };
