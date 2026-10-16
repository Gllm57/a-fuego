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
  return `<div class="lamps" aria-hidden="true"><span class="lamp"><i></i><b></b></span><span class="lamp"><i></i><b></b></span><span class="lamp"><i></i><b></b></span></div>`;
}

const K = 'stroke="#3B2416" stroke-width="1.6" stroke-linejoin="round"';
const ART = {
  deco_reloj: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#FFF8EE" ${K}/><circle cx="20" cy="20" r="13.5" fill="none" stroke="#E3C8A6" stroke-width="1.5"/>${[0, 90, 180, 270].map((a) => `<rect x="19" y="5" width="2" height="4" fill="#3B2416" transform="rotate(${a} 20 20)"/>`).join('')}<g class="clock-h"><rect x="19" y="11" width="2.2" height="10" rx="1" fill="#3B2416"/></g><g class="clock-m"><rect x="19.3" y="7" width="1.4" height="14" rx=".7" fill="#C8102E"/></g><circle cx="20" cy="20" r="2" fill="#3B2416"/></svg>`,
  deco_gato: `<svg viewBox="0 0 44 50"><ellipse cx="22" cy="47" rx="15" ry="2.5" fill="#3B2416" opacity=".15"/><path d="M8 46c-2-12 2-22 14-22s16 10 14 22z" fill="#fff" ${K}/><path d="M10 14l3-9 6 6M34 14l-3-9-6 6" fill="#fff" ${K}/><ellipse cx="22" cy="18" rx="13" ry="11" fill="#fff" ${K}/><path d="M13 9l2-3 2 3M27 9l2-3 2 3" fill="#F28C8C"/><path d="M16 17c1-1.5 3-1.5 4 0M24 17c1-1.5 3-1.5 4 0" stroke="#3B2416" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M20 22c1 1 3 1 4 0" stroke="#3B2416" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="14" cy="21" rx="2" ry="1.2" fill="#F28C8C" opacity=".7"/><ellipse cx="30" cy="21" rx="2" ry="1.2" fill="#F28C8C" opacity=".7"/><path d="M10 28c4 3 20 3 24 0" stroke="#C8102E" stroke-width="3" fill="none"/><circle cx="22" cy="31.5" r="2.6" fill="#F2C200" ${K}/><ellipse cx="22" cy="40" rx="6" ry="4" fill="#F2C200" ${K}/><g class="cat-paw"><path d="M33 30c4-2 6-8 4-12-2-3-6-2-6 2l1 9" fill="#fff" ${K}/></g></svg>`,
  deco_pecera: `<svg viewBox="0 0 48 44"><ellipse cx="24" cy="42" rx="15" ry="2.4" fill="#3B2416" opacity=".15"/><path d="M12 8h24c8 6 9 20 2 28-4 4-24 4-28 0-7-8-6-22 2-28z" fill="rgba(180,225,245,.55)" ${K}/><path d="M9 18c10 3 20-3 30 0v12c-4 8-26 8-30 0z" fill="#5AB4E5" opacity=".75"/><path d="M14 36h20" stroke="#C2A27A" stroke-width="3" stroke-linecap="round"/><g class="fish"><path d="M18 25c3-4 9-4 11 0-2 4-8 4-11 0z" fill="#F28C3D" ${K}/><path d="M18 25l-4-3v6z" fill="#F28C3D" ${K}/><circle cx="26" cy="24.3" r=".9" fill="#3B2416"/></g><circle class="bub" cx="31" cy="17" r="1.5" fill="#fff"/><circle class="bub bub2" cx="28" cy="21" r="1" fill="#fff"/></svg>`,
  deco_rocola: `<svg viewBox="0 0 40 56"><ellipse cx="20" cy="54" rx="16" ry="2.4" fill="#3B2416" opacity=".15"/><path d="M4 54V22C4 10 11 3 20 3s16 7 16 19v32z" fill="#8E2433" ${K}/><path d="M9 26c0-9 5-15 11-15s11 6 11 15z" fill="#FFF1B8" ${K}/><g class="juke-lights"><path d="M9 26c0-9 5-15 11-15s11 6 11 15" fill="none" stroke="#F2C200" stroke-width="2.4"/></g><rect x="9" y="30" width="22" height="9" rx="2" fill="#2A170D"/><path d="M12 34h16" stroke="#7FE0B0" stroke-width="2" stroke-dasharray="2 2"/><rect x="9" y="42" width="22" height="9" rx="2" fill="#C98B52" ${K}/></svg><span class="notes"><i>♪</i><i>♫</i></span>`,
  deco_pinata: `<svg viewBox="0 0 44 60"><path d="M22 0v16" stroke="#6B5444" stroke-width="1.5"/><path d="M22 16l5 9 10 1-7 7 2 10-10-5-10 5 2-10-7-7 10-1z" fill="#E2577B" ${K}/><circle cx="22" cy="31" r="6" fill="#F2C200" ${K}/><path d="M12 44l-3 10M17 46l-1 10M27 46l1 10M32 44l3 10" stroke="#0F7C8A" stroke-width="2.4" stroke-linecap="round"/><path d="M14 45l-1 9M30 45l1 9" stroke="#F2C200" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  deco_guacamaya: `<svg viewBox="0 0 48 72"><g class="parrot"><path d="M13 0v31M35 0v31" stroke="#8E5A2C" stroke-width="1.4"/><path d="M21 26l-5 44 7-8 5 9 2-45z" fill="#D9412B" ${K}/><path d="M22 38l-3 26 4-5z" fill="#1C4E9C"/><path d="M27 38l1 27-3-6z" fill="#1C4E9C"/><rect x="9" y="29" width="30" height="4" rx="2" fill="#C98B52" ${K}/><ellipse cx="24" cy="20" rx="8.5" ry="11.5" fill="#D9412B" ${K}/><path d="M19 13c-5 6-5 15 1 21 5-5 6-13 4-21z" fill="#1C4E9C" ${K}/><path d="M19.4 13c-2.6 3.4-3.4 7-2.8 10 3 .6 6-1.4 7.2-4.6-.2-2-.6-3.8-1-5.4z" fill="#F2C200"/><path d="M17 22.6c2.4.6 5.6-.6 7-3.4" stroke="#3E8E4A" stroke-width="2" fill="none"/><circle cx="26" cy="8.5" r="7" fill="#D9412B" ${K}/><ellipse cx="28.6" cy="8.6" rx="3.4" ry="3.8" fill="#FFF8EE"/><circle cx="28.8" cy="8" r="1.5" fill="#2A170D"/><circle cx="29.3" cy="7.5" r=".5" fill="#fff"/><path d="M31.5 5.5c4.5-.5 6.5 4 4 9-.6-2.6-2-3.8-4-3.8z" fill="#F5EFE6" ${K}/><path d="M31.6 10.8c1.6 0 2.6.8 2.6 2.4-1.6.4-2.6-.4-2.6-2.4z" fill="#2A170D"/><path d="M20 31.5c0-2 2-2 2 0M25 31.5c0-2 2-2 2 0" stroke="#6B5444" stroke-width="1.6" fill="none" stroke-linecap="round"/></g></svg>`,
  deco_plantas: `<svg viewBox="0 0 44 56"><ellipse cx="22" cy="54.5" rx="13" ry="2" fill="#3B2416" opacity=".15"/><g class="plant-leaves"><path d="M0 0C-6-8-6-18 0-25C6-18 6-8 0 0z" transform="translate(22 34) rotate(-58) scale(0.85)" fill="#4FA35B" ${K}/><path d="M0 0V-21" transform="translate(22 34) rotate(-58) scale(0.85)" stroke="#2F6E3A" stroke-width="1" fill="none"/><path d="M0 0C-6-8-6-18 0-25C6-18 6-8 0 0z" transform="translate(22 34) rotate(58) scale(0.85)" fill="#4FA35B" ${K}/><path d="M0 0V-21" transform="translate(22 34) rotate(58) scale(0.85)" stroke="#2F6E3A" stroke-width="1" fill="none"/><path d="M0 0C-6-8-6-18 0-25C6-18 6-8 0 0z" transform="translate(22 34) rotate(-30) scale(1.02)" fill="#3E8E4A" ${K}/><path d="M0 0V-21" transform="translate(22 34) rotate(-30) scale(1.02)" stroke="#2F6E3A" stroke-width="1" fill="none"/><path d="M0 0C-6-8-6-18 0-25C6-18 6-8 0 0z" transform="translate(22 34) rotate(30) scale(1.02)" fill="#3E8E4A" ${K}/><path d="M0 0V-21" transform="translate(22 34) rotate(30) scale(1.02)" stroke="#2F6E3A" stroke-width="1" fill="none"/><path d="M0 0C-6-8-6-18 0-25C6-18 6-8 0 0z" transform="translate(22 34) rotate(0) scale(1.15)" fill="#5DB560" ${K}/><path d="M0 0V-21" transform="translate(22 34) rotate(0) scale(1.15)" stroke="#2F6E3A" stroke-width="1" fill="none"/></g><path d="M11 37h22l-3 17H14z" fill="#C2683A" ${K}/><rect x="8.5" y="32.5" width="27" height="6" rx="2" fill="#D9824E" ${K}/><path d="M14 46h16" stroke="#E8A06A" stroke-width="2" stroke-linecap="round"/></svg>`,
  plantas_r: `<svg viewBox="0 0 44 56"><ellipse cx="22" cy="54.5" rx="13" ry="2" fill="#3B2416" opacity=".15"/><g class="plant-leaves"><path d="M14 30h-3a3 3 0 0 1-3-3v-7a2.6 2.6 0 0 1 5.2 0v5H17" fill="#4FA35B" ${K}/><path d="M30 26h3a3 3 0 0 0 3-3v-9a2.6 2.6 0 0 0-5.2 0v7H27" fill="#4FA35B" ${K}/><rect x="16" y="9" width="12" height="27" rx="6" fill="#5DB560" ${K}/><path d="M22 13v20M19 15v16M25 15v16" stroke="#3E8E4A" stroke-width="1"/><g fill="#E2577B" ${K}><circle cx="19.5" cy="8" r="2.6"/><circle cx="24.5" cy="8" r="2.6"/><circle cx="22" cy="5" r="2.6"/></g><circle cx="22" cy="7.3" r="1.6" fill="#F2C200"/></g><path d="M11 37h22l-3 17H14z" fill="#1C4E9C" ${K}/><rect x="8.5" y="32.5" width="27" height="6" rx="2" fill="#F5EFE6" ${K}/><g fill="#F5EFE6"><circle cx="16" cy="44" r="1.6"/><circle cx="22" cy="47" r="1.6"/><circle cx="28" cy="44" r="1.6"/><circle cx="19" cy="51" r="1.2"/><circle cx="25" cy="51" r="1.2"/></g></svg>`
};

export function decoHtml(list) {
  const out = [];
  for (const id of ['deco_reloj', 'deco_guacamaya', 'deco_pinata']) if (list.includes(id)) out.push(`<div class="deco deco--${id.slice(5)}" aria-hidden="true">${ART[id]}</div>`);
  if (list.includes('deco_mariposas')) out.push(`<div class="deco deco--mariposas" aria-hidden="true">${['#E2577B', '#F2C200', '#5AB4E5'].map((c, i) => `<i style="--c:${c};--d:${i * -2.3}s;--y:${18 + i * 16}px"><b></b><b></b></i>`).join('')}</div>`);
  if (list.includes('deco_banderines')) out.push(`<div class="deco deco--flags" aria-hidden="true">${['#F2C200', '#1C4E9C', '#C8102E'].concat(['#F2C200', '#1C4E9C', '#C8102E', '#F2C200', '#1C4E9C', '#C8102E']).map((c) => `<i style="--c:${c}"></i>`).join('')}</div>`);
  for (const id of ['deco_gato', 'deco_pecera', 'deco_rocola']) if (list.includes(id)) out.push(`<div class="deco deco--${id.slice(5)}" aria-hidden="true">${ART[id]}</div>`);
  if (list.includes('deco_plantas')) out.push(`<div class="deco deco--plants" aria-hidden="true">${ART.deco_plantas}</div>${list.includes('deco_rocola') ? '' : `<div class="deco deco--plants deco--plants-r" aria-hidden="true">${ART.plantas_r}</div>`}`);
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
