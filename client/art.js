// Ilustraciones vectoriales generadas en código: ingredientes, procesos,
// clientes, estaciones y fachadas. Sin imágenes externas.

import { INGREDIENTS } from './shared/index.js';
import { FOOD } from './foodart.js';

const hl = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".45"/>`;

const SHAPES = {
  round: (c, a) => `<circle cx="24" cy="26" r="16" fill="${c}"/><path d="M24 42a16 16 0 0 0 15-10a18 18 0 0 1-27 7a16 16 0 0 0 12 3z" fill="${a}" opacity=".55"/>${hl(18, 19, 5, 3.5)}<path d="M24 10c-2-3 2-5 4-4" stroke="#2E7D32" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  slab: (c, a) => `<path d="M7 20c2-7 12-11 22-9s14 7 12 14-11 13-21 12S5 27 7 20z" fill="${c}"/><path d="M12 24c6-3 12 1 18-3M14 31c5-2 10 1 16-2" stroke="#fff" stroke-width="2" opacity=".55" fill="none" stroke-linecap="round"/><path d="M41 25c-2 7-11 13-21 12" stroke="${a}" stroke-width="3" fill="none" opacity=".6"/>`,
  drum: (c, a) => `<path d="M30 28l9 9" stroke="#F5EBDD" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="38" r="3.4" fill="#F5EBDD"/><circle cx="37" cy="41" r="3.4" fill="#F5EBDD"/><ellipse cx="21" cy="21" rx="14" ry="12" transform="rotate(40 21 21)" fill="${c}"/><path d="M12 30a14 12 40 0 0 20-3" stroke="${a}" stroke-width="3" fill="none" opacity=".7"/>${hl(17, 16, 5, 3)}`,
  fish: (c, a) => `<path d="M6 24c6-10 22-12 30 0-8 12-24 10-30 0z" fill="${c}"/><path d="M35 24l9-8v16z" fill="${a}"/><circle cx="14" cy="22" r="2.2" fill="#24160E"/><path d="M20 18c2 4 2 8 0 12M26 18c2 4 2 8 0 12" stroke="${a}" stroke-width="1.6" fill="none" opacity=".7"/>`,
  curl: (c, a) => `<path d="M34 14a14 14 0 1 0 2 18" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M34 14a14 14 0 1 0 2 18" stroke="${a}" stroke-width="10" stroke-dasharray="2 5" fill="none" opacity=".5"/><path d="M36 32l7 3-3-7" fill="${a}"/>`,
  long: (c, a) => `<rect x="6" y="18" width="34" height="13" rx="6.5" transform="rotate(-25 24 24)" fill="${c}"/><path d="M38 12l5-4" stroke="${a}" stroke-width="4" stroke-linecap="round"/><path d="M13 30c6-2 12-5 20-10" stroke="#fff" stroke-width="2" opacity=".4" stroke-linecap="round"/>`,
  strip: (c, a) => `<path d="M6 30c6-8 10 4 16-4s10 4 20-6l2 8c-10 10-14-2-20 6s-10-4-16 4z" fill="${c}"/><path d="M8 32c6-7 10 3 15-4s10 3 19-5" stroke="${a}" stroke-width="2.5" fill="none"/>`,
  egg: (c, a) => `<ellipse cx="24" cy="26" rx="13" ry="16" fill="${c}" stroke="${a}" stroke-width="2"/>${hl(19, 18, 4, 5)}`,
  wedge: (c, a) => `<path d="M6 34L40 14v20z" fill="${c}"/><path d="M6 34h34v6H6z" fill="${a}"/><circle cx="28" cy="26" r="3" fill="${a}"/><circle cx="35" cy="30" r="2" fill="${a}"/><circle cx="20" cy="31" r="2" fill="${a}"/>`,
  bottle: (c, a) => `<path d="M19 6h10v8l5 7v19a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V21l5-7z" fill="${c}" stroke="${a}" stroke-width="2.5"/><rect x="14" y="26" width="20" height="9" fill="${a}"/><rect x="18" y="4" width="12" height="5" rx="2" fill="${a}"/>`,
  leaf: (c, a) => `<path d="M8 40C8 20 20 8 40 8c0 20-12 32-32 32z" fill="${c}"/><path d="M10 38L34 14M18 30l-2-8M24 24l8 0M26 22l-2-8" stroke="${a}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  drop: (c, a) => `<path d="M24 5c9 9 15 18 15 25a15 15 0 0 1-30 0c0-7 6-16 15-25z" fill="${a}"/><path d="M24 9c7 8 12 15 12 21a12 12 0 0 1-24 0c0-6 5-13 12-21z" fill="${c}"/><circle cx="24" cy="31" r="6" fill="#8D5A2B"/>`,
  block: (c, a) => `<rect x="9" y="12" width="30" height="26" rx="6" fill="${c}"/><rect x="9" y="30" width="30" height="8" rx="4" fill="${a}" opacity=".7"/><path d="M15 18h8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>`,
  grain: (c, a) => `<ellipse cx="24" cy="32" rx="17" ry="8" fill="${a}"/>${[[16,28],[24,26],[32,28],[20,22],[28,22],[24,17],[14,33],[34,33],[24,32]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="3" fill="${c}" stroke="${a}" stroke-width="1"/>`).join('')}`,
  cap: (c, a) => `<path d="M6 24a18 14 0 0 1 36 0z" fill="${c}"/><path d="M6 24h36" stroke="${a}" stroke-width="3"/><rect x="18" y="24" width="12" height="16" rx="5" fill="#F3EADB"/><circle cx="17" cy="16" r="2.5" fill="#fff" opacity=".6"/><circle cx="29" cy="13" r="2" fill="#fff" opacity=".6"/>`,
  sheet: (c, a) => `<rect x="8" y="8" width="32" height="32" rx="4" fill="${c}"/><path d="M8 16h32M8 24h32M8 32h32" stroke="${a}" stroke-width="1.6" opacity=".9"/><path d="M12 12l6 6" stroke="#4E7A5C" stroke-width="2" opacity=".6"/>`,
  noodle: (c, a) => `<path d="M10 14c5 4 0 8 5 12s0 8 5 12M18 12c5 4 0 8 5 12s0 8 5 12M26 12c5 4 0 8 5 12s0 8 5 12M34 14c5 4 0 8 5 12" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M10 14c5 4 0 8 5 12M26 12c5 4 0 8 5 12" stroke="${a}" stroke-width="1.5" fill="none" opacity=".6"/>`,
  mound: (c, a) => `<path d="M10 40c-2-10 2-24 8-28h12c6 4 10 18 8 28z" fill="${c}" stroke="${a}" stroke-width="2"/><path d="M17 12l-2-4h18l-2 4" fill="${a}"/><path d="M18 26c4-2 8-2 12 0" stroke="${a}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  bun: (c, a) => `<path d="M6 26a18 15 0 0 1 36 0z" fill="${c}"/><rect x="6" y="28" width="36" height="9" rx="4.5" fill="${a}"/><path d="M16 17l2-1M24 14l2 0M30 18l2 1M20 21l1 1" stroke="#FFF3D9" stroke-width="2.2" stroke-linecap="round"/>`,
  berry: (c, a) => `<path d="M24 42C12 34 8 24 12 18c3-4 8-4 12-2 4-2 9-2 12 2 4 6 0 16-12 24z" fill="${c}"/><path d="M14 14l6 3 4-6 4 6 6-3-3 6H17z" fill="${a}"/>${[[18,24],[26,22],[30,28],[22,31],[25,36],[17,29]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#FFE3A3"/>`).join('')}`,
  jar: (c, a) => `<rect x="11" y="15" width="26" height="26" rx="7" fill="${c}"/><rect x="13" y="8" width="22" height="8" rx="3" fill="${a}"/><path d="M15 22c4 3 14 3 18 0" stroke="#fff" stroke-width="2.5" opacity=".5" fill="none"/>${hl(17, 30, 2.5, 5)}`,
  disc: (c, a) => `<ellipse cx="24" cy="26" rx="19" ry="14" fill="${a}"/><ellipse cx="24" cy="24" rx="19" ry="14" fill="${c}"/>${[[16,20],[28,18],[32,27],[20,29],[25,24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${a}"/>`).join('')}`
};

export function ingredientSvg(id, { className = '', title } = {}) {
  const ing = INGREDIENTS[id];
  if (!ing) return '';
  const label = title ?? ing.name;
  const body = FOOD[id] ?? (SHAPES[ing.shape] ?? SHAPES.round)(ing.color, ing.accent);
  return `<svg class="${className}" viewBox="0 0 48 48" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${body}</svg>`;
}

const STROKE = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

export const PROCESS_ICONS = {
  crudo: `<path d="M12 3v10M8 9l4 4 4-4"/><path d="M3 17c2 3 5 4 9 4s7-1 9-4z"/>`,
  cortar: `<path d="M3 20.5L14.5 9c2-2 5-3 7-2-1 3-3 6-5 8L5 21.5c-.8.6-2.4.1-2-1z"/><path d="M14.5 9l2.5 2.5"/><path d="M7.5 17.5l1 1"/>`,
  batir: `<path d="M12 2.5v6"/><path d="M12 8.5c-3.5 0-5.5 4.5-5.5 8a5.5 5.5 0 0 0 11 0c0-3.5-2-8-5.5-8z"/><path d="M12 8.5c-1.6 0-2.6 4.5-2.6 8s1.2 5 2.6 5 2.6-1.5 2.6-5-1-8-2.6-8z"/><path d="M6.6 16.5h10.8"/>`,
  freir: `<circle cx="10" cy="13" r="7"/><path d="M17 13h6"/><path d="M8 4c0 1.5 1 2 1 3.5M12 3c0 1.5 1 2 1 3.5"/>`,
  hornear: `<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="6" y="10" width="12" height="7" rx="1"/><path d="M7 7h1M11 7h1"/>`,
  hervir: `<path d="M4 10h16v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 10h20"/><path d="M9 3c0 2 1 3 1 5M14 3c0 2 1 3 1 5"/>`
};

export function processSvg(proc, cls = 'proc') {
  return `<svg class="${cls}" viewBox="0 0 24 24" ${STROKE} aria-hidden="true">${PROCESS_ICONS[proc] ?? ''}</svg>`;
}

export const ICONS = {
  home: `<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>`,
  book: `<path d="M4 4h11a4 4 0 0 1 4 4v13H8a4 4 0 0 1-4-4z"/><path d="M8 9h7M8 13h5"/>`,
  tools: `<path d="M7 15.5c-2.8-.3-4.5-2.5-4-5 .5-2.4 3-3.8 5.2-3.1C9 5 10.4 4 12 4s3 1 3.8 3.4c2.2-.7 4.7.7 5.2 3.1.5 2.5-1.2 4.7-4 5V20H7z"/><path d="M7 17.5h10"/><path d="M12 8.5v3M10.5 10h3"/>`,
  trophy: `<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6"/>`,
  pause: `<path d="M8 5v14M16 5v14"/>`,
  play: `<path d="M7 4.5v15l12-7.5z"/>`,
  lock: `<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`,
  check: `<path d="M5 12l4 4 10-10"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18"/>`,
  clock: `<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>`,
  flag: `<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>`,
  store: `<path d="M3 9l2-5h14l2 5M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>`,
  user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>`,
  sound: `<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>`,
  vibrate: `<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4 8v8M20 8v8"/>`,
  table: `<path d="M3 9h18M5 9v10M19 9v10M8 9l1-4h6l1 4"/>`,
  fan: `<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 2-7 5-6s1 5-3 7M14 12c4 0 7 2 6 5s-5 1-7-3M12 14c0 4-2 7-5 6s-1-5 3-7M10 12c-4 0-7-2-6-5s5-1 7 3"/>`,
  music: `<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>`,
  sparkle: `<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>`,
  arrow: `<path d="M5 12h14M13 6l6 6-6 6"/>`,
  back: `<path d="M15 5l-7 7 7 7"/>`,
  refresh: `<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 5v6h-6"/>`,
  market: `<path d="M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3L19 4H5z"/><path d="M5 13v8h14v-8M10 21v-5h4v5"/>`,
  journal: `<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>`,
  fire: `<path d="M12 22c4 0 7-3 7-7 0-5-5-7-4-12-3 1-6 5-6 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z" fill="currentColor" stroke="none"/><path d="M12 22c-2 0-3-1.5-3-3.5S11 15 11 13c2 1 4 3 4 5.5S14 22 12 22z" fill="#FFE066" stroke="none"/>`,
  basket: `<path d="M4 10h16l-2 10H6z"/><path d="M8 10l3-6M16 10l-3-6M9 14v3M12 14v3M15 14v3"/>`,
  crown: `<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>`,
  up: `<path d="M12 19V5M6 11l6-6 6 6"/>`,
  down: `<path d="M12 5v14M6 13l6 6 6-6"/>`,
  chart: `<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`,
  minus: `<path d="M6 12h12"/>`,
  hand: `<path d="M9 11V5a1.5 1.5 0 0 1 3 0v5M12 10V4a1.5 1.5 0 0 1 3 0v6M15 10V6a1.5 1.5 0 0 1 3 0v7c0 4-3 8-7 8-3 0-5-2-6-4l-2-4a1.5 1.5 0 0 1 2.5-1.5L9 13"/>`,
  plus: `<path d="M12 6v12M6 12h12"/>`
};

