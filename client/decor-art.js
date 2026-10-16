// Dibujos de la decoración del local: los usa la cocina y la vista previa de «Mi local».

import { decorOf, DECOR_BY_ID } from './shared/index.js';

const BULBS = ['#FFE08A', '#F28C8C', '#9FD3F0'];

export function lightsHtml(id) {
  if (id === 'luces_guirnalda') {
    return `<div class="garland" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<i style="--c:${BULBS[i % 3]};--d:${(i % 4) * 0.25}s"></i>`).join('')}</div>`;
  }
  if (id === 'luces_neon') return `<div class="neon-sign" aria-hidden="true">¡A Fuego!</div>`;
  if (id === 'luces_faroles') {
    return `<div class="lanterns" aria-hidden="true">${['#E2394B', '#F2C200', '#E2394B', '#F2C200'].map((c, i) => `<span style="--c:${c};--d:${i * 0.4}s"><i></i><b></b></span>`).join('')}</div>`;
  }
  if (id === 'luces_velas') return `<div class="candles" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<span style="--d:${i * 0.23}s"><i></i></span>`).join('')}</div>`;
  if (id === 'luces_disco') return `<div class="disco" aria-hidden="true"><i></i><b></b><b></b><b></b></div>`;
  return `<div class="lamps" aria-hidden="true"><span class="lamp"><i></i><b></b></span><span class="lamp"><i></i><b></b></span><span class="lamp"><i></i><b></b></span></div>`;
}

