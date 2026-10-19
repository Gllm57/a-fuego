// Idioma de la interfaz: español (el texto fuente) o inglés.
// Cada texto se escribe en español dentro de t('…'); el diccionario inglés usa
// ese mismo texto como clave. Lo que falte en el diccionario se ve en español.
//   t('Nivel {n}', { n: 5 })  →  «Nivel 5» / «Level 5»

import { EN } from './i18n-en.js';

const KEY = 'afuego.lang';
export const LANGS = [
  { id: 'es', name: 'Español' },
  { id: 'en', name: 'English' }
];

let lang = read();

function read() {
  try { const v = localStorage.getItem(KEY); return v === 'en' || v === 'es' ? v : null; } catch { return null; }
}

// null mientras el jugador no haya elegido (se muestra la pantalla de idioma).
export const chosenLang = () => read();
export const getLang = () => lang ?? 'es';

export function setLang(id) {
  lang = id === 'en' ? 'en' : 'es';
  try { localStorage.setItem(KEY, lang); } catch { /* sin almacenamiento */ }
  document.documentElement.lang = lang;
}

export function t(es, vars) {
  let s = es == null ? '' : String(es);
  if (lang === 'en') s = EN[s] ?? s;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

// Números con el formato del idioma (1.250 / 1,250).
export const locale = () => (getLang() === 'en' ? 'en-US' : 'es');

document.documentElement.lang = getLang();