export function icon(name, extra = '') {
  return `<svg viewBox="0 0 24 24" ${STROKE} aria-hidden="true" ${extra}>${ICONS[name] ?? ''}</svg>`;
}

export const UPGRADE_ICONS = {
  // Par de cuchillos cruzados
  cuchillos: `<path d="M4 20.5L13 8.5c1.5-2 4-3.5 6-3-.5 2.6-2.3 5-4.3 6.5L5.5 21.5c-.7.5-2-.2-1.5-1z"/><path d="M20 20.5L11 8.5C9.5 6.5 7 5 5 5.5c.5 2.6 2.3 5 4.3 6.5l9.2 9.5c.7.5 2-.2 1.5-1z"/>`,
  // Batidora de mano eléctrica con sus dos varillas
  batidora: `<path d="M5 9.5c0-2.5 2-4.5 4.5-4.5H18a2 2 0 0 1 0 4h-3.5l-2 3H8a3 3 0 0 1-3-2.5z"/><path d="M9.5 12v3.5M12.5 12v3.5"/><path d="M8 15.5c0 2.5.7 5 1.5 5s1.5-2.5 1.5-5M11 15.5c0 2.5.7 5 1.5 5s1.5-2.5 1.5-5"/><path d="M15.5 7h1"/>`,
  // Tabla de picar con asa y cuchillo
  extra_tabla: `<rect x="3" y="7" width="15" height="13" rx="3"/><circle cx="14.5" cy="10.5" r="1.3"/><path d="M18 7.5l3-3"/><path d="M14 16l7-7"/><path d="M6 17h5"/>`, sarten: PROCESS_ICONS.freir,
  horno: PROCESS_ICONS.hornear, olla: PROCESS_ICONS.hervir, campana: ICONS.fan, ambiente: ICONS.music,
  extra_bol: PROCESS_ICONS.batir, extra_sarten: PROCESS_ICONS.freir,
  extra_olla: PROCESS_ICONS.hervir, extra_horno: PROCESS_ICONS.hornear,
  refri: `<rect x="5" y="2" width="14" height="20" rx="4"/><path d="M5 10h14M9 5v2M9 13v3"/>`
};

