// Retratos de clientes (busto, lienzo de 64×64): 8 estilos × 3 estados de ánimo.
// El crítico gastronómico (VIP) lleva boina, monóculo y moño dorado.

const OUT = '#3B2416';
const K = `stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;

const LOOKS = [
  { skin: '#F6C9A0', hair: '#3A2216', shirt: '#2F5FD0', style: 'spiky', neck: 'tee' },
  { skin: '#E3A877', hair: '#8A3B1E', shirt: '#1E8A5F', style: 'bob', neck: 'collar', freckles: true },
  { skin: '#B97A4E', hair: '#1E1410', shirt: '#B3264A', style: 'afro', neck: 'vneck', glasses: true },
  { skin: '#8A5634', hair: '#1A1A1A', shirt: '#C77A00', style: 'bun', neck: 'scarf', earrings: true },
  { skin: '#F2D2B6', hair: '#C9C2B8', shirt: '#6A3FC2', style: 'bald', neck: 'collar', beard: true },
  { skin: '#D49A6A', hair: '#5A2E14', shirt: '#0F7C8A', style: 'ponytail', neck: 'hoodie' },
  { skin: '#F0BE93', hair: '#E0A43A', shirt: '#D2362A', style: 'cap', neck: 'tee' },
  { skin: '#A86B43', hair: '#2B1A12', shirt: '#2E7D32', style: 'wavy', neck: 'apron', mustache: true }
];

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const HAIR_BACK = {
  bob: (h) => `<path d="M15 30c-2-12 5-21 17-21s19 9 17 21c0 7-2 12-4 14H19c-2-2-4-7-4-14z" fill="${h}" ${K}/>`,
  afro: (h) => `<circle cx="32" cy="22" r="19" fill="${h}" ${K}/>${[[16, 18], [22, 9], [32, 6], [42, 9], [48, 18], [49, 28], [15, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${h}"/>`).join('')}`,
  ponytail: (h) => `<path d="M44 20c8 2 11 10 8 20-1 4-5 5-6 2 2-7 1-14-4-18z" fill="${h}" ${K}/>`,
  wavy: (h) => `<path d="M16 32c-3-14 4-23 16-23s19 9 16 23c-2 4-4 5-5 2V24H21v10c-1 3-3 2-5-2z" fill="${h}" ${K}/>`,
  bun: (h) => `<circle cx="32" cy="8" r="7" fill="${h}" ${K}/>`
};

const HAIR_FRONT = {
  spiky: (h) => `<path d="M17 25c-1-9 6-15 15-15s16 6 15 15l-4-6-3 4-3-6-3 5-4-6-3 6-3-4z" fill="${h}" ${K}/>`,
  bob: (h) => `<path d="M17 26c1-9 7-14 15-14s14 5 15 14c-6-1-11-4-14-8-3 4-9 7-16 8z" fill="${h}" ${K}/>`,
  afro: (h) => `<path d="M18 22c2-6 7-9 14-9s12 3 14 9c-4-2-9-3-14-3s-10 1-14 3z" fill="${shade(h, 15)}"/>`,
  bun: (h) => `<path d="M17 25c0-9 7-14 15-14s15 5 15 14c-3-4-9-7-15-7s-12 3-15 7z" fill="${h}" ${K}/>`,
  bald: (h) => `<path d="M18 26c-1-3-1-6 0-8M46 26c1-3 1-6 0-8" stroke="${h}" stroke-width="4" stroke-linecap="round"/>`,
  ponytail: (h) => `<path d="M17 26c0-9 7-15 15-15s15 6 15 15c-5-5-10-8-15-8-4 0-9 2-15 8z" fill="${h}" ${K}/>`,
  cap: (h) => `<path d="M18 27c1-3 2-5 3-6h22c1 1 2 3 3 6" fill="${h}" ${K}/><path d="M16 22c0-8 7-13 16-13s16 5 16 13z" fill="#D2362A" ${K}/><path d="M30 22h24c0 3-3 4-6 4H30z" fill="#A82519" ${K}/><circle cx="32" cy="9.5" r="2" fill="#A82519"/>`,
  wavy: (h) => `<path d="M17 27c0-10 7-16 15-16s15 6 15 16c-3-3-5-5-8-5-2 3-6 4-9 2-3-2-7 0-9 3z" fill="${h}" ${K}/>`
};

function eyes(mood, glasses) {
  let e;
  if (mood === 'happy') {
    e = `<path d="M23 31c1.5-2.5 4.5-2.5 6 0M35 31c1.5-2.5 4.5-2.5 6 0" stroke="${OUT}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  } else {
    const py = mood === 'angry' ? 31.5 : 30.5;
    e = `<ellipse cx="26" cy="31" rx="3" ry="3.3" fill="#fff" ${K}/><ellipse cx="38" cy="31" rx="3" ry="3.3" fill="#fff" ${K}/>
      <circle cx="26.4" cy="${py}" r="1.6" fill="${OUT}"/><circle cx="38.4" cy="${py}" r="1.6" fill="${OUT}"/>
      <circle cx="27" cy="${py - 0.7}" r=".5" fill="#fff"/><circle cx="39" cy="${py - 0.7}" r=".5" fill="#fff"/>`;
  }
  const brows = mood === 'angry'
    ? `<path d="M22 25l7 3M42 25l-7 3" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>`
    : mood === 'worried'
      ? `<path d="M22 26l6-2M42 26l-6-2" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>`
      : `<path d="M22 25.5c2-1.5 5-1.5 7 0M35 25.5c2-1.5 5-1.5 7 0" stroke="${OUT}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const g = glasses ? `<circle cx="26" cy="31" r="5.2" fill="rgba(255,255,255,.18)" stroke="${OUT}" stroke-width="1.8"/><circle cx="38" cy="31" r="5.2" fill="rgba(255,255,255,.18)" stroke="${OUT}" stroke-width="1.8"/><path d="M31.2 31h1.6M20.8 30l-3-1M43.2 30l3-1" stroke="${OUT}" stroke-width="1.6"/>` : '';
  return `<g class="cf-eyes">${e}</g>` + brows + g;
}

function mouth(mood) {
  if (mood === 'happy') return `<path d="M26 37c2 5 10 5 12 0z" fill="#8E2433" ${K}/><path d="M29 40c2 1 4 1 6 0" stroke="#F28C8C" stroke-width="2" stroke-linecap="round"/>`;
  if (mood === 'worried') return `<path d="M27 39c2-1.5 3.5 1 5 0s3.5-1.5 5 0" stroke="${OUT}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  return `<path d="M26 40c2-4 10-4 12 0z" fill="#8E2433" ${K}/><path d="M28 39.2h8" stroke="#fff" stroke-width="1.4"/>`;
}

function neckline(kind, shirt) {
  const dark = shade(shirt, -35);
  switch (kind) {
    case 'collar': return `<path d="M25 47l7 6 7-6-3-2-4 4-4-4z" fill="#fff" ${K}/>`;
    case 'vneck': return `<path d="M27 47l5 8 5-8" fill="none" stroke="${dark}" stroke-width="2.4"/>`;
    case 'scarf': return `<path d="M22 47c6 4 14 4 20 0l2 4c-8 5-16 5-24 0z" fill="#FFC23D" ${K}/><path d="M38 51l3 10-4 1-2-9" fill="#FFC23D" ${K}/>`;
    case 'hoodie': return `<path d="M20 47c4 5 20 5 24 0" fill="none" stroke="${dark}" stroke-width="3"/><path d="M28 52v7M36 52v7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'apron': return `<path d="M24 52h16v12H24z" fill="#FFF8EE" ${K}/><path d="M24 52l-5-5M40 52l5-5" stroke="#FFF8EE" stroke-width="2.4"/>`;
    default: return `<path d="M26 47c2 3 10 3 12 0" fill="none" stroke="${dark}" stroke-width="2.2"/>`;
  }
}

export function customerSvg(look = 0, mood = 'happy', cls = 'customer__face', vip = false) {
  const L = LOOKS[((look % LOOKS.length) + LOOKS.length) % LOOKS.length];
  const skinDark = shade(L.skin, -28);
  const hair = vip ? '#2A170D' : L.hair;
  const style = vip ? 'wavy' : L.style;
  return `<svg class="${cls}" viewBox="6 3 52 52" aria-hidden="true">
    ${HAIR_BACK[style]?.(hair) ?? ''}
    <path d="M8 64c0-11 10-18 24-18s24 7 24 18z" fill="${vip ? '#2A170D' : L.shirt}" ${K}/>
    <path d="M14 58c4-5 10-8 18-8" stroke="#fff" stroke-width="2" fill="none" opacity=".25" stroke-linecap="round"/>
    ${vip ? `<path d="M27 49l5 3 5-3v5l-5-3-5 3z" fill="#FFC23D" ${K}/>` : neckline(L.neck, L.shirt)}
    <path d="M27 40h10v8c-3 2-7 2-10 0z" fill="${skinDark}"/>
    <circle cx="17.5" cy="31" r="3.6" fill="${L.skin}" ${K}/><circle cx="46.5" cy="31" r="3.6" fill="${L.skin}" ${K}/>
    ${L.earrings && !vip ? `<circle cx="17" cy="36" r="1.8" fill="#FFC23D" ${K}/><circle cx="47" cy="36" r="1.8" fill="#FFC23D" ${K}/>` : ''}
    <ellipse cx="32" cy="29" rx="14.5" ry="15.5" fill="${L.skin}" ${K}/>
    <path d="M20 36c3 6 8 8 12 8" stroke="${skinDark}" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>
    ${L.freckles ? [[23, 35], [25, 36.5], [41, 35], [39, 36.5], [24, 37.5], [40, 37.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".7" fill="${skinDark}"/>`).join('') : ''}
    ${mood === 'happy' ? `<ellipse cx="22.5" cy="36" rx="2.6" ry="1.6" fill="#F28C8C" opacity=".55"/><ellipse cx="41.5" cy="36" rx="2.6" ry="1.6" fill="#F28C8C" opacity=".55"/>` : ''}
    ${eyes(mood, L.glasses && !vip)}
    <path d="M31 33c-1 2-1 3 1 3.5" stroke="${skinDark}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${L.beard && !vip ? `<path d="M19 34c1 9 6 12 13 12s12-3 13-12c-3 3-6 4-8 3-1 2-3 3-5 3s-4-1-5-3c-2 1-5 0-8-3z" fill="${L.hair}" ${K}/>` : ''}
    <g class="cf-mouth">${mouth(mood)}</g>
    ${(L.mustache || vip) ? `<path d="M25 36.5c2-2 5-2 7 0 2-2 5-2 7 0-2 1.5-5 1.5-7 .5-2 1-5 1-7-.5z" fill="${vip ? '#2A170D' : L.hair}" ${K}/>` : ''}
    ${HAIR_FRONT[style]?.(hair) ?? ''}
    ${vip ? `<path d="M14 18c2-8 10-12 19-11 9 1 15 5 16 10-8-2-21-2-35 1z" fill="#B3264A" ${K}/><circle cx="33" cy="6.5" r="2.2" fill="#B3264A" ${K}/><circle cx="38" cy="31" r="5.4" fill="rgba(255,255,255,.2)" stroke="#B7791F" stroke-width="1.8"/><path d="M43 33l3 9" stroke="#B7791F" stroke-width="1.2"/>` : ''}
    ${mood === 'worried' ? `<g class="cf-sweat"><path d="M48 18c2 3 3 5 1.5 6.5S46 25 46.5 22.5 48 18 48 18z" fill="#7FC4F0" ${K}/></g>` : ''}
    ${mood === 'angry' ? `<g class="cf-steam"><path d="M50 12c2-2 5-1 5 1 2-1 4 1 3 3 2 1 1 4-1 4M8 14c-2-1-1-4 1-4 0-2 3-3 4-1" fill="none" stroke="#D2362A" stroke-width="2" stroke-linecap="round"/></g>` : ''}
  </svg>`;
}

// Ayudantes de cocina: mismo estilo que los clientes, con gorro de chef, chaqueta blanca
// cruzada y pañuelo del color de cada uno. Van dentro de un círculo de color.
const CHEFS = {
  pepe: { skin: '#E9B98F', hair: '#3A2216', hairStyle: 'short', scarf: '#1C4E9C' },
  rosa: { skin: '#C98E66', hair: '#1E1410', hairStyle: 'long', scarf: '#C8102E', earrings: true },
  luis: { skin: '#8D5A3B', hair: '#D9D2C8', hairStyle: 'grey', scarf: '#2A170D', mustache: true, glasses: true }
};

export function chefSvg(member, extra = '') {
  const C = CHEFS[member.id] ?? { skin: member.look.skin, hair: '#3A2216', hairStyle: 'short', scarf: member.look.shirt };
  const skinDark = shade(C.skin, -28);
  const clip = `chef-${member.id}`;
  const hairBack = C.hairStyle === 'long'
    ? `<path d="M15 30c-1-10 6-16 17-16s18 6 17 16c1 9-1 15-4 17H19c-3-2-5-8-4-17z" fill="${C.hair}" ${K}/>` : '';
  const hairFront = C.hairStyle === 'short'
    ? `<path d="M18 26c0-4 1-7 3-9M46 26c0-4-1-7-3-9" stroke="${C.hair}" stroke-width="4" stroke-linecap="round"/>`
    : C.hairStyle === 'long'
      ? `<path d="M18 27c0-5 2-9 5-11M46 27c0-5-2-9-5-11" stroke="${C.hair}" stroke-width="5" stroke-linecap="round"/>`
      : `<path d="M18 27c-1-4 0-7 2-9M46 27c1-4 0-7-2-9" stroke="${C.hair}" stroke-width="4" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true" ${extra}>
    <defs><clipPath id="${clip}"><circle cx="32" cy="32" r="32"/></clipPath></defs>
    <circle cx="32" cy="32" r="32" fill="${member.look.bg}"/>
    <g clip-path="url(#${clip})"><g transform="translate(5.5 10) scale(.83)">
      ${hairBack}
      <path d="M8 66c0-12 10-19 24-19s24 7 24 19z" fill="#FFFFFF" ${K}/>
      <path d="M32 50v16" stroke="#E3D6C6" stroke-width="1.6"/>
      ${[54, 59, 64].map((y) => `<circle cx="27" cy="${y}" r="1.2" fill="#B9AA98"/><circle cx="37" cy="${y}" r="1.2" fill="#B9AA98"/>`).join('')}
      <path d="M27 40h10v8c-3 2-7 2-10 0z" fill="${skinDark}"/>
      <path d="M23 46l9 7 9-7 1 4-10 7-10-7z" fill="${C.scarf}" ${K}/>
      <circle cx="17.5" cy="31" r="3.6" fill="${C.skin}" ${K}/><circle cx="46.5" cy="31" r="3.6" fill="${C.skin}" ${K}/>
      ${C.earrings ? `<circle cx="17" cy="36" r="1.8" fill="#FFC23D" ${K}/><circle cx="47" cy="36" r="1.8" fill="#FFC23D" ${K}/>` : ''}
      <ellipse cx="32" cy="29" rx="14.5" ry="15.5" fill="${C.skin}" ${K}/>
      <ellipse cx="22.5" cy="36" rx="2.6" ry="1.6" fill="#F28C8C" opacity=".55"/><ellipse cx="41.5" cy="36" rx="2.6" ry="1.6" fill="#F28C8C" opacity=".55"/>
      ${eyes('happy', C.glasses)}
      <path d="M31 33c-1 2-1 3 1 3.5" stroke="${skinDark}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${mouth('happy')}
      ${C.mustache ? `<path d="M25 36.5c2-2 5-2 7 0 2-2 5-2 7 0-2 1.5-5 1.5-7 .5-2 1-5 1-7-.5z" fill="${C.hair}" ${K}/>` : ''}
      ${hairFront}
      <path d="M17 13c-6-1-7-10-1-12 1-7 10-8 13-3 3-5 11-5 13 0 4-4 12-1 11 5 5 2 4 10-2 11z" fill="#FFFFFF" ${K}/>
      <path d="M24 4c0 3 1 6 2 8M32 2v10M40 4c0 3-1 6-2 8" stroke="#E3D6C6" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <rect x="16.5" y="12" width="31" height="7" rx="2.5" fill="#FFFFFF" ${K}/>
    </g></g>
  </svg>`;
}
