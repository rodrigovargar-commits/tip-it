// Small flat-illustration "people" used on the marketing site, so the page
// feels human without needing stock photos. Pure SVG, palette-only colours.
const INK = '#0A2F2F';

const SKINS = { a: '#F2B58A', b: '#C98B5E', c: '#8D5A3B', d: '#FFD7B5' };

const PRESETS = {
  barber: { skin: 'b', shirt: '#069494', hair: 'short', beard: true, extra: null },
  musician: { skin: 'c', shirt: '#FF8243', hair: 'long', beard: false, extra: 'headphones' },
  cook: { skin: 'd', shirt: '#FFFFFF', hair: 'none', beard: false, extra: 'chef' },
  waiter: { skin: 'a', shirt: '#FFC0CB', hair: 'short', beard: false, extra: 'bowtie' },
  rider: { skin: 'b', shirt: '#FCE883', hair: 'none', beard: false, extra: 'helmet' },
  stylist: { skin: 'a', shirt: '#FF8243', hair: 'curly', beard: false, extra: null },
};

function Hair({ kind }) {
  if (kind === 'short')
    return <path d="M33 41 Q32 21 50 21 Q68 21 67 41 Q60 31 50 31 Q40 31 33 41Z" fill={INK} />;
  if (kind === 'long')
    return (
      <>
        <path d="M32 44 Q30 20 50 20 Q70 20 68 44 L68 62 L60 62 L60 38 L40 38 L40 62 L32 62Z" fill={INK} />
      </>
    );
  if (kind === 'curly')
    return (
      <g fill={INK}>
        {[
          [34, 34, 8],
          [42, 26, 9],
          [52, 24, 9],
          [61, 28, 9],
          [67, 37, 7],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    );
  return null;
}

function Extra({ kind }) {
  if (kind === 'chef')
    return (
      <g fill="#fff" stroke={INK} strokeWidth="2">
        <rect x="34" y="20" width="32" height="9" rx="2" />
        <circle cx="38" cy="16" r="8" />
        <circle cx="50" cy="12" r="9" />
        <circle cx="62" cy="16" r="8" />
        <rect x="34" y="20" width="32" height="9" rx="2" stroke="none" />
      </g>
    );
  if (kind === 'helmet')
    return (
      <path d="M31 40 Q31 18 50 18 Q69 18 69 40 L31 40Z" fill="#FF8243" stroke={INK} strokeWidth="2" />
    );
  if (kind === 'headphones')
    return (
      <g stroke={INK} strokeWidth="3" fill="none">
        <path d="M31 44 Q30 18 50 18 Q70 18 69 44" />
        <rect x="27" y="42" width="7" height="12" rx="3" fill="#FCE883" />
        <rect x="66" y="42" width="7" height="12" rx="3" fill="#FCE883" />
      </g>
    );
  if (kind === 'bowtie')
    return (
      <g fill={INK}>
        <path d="M50 70 L41 65 L41 75Z" />
        <path d="M50 70 L59 65 L59 75Z" />
        <circle cx="50" cy="70" r="2.5" />
      </g>
    );
  return null;
}

export default function Person({ kind = 'barber', size = 96, className = '' }) {
  const p = PRESETS[kind] || PRESETS.barber;
  const skin = SKINS[p.skin];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden="true"
    >
      {/* shoulders */}
      <path d="M14 100 Q14 70 50 68 Q86 70 86 100Z" fill={p.shirt} stroke={INK} strokeWidth="2.5" />
      {/* neck */}
      <rect x="44" y="55" width="12" height="15" rx="4" fill={skin} stroke={INK} strokeWidth="2.5" />
      {p.hair === 'long' && <Hair kind="long" />}
      {/* head */}
      <circle cx="50" cy="42" r="17" fill={skin} stroke={INK} strokeWidth="2.5" />
      {p.beard && (
        <path d="M34 46 Q36 64 50 64 Q64 64 66 46 Q58 54 50 54 Q42 54 34 46Z" fill={INK} />
      )}
      {p.hair !== 'long' && <Hair kind={p.hair} />}
      {/* face */}
      <circle cx="44" cy="42" r="1.8" fill={INK} />
      <circle cx="56" cy="42" r="1.8" fill={INK} />
      <path d="M45 48 Q50 52.5 55 48" stroke={p.beard ? '#fff' : INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Extra kind={p.extra} />
    </svg>
  );
}