export function coinSvg(cls = 'coin') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#FFC23D"/><circle cx="12" cy="12" r="10" fill="none" stroke="#B7791F" stroke-width="2"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#E0A21C" stroke-width="1.5"/><path d="M10 9.5c0-1 4-1.5 4 .5s-4 1-4 3 4 1.5 4 .5M12 7.5v9" stroke="#8A5A10" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
}

export function starSvg(cls = 'star') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#FFC23D" stroke="#B7791F" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 5.5l1.6 3.4" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/></svg>`;
}

// Clientes: ver people.js
export { customerSvg } from './people.js';

// Herramientas animadas que aparecen al trabajar en una estación.
export const TOOL_ART = {
  tabla: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 30L24 12c3-3 8-5 11-4-1 4-4 9-7 12L10 34c-1.5 1-4.5-.5-4-4z" fill="#E8EEF3" stroke="#3B2416" stroke-width="1.6" stroke-linejoin="round"/><path d="M24 12l4 4" stroke="#3B2416" stroke-width="1.6"/><path d="M10 34l-5 5" stroke="#5C3317" stroke-width="5" stroke-linecap="round"/><path d="M12 22l6-6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></svg>`,
  bol: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2v13" stroke="#8C6A4A" stroke-width="4" stroke-linecap="round"/><path d="M20 15c-6 0-9 8-9 13a9 9 0 0 0 18 0c0-5-3-13-9-13z" fill="none" stroke="#9AA6B2" stroke-width="2"/><path d="M20 15c-3 0-4 8-4 13s2 8 4 8 4-3 4-8-1-13-4-13z" fill="none" stroke="#9AA6B2" stroke-width="2"/><path d="M11.5 27h17" stroke="#9AA6B2" stroke-width="2"/></svg>`
};

