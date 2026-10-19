// Campaign tags ("?src=ig_anuncio1") come from the public internet, so they are
// reduced to a short lowercase slug before being stored or grouped on.
function cleanSource(value) {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_\-./]/g, '')
    .slice(0, 50);
}

module.exports = cleanSource;
