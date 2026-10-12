// Turns what a person typed into the one canonical form we store and verify
// against, or null when it can't be a real address/number.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw) {
  const e = String(raw || '').trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

// Mexican numbers are normally typed as 10 digits. Everything is stored in
// E.164 (+52XXXXXXXXXX). The old mobile prefix "1" (+521...) is dropped, since
// carriers stopped using it in 2019.
function normalizePhone(raw) {
  const text = String(raw || '').trim();
  const hasPlus = text.startsWith('+');
  let digits = text.replace(/\D/g, '');
  if (!digits) return null;

  if (!hasPlus) {
    if (digits.length === 10) digits = `52${digits}`;
    else if (digits.length === 12 && digits.startsWith('52')) digits = digits;
    else if (digits.length === 13 && digits.startsWith('521')) digits = `52${digits.slice(3)}`;
    else return null;
  } else if (digits.startsWith('521') && digits.length === 13) {
    digits = `52${digits.slice(3)}`;
  }

  if (digits.startsWith('52') && digits.length !== 12) return null;
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function normalizeDestination(channel, raw) {
  return channel === 'email' ? normalizeEmail(raw) : normalizePhone(raw);
}

function maskDestination(channel, destination) {
  if (channel === 'email') {
    const [user, domain] = destination.split('@');
    return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
  }
  return `${destination.slice(0, 3)} •••• ${destination.slice(-4)}`;
}

module.exports = { normalizeEmail, normalizePhone, normalizeDestination, maskDestination };