// Estaciones vistas desde arriba: van dentro de un fogón redondo.
export const STATION_ART = {
  tabla: `<svg class="base" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#C98B52"/><circle cx="24" cy="24" r="17" fill="#DDA86E"/><path d="M12 20c6-3 18-3 24 0M11 28c7-3 19-3 26 0" stroke="#C98B52" stroke-width="1.6" fill="none" opacity=".7"/><circle cx="38" cy="14" r="2.4" fill="#8E5A2C"/></svg>`,
  bol: `<svg class="base" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#7FB2E0"/><circle cx="24" cy="24" r="16" fill="#C9E0F3"/><path d="M14 18a12 12 0 0 1 10-6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/></svg>`,
  sarten: `<svg class="base" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#2E2019"/><circle cx="24" cy="24" r="17" fill="#4A372A"/><circle cx="24" cy="24" r="12" fill="none" stroke="#5C4636" stroke-width="1.5"/><path d="M14 16a14 14 0 0 1 8-5" stroke="#7A604C" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>`,
  horno: `<svg class="base" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#5A4536"/><circle cx="24" cy="24" r="16" fill="#2A1A10"/><circle cx="24" cy="24" r="16" fill="#FF8A3D" opacity="var(--glow, .25)"/><path d="M12 24h24M14 18h20M14 30h20" stroke="#6E5442" stroke-width="1.5"/></svg>`,
  olla: `<svg class="base" viewBox="0 0 48 48" aria-hidden="true"><rect x="0" y="21" width="8" height="6" rx="3" fill="#6A7A88"/><rect x="40" y="21" width="8" height="6" rx="3" fill="#6A7A88"/><circle cx="24" cy="24" r="19" fill="#8A9AA8"/><circle cx="24" cy="24" r="15" fill="#5E8FC0"/><circle cx="20" cy="20" r="3" fill="#A9D2F5" opacity=".8"/><circle cx="29" cy="27" r="2" fill="#A9D2F5" opacity=".8"/></svg>`
};

