// Fachadas de los restaurantes en Inicio: la misma casa en arco con toldo de festón,
// ventanas redondas y puerta, más un detalle propio de cada cocina.
// Etapas (ver facadeStage en shared/economy.js):
//   0 en obra · 1 recién abierto · 2 con clientela · 3 local leyenda.
// La fachada se ve completa desde que se abre; la etapa leyenda sólo suma la estrella.

const scallops = (p, alt = '#fff') => Array.from({ length: 9 }, (_, i) => `<circle cx="${62 + i * 22}" cy="108" r="11" fill="${i % 2 ? alt : p}"/>`).join('');
const plant = (x, a = '#5E9E4A') => `<circle cx="${x}" cy="214" r="16" fill="${a}"/><path d="M${x - 12} 236l4-18h16l4 18z" fill="#C2703A"/>`;
const crossWin = (x, d, glass) => `<circle cx="${x}" cy="156" r="24" fill="${glass}"/><circle cx="${x}" cy="156" r="24" fill="none" stroke="${d}" stroke-width="5"/><path d="M${x} 132v48M${x - 24} 156h48" stroke="${d}" stroke-width="3"/>`;
const door = (d) => `<path d="M124 236v-62a26 26 0 0 1 52 0v62z" fill="${d}"/><circle cx="166" cy="206" r="3.5" fill="#FFC23D"/>`;