const K = 'stroke="#3B2416" stroke-width="1.6" stroke-linejoin="round"';
const ART = {
  deco_reloj: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#FFF8EE" ${K}/><circle cx="20" cy="20" r="13.5" fill="none" stroke="#E3C8A6" stroke-width="1.5"/>${[0, 90, 180, 270].map((a) => `<rect x="19" y="5" width="2" height="4" fill="#3B2416" transform="rotate(${a} 20 20)"/>`).join('')}<g class="clock-h"><rect x="19" y="11" width="2.2" height="10" rx="1" fill="#3B2416"/></g><g class="clock-m"><rect x="19.3" y="7" width="1.4" height="14" rx=".7" fill="#C8102E"/></g><circle cx="20" cy="20" r="2" fill="#3B2416"/></svg>`,
  deco_gato: `<svg viewBox="0 0 44 50"><ellipse cx="22" cy="47" rx="15" ry="2.5" fill="#3B2416" opacity=".15"/><path d="M8 46c-2-12 2-22 14-22s16 10 14 22z" fill="#fff" ${K}/><path d="M10 14l3-9 6 6M34 14l-3-9-6 6" fill="#fff" ${K}/><ellipse cx="22" cy="18" rx="13" ry="11" fill="#fff" ${K}/><path d="M13 9l2-3 2 3M27 9l2-3 2 3" fill="#F28C8C"/><path d="M16 17c1-1.5 3-1.5 4 0M24 17c1-1.5 3-1.5 4 0" stroke="#3B2416" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M20 22c1 1 3 1 4 0" stroke="#3B2416" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="14" cy="21" rx="2" ry="1.2" fill="#F28C8C" opacity=".7"/><ellipse cx="30" cy="21" rx="2" ry="1.2" fill="#F28C8C" opacity=".7"/><path d="M10 28c4 3 20 3 24 0" stroke="#C8102E" stroke-width="3" fill="none"/><circle cx="22" cy="31.5" r="2.6" fill="#F2C200" ${K}/><ellipse cx="22" cy="40" rx="6" ry="4" fill="#F2C200" ${K}/><g class="cat-paw"><path d="M33 30c4-2 6-8 4-12-2-3-6-2-6 2l1 9" fill="#fff" ${K}/></g></svg>`,
  deco_pecera: `<svg viewBox="0 0 48 44"><ellipse cx="24" cy="42" rx="15" ry="2.4" fill="#3B2416" opacity=".15"/><path d="M12 8h24c8 6 9 20 2 28-4 4-24 4-28 0-7-8-6-22 2-28z" fill="rgba(180,225,245,.55)" ${K}/><path d="M9 18c10 3 20-3 30 0v12c-4 8-26 8-30 0z" fill="#5AB4E5" opacity=".75"/><path d="M14 36h20" stroke="#C2A27A" stroke-width="3" stroke-linecap="round"/><g class="fish"><path d="M18 25c3-4 9-4 11 0-2 4-8 4-11 0z" fill="#F28C3D" ${K}/><path d="M18 25l-4-3v6z" fill="#F28C3D" ${K}/><circle cx="26" cy="24.3" r=".9" fill="#3B2416"/></g><circle class="bub" cx="31" cy="17" r="1.5" fill="#fff"/><circle class="bub bub2" cx="28" cy="21" r="1" fill="#fff"/></svg>`,
  deco_ventilador: `<svg viewBox="0 0 70 30"><rect x="33.5" y="0" width="3" height="10" fill="#6B5444"/><g class="fan-blades"><ellipse cx="35" cy="14" rx="30" ry="4" fill="#C98B52" ${K}/><ellipse cx="35" cy="14" rx="4" ry="30" fill="#C98B52" ${K} transform="scale(1 .14) translate(0 86)"/></g><ellipse cx="35" cy="13" rx="7" ry="5" fill="#8E5A2C" ${K}/><circle cx="35" cy="19" r="4" fill="#FFF1B8" ${K}/></svg>`,
  deco_rocola: `<svg viewBox="0 0 40 56"><ellipse cx="20" cy="54" rx="16" ry="2.4" fill="#3B2416" opacity=".15"/><path d="M4 54V22C4 10 11 3 20 3s16 7 16 19v32z" fill="#8E2433" ${K}/><path d="M9 26c0-9 5-15 11-15s11 6 11 15z" fill="#FFF1B8" ${K}/><g class="juke-lights"><path d="M9 26c0-9 5-15 11-15s11 6 11 15" fill="none" stroke="#F2C200" stroke-width="2.4"/></g><rect x="9" y="30" width="22" height="9" rx="2" fill="#2A170D"/><path d="M12 34h16" stroke="#7FE0B0" stroke-width="2" stroke-dasharray="2 2"/><rect x="9" y="42" width="22" height="9" rx="2" fill="#C98B52" ${K}/></svg><span class="notes"><i>♪</i><i>♫</i></span>`,
  deco_pinata: `<svg viewBox="0 0 44 60"><path d="M22 0v16" stroke="#6B5444" stroke-width="1.5"/><path d="M22 16l5 9 10 1-7 7 2 10-10-5-10 5 2-10-7-7 10-1z" fill="#E2577B" ${K}/><circle cx="22" cy="31" r="6" fill="#F2C200" ${K}/><path d="M12 44l-3 10M17 46l-1 10M27 46l1 10M32 44l3 10" stroke="#0F7C8A" stroke-width="2.4" stroke-linecap="round"/><path d="M14 45l-1 9M30 45l1 9" stroke="#F2C200" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  deco_guacamaya: `<svg viewBox="0 0 44 64"><path d="M22 0v12" stroke="#6B5444" stroke-width="1.5"/><path d="M8 12h28" stroke="#8E5A2C" stroke-width="3" stroke-linecap="round"/><g class="parrot"><path d="M18 12c-4 6-5 16-2 24 2 6 4 14 2 24l4-6 2 6c2-10 0-18 2-24 2-8 1-18-4-24z" fill="#1C4E9C" ${K}/><path d="M17 16c-3 6-3 14 0 20 3-2 6-10 5-20z" fill="#F2C200" ${K}/><ellipse cx="23" cy="12" rx="7" ry="7" fill="#D9412B" ${K} transform="translate(0 -3)"/><path d="M28 8c4 0 5 4 3 6-1-1-2-2-4-2z" fill="#2A170D" ${K}/><circle cx="24" cy="7" r="2" fill="#fff" ${K}/><circle cx="24.4" cy="7" r=".9" fill="#2A170D"/></g></svg>`
};

export function decoHtml(list) {
  const out = [];
  for (const id of ['deco_ventilador', 'deco_reloj', 'deco_guacamaya', 'deco_pinata']) if (list.includes(id)) out.push(`<div class="deco deco--${id.slice(5)}" aria-hidden="true">${ART[id]}</div>`);
  if (list.includes('deco_mariposas')) out.push(`<div class="deco deco--mariposas" aria-hidden="true">${['#E2577B', '#F2C200', '#5AB4E5'].map((c, i) => `<i style="--c:${c};--d:${i * -2.3}s;--y:${18 + i * 16}px"><b></b><b></b></i>`).join('')}</div>`);
  if (list.includes('deco_banderines')) out.push(`<div class="deco deco--flags" aria-hidden="true">${['#F2C200', '#1C4E9C', '#C8102E'].concat(['#F2C200', '#1C4E9C', '#C8102E', '#F2C200', '#1C4E9C', '#C8102E']).map((c) => `<i style="--c:${c}"></i>`).join('')}</div>`);
  if (list.includes('deco_cuadro')) out.push(`<div class="deco deco--frame" aria-hidden="true"><i></i></div>`);
  for (const id of ['deco_gato', 'deco_pecera', 'deco_rocola']) if (list.includes(id)) out.push(`<div class="deco deco--${id.slice(5)}" aria-hidden="true">${ART[id]}</div>`);
  if (list.includes('deco_plantas')) out.push(`<div class="deco deco--plants" aria-hidden="true"><i></i><b></b></div>${list.includes('deco_rocola') ? '' : '<div class="deco deco--plants deco--plants-r" aria-hidden="true"><i></i><b></b></div>'}`);
  return out.join('');
}

// Atributos para el contenedor: toldo, pared y barra elegidos (los estilos están en styles.css).
export function decorAttrs(equipped) {
  return `data-awning="${equipped.toldo}" data-wall="${equipped.pared}" data-counter="${equipped.barra}"`;
}

// Colores del toldo elegido (si es «Del local», los del restaurante).
export function awningStyle(id) {
  const c = DECOR_BY_ID[id]?.colors;
  return c ? `--aw-a:${c[0]};--aw-b:${c[1]};--aw-deep:${c[2]}` : '';
}

export function equippedOf(state) {
  return decorOf(state ?? {}).equipped;
}