export function plateSvgItems(recipe, filled = null) {
  return recipe.components.map((c, i) =>
    filled && !filled[i] ? '' : ingredientSvg(c.ingredient, { title: '' })
  ).join('');
}

// Fachada con arco para las tarjetas de restaurante. Cada cocina tiene un detalle propio.
const SIGNS = [
  (p) => `<circle cx="150" cy="40" r="16" fill="#FFC23D"/><path d="M150 18v-8M150 70v-8M128 40h-8M180 40h-8" stroke="#FFC23D" stroke-width="4" stroke-linecap="round"/>`,
  (p) => `<rect x="118" y="26" width="64" height="26" rx="13" fill="#fff"/><text x="150" y="45" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="16" fill="${p}">66</text>`,
  (p) => `<path d="M134 52h32l-4-26h-24z" fill="#fff"/><circle cx="150" cy="22" r="6" fill="${p}"/>`,
  (p) => `<ellipse cx="128" cy="40" rx="11" ry="15" fill="#E8452C"/><ellipse cx="172" cy="40" rx="11" ry="15" fill="#E8452C"/><path d="M128 25v-6M172 25v-6M128 55v5M172 55v5" stroke="#2A170D" stroke-width="3"/>`,
  (p) => `<path d="M126 48c8-16 40-16 48 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="150" cy="30" r="9" fill="#fff"/>`
];

