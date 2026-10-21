// Turns whatever someone typed ("barbero", "Uñas", "toco en el metro") into
// one of the lead categories, and an Instagram handle or profile link into a
// bare handle. Used by the admin portal and the ManyChat entry point, where
// the text comes from a person, not from our own form.
const RULES = [
  ['barbero_estilista', /barb|estilis|peluq|sal[oó]n|u[ñn]as|belleza|nail|maquill/i],
  ['musico_artista', /m[uú]sic|artist|cant|toco|banda|mariachi|malabar/i],
  ['puesto_comida', /comida|puesto|taco|caf[eé]|restaur|cocina|antojit/i],
];

function categoryFromText(text) {
  const t = String(text || '').trim();
  if (['barbero_estilista', 'musico_artista', 'puesto_comida', 'otro'].includes(t)) return t;
  const hit = RULES.find(([, re]) => re.test(t));
  return hit ? hit[0] : 'otro';
}

function cleanInstagram(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .toLowerCase()
    .slice(0, 60);
}

module.exports = { categoryFromText, cleanInstagram };
