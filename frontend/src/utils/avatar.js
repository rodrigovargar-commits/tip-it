// The server answers a profile photo as a short path ("/api/users/<id>/avatar?v=3") that the browser
// can cache, instead of the photo itself. Turn it into a full address on the API's own host.
// Anything else (an inline photo, or nothing) passes through untouched.
const API_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api', window.location.href).origin;
  } catch {
    return '';
  }
})();

export function photoSrc(src) {
  return typeof src === 'string' && src.startsWith('/api/') ? `${API_ORIGIN}${src}` : src;
}