export function storefrontSvg(theme, idx = 0) {
  const p = theme.primary, d = theme.deep;
  const scallops = Array.from({ length: 9 }, (_, i) => `<circle cx="${62 + i * 22}" cy="98" r="11" fill="${i % 2 ? '#fff' : p}"/>`).join('');
  return `<svg viewBox="0 0 300 240" aria-hidden="true">
    <ellipse cx="150" cy="236" rx="140" ry="14" fill="${d}" opacity=".18"/>
    <path d="M40 236V120a110 110 0 0 1 220 0v116z" fill="#FFF8EE"/>
    <path d="M40 120a110 110 0 0 1 220 0" fill="none" stroke="${d}" stroke-width="10"/>
    ${(SIGNS[idx] ?? SIGNS[0])(p)}
    <path d="M50 98h200v10H50z" fill="${p}"/>
    ${scallops}
    <circle cx="86" cy="156" r="24" fill="${p}" opacity=".16"/><circle cx="86" cy="156" r="24" fill="none" stroke="${d}" stroke-width="5"/>
    <path d="M86 132v48M62 156h48" stroke="${d}" stroke-width="3"/>
    <circle cx="214" cy="156" r="24" fill="${p}" opacity=".16"/><circle cx="214" cy="156" r="24" fill="none" stroke="${d}" stroke-width="5"/>
    <path d="M214 132v48M190 156h48" stroke="${d}" stroke-width="3"/>
    <path d="M124 236v-62a26 26 0 0 1 52 0v62z" fill="${d}"/>
    <circle cx="166" cy="206" r="3.5" fill="#FFC23D"/>
    <circle cx="28" cy="214" r="18" fill="#5E9E4A"/><circle cx="18" cy="200" r="12" fill="#77B85E"/><path d="M16 236l4-20h16l4 20z" fill="#C2703A"/>
    <circle cx="272" cy="214" r="18" fill="#4E8E3A"/><circle cx="284" cy="200" r="11" fill="#6AAA52"/><path d="M260 236l4-20h16l4 20z" fill="#C2703A"/>
  </svg>`;
}

export function panLogoSvg(cls = 'boot__pan') {
  return `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true">
    <rect x="80" y="54" width="40" height="12" rx="6" fill="#3B2A20"/>
    <circle cx="52" cy="60" r="46" fill="#3B2A20"/><circle cx="52" cy="58" r="38" fill="#54402F"/>
    <path d="M30 50c4-14 30-18 40-6s4 30-14 30-30-10-26-24z" fill="#fff"/>
    <circle cx="50" cy="56" r="12" fill="#FFB21E"/><circle cx="46" cy="52" r="3" fill="#fff" opacity=".7"/>
  </svg>`;
}