// Cada cocina: `pre` (detrás de la casa), `arch` (el borde del arco), `sign` (letrero),
// `front` (ventanas, puerta y detalles) y `sides` (lo de los costados, desde la etapa 2).
const FACADES = {
  arepera: {
    arch: () => `<path d="M40 120a110 110 0 0 1 220 0" fill="none" stroke="#C2683A" stroke-width="16" stroke-dasharray="14 4"/><path d="M40 129a110 110 0 0 1 220 0" fill="none" stroke="#8E4A26" stroke-width="3"/>`,
    // Banderín tricolor con el arco de estrellas.
    sign: () => `<path d="M124 26h52a8 8 0 0 1 8 8v6h-68v-6a8 8 0 0 1 8-8z" fill="#F2C200"/><rect x="116" y="40" width="68" height="13" fill="#1C4E9C"/><path d="M116 53h68v6a8 8 0 0 1-8 8h-52a8 8 0 0 1-8-8z" fill="#C8102E"/><circle cx="138.2" cy="52.0" r="1.7" fill="#fff"/><circle cx="140.6" cy="48.5" r="1.7" fill="#fff"/><circle cx="143.9" cy="46.0" r="1.7" fill="#fff"/><circle cx="147.9" cy="44.7" r="1.7" fill="#fff"/><circle cx="152.1" cy="44.7" r="1.7" fill="#fff"/><circle cx="156.1" cy="46.0" r="1.7" fill="#fff"/><circle cx="159.4" cy="48.5" r="1.7" fill="#fff"/><circle cx="161.8" cy="52.0" r="1.7" fill="#fff"/><rect x="116" y="26" width="68" height="41" rx="8" fill="none" stroke="#fff" stroke-width="2.5"/>`,
    front: (p, d) => [86, 214].map((x) => `<circle cx="${x}" cy="160" r="24" fill="#EADCF6"/><path d="M${x - 12} 138v44M${x - 4} 136v48M${x + 4} 136v48M${x + 12} 138v44" stroke="#8E4A26" stroke-width="3.5"/><circle cx="${x}" cy="160" r="24" fill="none" stroke="${d}" stroke-width="5"/>`).join('')
      + `<path d="M124 236v-62a26 26 0 0 1 52 0v62z" fill="#8E4A26"/><path d="M137 236v-74M150 236v-78M163 236v-74" stroke="#6E3618" stroke-width="2"/><circle cx="168" cy="206" r="3.5" fill="#FFC23D"/>`,
    sides: () => `<circle cx="30" cy="196" r="14" fill="#E2577B"/><circle cx="44" cy="184" r="10" fill="#F28CA8"/><circle cx="22" cy="180" r="9" fill="#C8336A"/><circle cx="40" cy="206" r="8" fill="#5E9E4A"/><path d="M16 236l4-20h16l4 20z" fill="#C2703A"/>${plant(272, '#4E8E3A')}`
  },
  taqueria: {
    sign: () => `<circle cx="150" cy="42" r="16" fill="#FFC23D"/><path d="M150 20v-8M150 72v-8M128 42h-8M180 42h-8M134 26l-6-6M166 26l6-6" stroke="#FFC23D" stroke-width="4" stroke-linecap="round"/>`,
    front: (p, d) => `<path d="M58 74q92 30 184 0" fill="none" stroke="#2A170D" stroke-width="1.5"/><path d="M70 78l12 3-2 14-12-3z" fill="#E2577B"/><path d="M96 84l13 2-1 14-13-2z" fill="#F2C200"/><path d="M123 87h13v14h-13z" fill="#1E8A5F"/><path d="M150 88h13v14h-13z" fill="#5AB4E5"/><path d="M177 87l13-1 1 14-13 1z" fill="#E2577B"/><path d="M204 84l13-3 2 14-13 3z" fill="#F2C200"/>`
      + [86, 214].map((x) => `<path d="M${x - 22} 184v-28a22 22 0 0 1 44 0v28z" fill="#FDE3D8" stroke="${d}" stroke-width="5"/><path d="M${x} 136v48M${x - 22} 162h44" stroke="${d}" stroke-width="3"/>`).join('')
      + `<path d="M124 236v-62a26 26 0 0 1 52 0v62z" fill="${d}"/><path d="M124 196h52" stroke="#F2C200" stroke-width="4"/><circle cx="166" cy="212" r="3.5" fill="#FFC23D"/>`,
    sides: () => `<rect x="22" y="186" width="14" height="34" rx="7" fill="#4E8E3A"/><path d="M22 204h-8v-14" fill="none" stroke="#4E8E3A" stroke-width="7" stroke-linecap="round"/><circle cx="29" cy="184" r="4" fill="#E2577B"/><path d="M16 236l4-16h18l4 16z" fill="#C2703A"/><rect x="266" y="192" width="13" height="28" rx="6.5" fill="#5E9E4A"/><path d="M279 210h7v-10" fill="none" stroke="#5E9E4A" stroke-width="6" stroke-linecap="round"/><path d="M258 236l4-16h18l4 16z" fill="#C2703A"/>`
  },
  diner: {
    sign: (p, d) => `<rect x="114" y="26" width="72" height="32" rx="16" fill="${d}"/><text x="150" y="50" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="22" fill="#FF7AB6" stroke="#FFD1E6" stroke-width=".6">66</text>`,
    front: (p, d) => `<rect x="40" y="128" width="220" height="8" fill="#C9D4DD"/><rect x="40" y="131" width="220" height="2" fill="#fff"/>`
      + [58, 186].map((x) => `<rect x="${x}" y="146" width="56" height="40" rx="10" fill="#DCE6FB" stroke="${d}" stroke-width="5"/><path d="M${x + 8} 176h40" stroke="#D9412B" stroke-width="6" stroke-linecap="round"/>`).join('')
      + `<path d="M124 236v-62a26 26 0 0 1 52 0v62z" fill="${d}"/><rect x="134" y="176" width="32" height="20" rx="6" fill="#DCE6FB"/><circle cx="166" cy="210" r="3.5" fill="#FFC23D"/>`
      + `<path d="M40 226h220v10H40z" fill="#fff"/><path d="M40 226h11v10H40zM62 226h11v10H62zM84 226h11v10H84zM106 226h11v10h-11zM183 226h11v10h-11zM205 226h11v10h-11zM227 226h11v10h-11zM249 226h11v10h-11z" fill="#2A170D"/>`,
    sides: () => plant(28) + plant(272, '#4E8E3A')
  },
  trattoria: {
    pre: () => '',
    body: () => `<path d="M40 200h220v36H40z" fill="#E2A98A"/><path d="M40 212h220M40 224h220M60 200v12M100 200v12M140 200v12M180 200v12M220 200v12M80 212v12M120 212v12M200 212v12M240 212v12M60 224v12M100 224v12M200 224v12M240 224v12" stroke="#F3D4C2" stroke-width="2"/>`,
    sign: () => `<path d="M138 58h24l-3-34h-18z" fill="#fff"/><path d="M138 34h24M138 44h24" stroke="#1E7A5A" stroke-width="2"/><circle cx="150" cy="20" r="5" fill="#C8102E"/>`,
    front: (p, d) => [86, 214].map((x) => `<circle cx="${x}" cy="152" r="22" fill="#D6EEE4" stroke="${d}" stroke-width="5"/><path d="M${x} 130v44M${x - 22} 152h44" stroke="${d}" stroke-width="3"/><rect x="${x - 24}" y="176" width="48" height="10" rx="3" fill="#8E5A2C"/><circle cx="${x - 16}" cy="174" r="5" fill="#C8102E"/><circle cx="${x - 4}" cy="172" r="5" fill="#F2C200"/><circle cx="${x + 8}" cy="174" r="5" fill="#C8102E"/><circle cx="${x + 18}" cy="172" r="4" fill="#3E8E4A"/>`).join('')
      + `<path d="M124 236v-58a26 26 0 0 1 52 0v58z" fill="${d}"/><circle cx="166" cy="208" r="3.5" fill="#FFC23D"/><path d="M116 160h68l-8 14h-52z" fill="${p}"/><path d="M128 160l-4 14M142 160l-2 14M156 160l2 14M170 160l4 14" stroke="#fff" stroke-width="5"/>`,
    sides: () => plant(28) + plant(272, '#4E8E3A')
  },
  izakaya: {
    sign: (p) => `<path d="M124 30h52M128 38h44M134 30v28M166 30v28" stroke="${p}" stroke-width="6" stroke-linecap="round"/>`,
    front: (p, d) => [62, 190].map((x) => `<rect x="${x}" y="136" width="48" height="44" rx="8" fill="#FBF4F1" stroke="${d}" stroke-width="5"/><path d="M${x + 16} 136v44M${x + 32} 136v44M${x} 151h48M${x} 165h48" stroke="${d}" stroke-width="2"/>`).join('')
      + `<path d="M124 236v-62a26 26 0 0 1 52 0v62z" fill="#3B1A1F"/><path d="M122 162h56v32h-56z" fill="#1C2A4A"/><path d="M140.6 162v32M159.3 162v32" stroke="#FBF4F1" stroke-width="2"/><circle cx="150" cy="178" r="6" fill="#FBF4F1"/>`,
    sides: () => [24, 276].map((x) => `<path d="M${x} 150v8" stroke="#2A170D" stroke-width="2"/><ellipse cx="${x}" cy="174" rx="12" ry="16" fill="#E8452C"/><path d="M${x - 10} 168h20M${x - 10} 180h20" stroke="#B32D18" stroke-width="2"/><path d="M${x - 6} 158h12M${x - 6} 190h12" stroke="#2A170D" stroke-width="4" stroke-linecap="round"/><path d="M${x - 12} 236l4-14h16l4 14z" fill="#6B5444"/><circle cx="${x}" cy="216" r="9" fill="#4E8E3A"/>`).join('')
  },
  cevicheria: {
    sign: () => `<path d="M126 52c8-16 40-16 48 0" fill="none" stroke="#5AB4E5" stroke-width="5" stroke-linecap="round"/><circle cx="150" cy="32" r="9" fill="#FFC23D"/>`,
    front: (p, d) => [86, 214].map((x) => `<circle cx="${x}" cy="158" r="22" fill="#CDEFF0" stroke="#9AA7B1" stroke-width="8"/><circle cx="${x}" cy="134" r="2" fill="#6B7A86"/><circle cx="${x}" cy="182" r="2" fill="#6B7A86"/><circle cx="${x - 24}" cy="158" r="2" fill="#6B7A86"/><circle cx="${x + 24}" cy="158" r="2" fill="#6B7A86"/>`).join('')
      + door(d)
      + `<circle cx="150" cy="144" r="13" fill="none" stroke="#E8452C" stroke-width="7" stroke-dasharray="10.2 10.2"/><circle cx="150" cy="144" r="13" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="10.2 10.2" stroke-dashoffset="10.2"/>`
      + `<path d="M40 222c12-8 24 8 36 0s24 8 36 0 24 8 36 0 24 8 36 0 24 8 36 0 24 8 36 0v14H40z" fill="#5AB4E5"/>`,
    sides: () => `<path d="M14 236c2-14 10-22 20-24l2 24z" fill="#8E5A2C"/><path d="M18 214l16-2" stroke="#2A170D" stroke-width="2"/>${plant(272, '#4E8E3A')}`
  },
  asador: {
    pre: () => `<rect x="214" y="22" width="22" height="40" rx="3" fill="#C2683A"/><rect x="210" y="18" width="30" height="8" rx="3" fill="#8E4A26"/><g class="facade-smoke"><circle cx="228" cy="8" r="7" fill="#C9C2BA" opacity=".8"/><circle cx="240" cy="-2" r="9" fill="#DAD4CD" opacity=".7"/></g>`,
    sign: (p) => `<rect x="120" y="34" width="60" height="16" rx="5" fill="#fff"/><path d="M130 34v16M142 34v16M154 34v16M166 34v16" stroke="${p}" stroke-width="3"/><path d="M150 30c-8-6-2-14 2-18 0 6 8 8 4 18z" fill="#FFC23D"/>`,
    front: (p, d) => crossWin(86, d, '#DCEEFB') + crossWin(214, d, '#DCEEFB') + door(d)
      + `<path d="M60 236v-26M96 236v-26M60 214h36M60 226h36" stroke="#8E5A2C" stroke-width="5" stroke-linecap="round"/>`
      + `<rect x="196" y="208" width="44" height="10" rx="3" fill="#2A1C16"/><path d="M200 208v10M208 208v10M216 208v10M224 208v10M232 208v10" stroke="#8A7A6E" stroke-width="2"/><path d="M200 218l-4 18M236 218l4 18" stroke="#2A1C16" stroke-width="4"/><circle cx="210" cy="204" r="3" fill="#E8541C"/><circle cx="224" cy="203" r="3.5" fill="#F28C2C"/>`,
    sides: () => plant(26) + plant(276, '#4E8E3A')
  },
  coreana: {
    roof: () => `<path d="M14 104c40-6 50-70 136-84 86 14 96 78 136 84-20 4-40-2-50-8-14-40-50-60-86-62-36 2-72 22-86 62-10 6-30 12-50 8z" fill="#2E3A40"/><path d="M30 104c30-2 44-56 120-76 76 20 90 74 120 76" fill="none" stroke="#56656C" stroke-width="3" stroke-dasharray="6 5"/>`,
    sign: () => `<circle cx="150" cy="58" r="15" fill="#fff"/><path d="M138 58a12 12 0 0 1 24 0 6 6 0 0 1-12 0 6 6 0 0 0-12 0z" fill="#C8102E"/><path d="M138 58a6 6 0 0 0 12 0 6 6 0 0 1 12 0 12 12 0 0 1-24 0z" fill="#1C4E9C"/>`,
    front: (p, d) => [86, 214].map((x) => `<circle cx="${x}" cy="158" r="24" fill="#F1FAFB" stroke="${d}" stroke-width="5"/><path d="M${x - 16} 146h32M${x - 16} 158h32M${x - 16} 170h32M${x - 8} 136v44M${x + 8} 136v44" stroke="${d}" stroke-width="2"/>`).join('') + door(d),
    sides: () => `<path d="M30 150v8" stroke="#2A170D" stroke-width="2"/><rect x="20" y="158" width="20" height="26" rx="6" fill="#F4EFE2" stroke="#C8102E" stroke-width="3"/><path d="M270 150v8" stroke="#2A170D" stroke-width="2"/><rect x="260" y="158" width="20" height="26" rx="6" fill="#F4EFE2" stroke="#1C4E9C" stroke-width="3"/><ellipse cx="28" cy="226" rx="16" ry="10" fill="#7A5640"/><ellipse cx="28" cy="220" rx="12" ry="5" fill="#9C7458"/><ellipse cx="272" cy="226" rx="16" ry="10" fill="#7A5640"/><ellipse cx="272" cy="220" rx="12" ry="5" fill="#9C7458"/>`
  }
};

