// An extra QR opens the profile with its own code (?q=abcd2345). The code has to travel on to the
// payment and comment pages so the tip or comment is counted for that QR.
export function currentQrCode() {
  try {
    const q = new URLSearchParams(window.location.search).get('q') || '';
    return /^[a-z0-9]{8}$/i.test(q) ? q.toLowerCase() : '';
  } catch {
    return '';
  }
}

export const qrQuery = () => (currentQrCode() ? `?q=${currentQrCode()}` : '');
