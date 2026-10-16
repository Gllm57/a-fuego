// Dibujos de la decoración del local: los usa la cocina y la vista previa de «Mi local».

import { decorOf } from './shared/index.js';

const BULBS = ['#FFE08A', '#F28C8C', '#9FD3F0'];

export function lightsHtml(id) {
  if (id === 'luces_guirnalda') {
    return `<div class="garland" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<i style="--c:${BULBS[i % 3]};--d:${(i % 4) * 0.25}s"></i>`).join('')}</div>`;
  }
  if (id === 'luces_neon') return `<div class="neon-sign" aria-hidden="true">¡A Fuego!</div>`;
  return `<div class="lamps" aria-hidden="true"><span class="lamp"><i></i><b></b></span><span class="lamp"><i></i><b></b></span><span class="lamp"><i></i><b></b></span></div>`;
}

export function decoHtml(list) {
  const out = [];
  if (list.includes('deco_banderines')) out.push(`<div class="deco deco--flags" aria-hidden="true">${['#F2C200', '#1C4E9C', '#C8102E'].concat(['#F2C200', '#1C4E9C', '#C8102E', '#F2C200', '#1C4E9C', '#C8102E']).map((c) => `<i style="--c:${c}"></i>`).join('')}</div>`);
  if (list.includes('deco_cuadro')) out.push(`<div class="deco deco--frame" aria-hidden="true"><i></i></div>`);
  if (list.includes('deco_plantas')) out.push(`<div class="deco deco--plants" aria-hidden="true"><i></i><b></b></div><div class="deco deco--plants deco--plants-r" aria-hidden="true"><i></i><b></b></div>`);
  return out.join('');
}

// Atributos para el contenedor: pared y barra elegidas (los estilos están en styles.css).
export function decorAttrs(equipped) {
  return `data-wall="${equipped.pared}" data-counter="${equipped.barra}"`;
}

export function equippedOf(state) {
  return decorOf(state ?? {}).equipped;
}