// Local leyenda: la estrella dorada (lo demás de la fachada queda igual).
const legend = (d, sx = 240) => `<g class="facade-star"><circle cx="${sx}" cy="58" r="17" fill="#FFC23D" stroke="${d}" stroke-width="3"/><path d="M${sx} 47l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="#fff"/></g>`;

export function storefrontSvg(theme, id = 'arepera', { stage = 1 } = {}) {
  if (stage === 0) return obraSvg(theme);
  const p = theme.primary, d = theme.deep;
  const f = FACADES[id] ?? FACADES.arepera;
  return `<svg viewBox="0 0 300 240" aria-hidden="true">
    <ellipse cx="150" cy="236" rx="140" ry="12" fill="${d}" opacity=".18"/>
    ${f.pre?.(p, d) ?? ''}
    <path d="M40 236V120a110 110 0 0 1 220 0v116z" fill="#FFF8EE"/>
    <path d="M228 236V44a110 110 0 0 1 32 76v116z" fill="${d}" opacity=".07"/>
    ${f.body?.(p, d) ?? ''}
    ${f.arch ? f.arch(p, d) : `<path d="M40 120a110 110 0 0 1 220 0" fill="none" stroke="${d}" stroke-width="10"/>`}
    ${f.roof?.(p, d) ?? ''}
    ${f.sign(p, d)}
    <path d="M50 110h200v14H50z" fill="${d}" opacity=".1"/>
    <path d="M50 98h200v10H50z" fill="${p}"/><path d="M50 98h200v3H50z" fill="#fff" opacity=".25"/>
    ${scallops(p)}
    ${f.front(p, d)}
    <path d="M74 158a14 14 0 0 1 8-10M202 158a14 14 0 0 1 8-10" stroke="#fff" stroke-width="3" opacity=".75" fill="none" stroke-linecap="round"/>
    ${id === 'cevicheria' || id === 'diner' ? '' : `<rect x="116" y="231" width="68" height="5" rx="2" fill="#C9B8A4"/>`}
    <path d="M24 236h252" stroke="${d}" stroke-width="3" opacity=".22" stroke-linecap="round"/>
    ${f.sides(p, d)}
    ${stage >= 3 ? legend(d, id === 'asador' ? 60 : 240) : ''}
  </svg>`;
}

