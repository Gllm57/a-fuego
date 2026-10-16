// Botones de ajustes (sonido, música, vibración): mismas fichas en la pausa y en el perfil.

import { icon } from './art.js';
import { getPrefs, setPref, sfx, vibrate } from './audio.js';

const PREFS = [
  { key: 'sound', label: 'Sonido', icon: 'sound' },
  { key: 'music', label: 'Música', icon: 'music' },
  { key: 'haptics', label: 'Vibración', icon: 'vibrate' }
];

export function prefTilesHtml(variant = '') {
  const prefs = getPrefs();
  return `<div class="pref-tiles ${variant}">${PREFS.map((p) => `
    <button class="pref-tile" data-pref="${p.key}" aria-pressed="${prefs[p.key]}" aria-label="${p.label}">
      <span class="pref-tile__icon">${icon(p.icon)}<i class="pref-tile__slash"></i></span>
      <b>${p.label}</b>
      <small>${prefs[p.key] ? 'Activado' : 'Apagado'}</small>
    </button>`).join('')}</div>`;
}

// La música depende del sonido: sin sonido, la ficha de música se ve apagada.
function sync(root) {
  const prefs = getPrefs();
  root.querySelectorAll('.pref-tile').forEach((b) => {
    const on = prefs[b.dataset.pref];
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('is-muted', b.dataset.pref === 'music' && !prefs.sound);
    b.querySelector('small').textContent = on ? (b.dataset.pref === 'music' && !prefs.sound ? 'Sin sonido' : 'Activado') : 'Apagado';
  });
}

export function bindPrefTiles(root) {
  sync(root);
  root.querySelectorAll('.pref-tile').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const key = b.dataset.pref;
    const on = !getPrefs()[key];
    setPref(key, on);
    b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
    if (on && key === 'haptics') vibrate([30, 40, 30]);
    else if (on) sfx.tap();
    sync(root);
  }));
}