// Local sin abrir: la casa en obra, con andamios, grúa, conos y el letrero.
export function obraSvg(theme) {
  const d = theme.deep;
  return `<svg viewBox="0 0 300 240" aria-hidden="true">
    <ellipse cx="150" cy="236" rx="140" ry="12" fill="${d}" opacity=".16"/>
    <path d="M40 236V120a110 110 0 0 1 220 0v116z" fill="#FFF8EE"/>
    <path d="M40 120a110 110 0 0 1 220 0" fill="none" stroke="${d}" stroke-width="10" stroke-dasharray="16 10"/>
    <g class="obra-scaffold">
      <path d="M30 236V70M270 236V70M30 120h240M30 176h240M30 70h240" stroke="#C99A3A" stroke-width="6"/>
      <path d="M30 120l60 56M90 120l-60 56M210 120l60 56M270 120l-60 56" stroke="#C99A3A" stroke-width="3"/>
      <rect x="26" y="114" width="248" height="8" fill="#8E5A2C"/><rect x="26" y="170" width="248" height="8" fill="#8E5A2C"/>
    </g>
    <g class="obra-crane"><path d="M232 70V8h50" stroke="#F2A900" stroke-width="6" fill="none"/><path d="M282 8v26" stroke="#2A170D" stroke-width="2"/><rect x="272" y="34" width="20" height="12" rx="2" fill="${theme.primary}"/></g>
    <rect x="104" y="40" width="92" height="30" rx="10" fill="#FFC23D" stroke="#2A170D" stroke-width="3"/>
    <text x="150" y="60" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="14" fill="#2A170D">PRÓXIMAMENTE</text>
    <path d="M120 236l10-32h10l10 32z" fill="#F28C2C"/><path d="M124 222h22" stroke="#fff" stroke-width="5"/>
    <path d="M160 236l10-32h10l10 32z" fill="#F28C2C"/><path d="M164 222h22" stroke="#fff" stroke-width="5"/>
    <path d="M44 214h70v12H44z" fill="#F2C200"/><path d="M52 214l-8 12M66 214l-8 12M80 214l-8 12M94 214l-8 12M108 214l-8 12" stroke="#2A170D" stroke-width="4"/>
  </svg>`;
}
