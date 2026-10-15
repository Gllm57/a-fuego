// Reglas derivadas: cómo afectan las mejoras a la cocina, y los tiempos
// mínimos que el servidor usa para detectar partidas imposibles.

import { PROCESSES, RECIPE_BY_ID, UPGRADE_BY_ID, STATIONS } from './data/catalog.js';

export const RUN_DURATION_MS = 120_000;
export const BASE_SLOTS = 3;
export const BASE_STORAGE = 60;
// Pedido urgente durante el servicio: llega en unos segundos y cuesta el doble.
export const EMERGENCY_MAX_UNITS = 12;
export const EMERGENCY_PRICE_MULT = 2;
export const EMERGENCY_DELAY_MS = 3000;
// Un humano no puede tocar más rápido que esto de forma sostenida.
export const MIN_TAP_MS = 90;
// Ventana tras terminar un proceso para recogerlo con calificación "perfecto".
export const PERFECT_WINDOW_MS = 900;
// Los críticos gastronómicos pagan más y tienen menos paciencia.
export const VIP_PRICE_MULT = 2;
export const VIP_PATIENCE_MULT = 0.7;
// Toques necesarios para apagar un fuego en una estación.
export const FIRE_TAPS = 6;

export function upgradeLevel(upgrades, id) {
  const lvl = Number(upgrades?.[id] ?? 0);
  const max = UPGRADE_BY_ID[id]?.costs.length ?? 0;
  return Math.max(0, Math.min(max, Number.isFinite(lvl) ? Math.floor(lvl) : 0));
}

export function storageCapacity(upgrades = {}) {
  return BASE_STORAGE + 25 * upgradeLevel(upgrades, 'refri');
}

export function kitchenStats(upgrades = {}) {
  const speed = (id) => 1 - 0.12 * upgradeLevel(upgrades, id);
  const campana = 1 + 0.4 * upgradeLevel(upgrades, 'campana');
  const ambiente = upgradeLevel(upgrades, 'ambiente');
  return {
    taps: {
      cortar: Math.max(2, PROCESSES.cortar.taps - Math.ceil(upgradeLevel(upgrades, 'cuchillos') / 2)),
      batir: Math.max(3, PROCESSES.batir.taps - Math.ceil(upgradeLevel(upgrades, 'batidora') * 0.75))
    },
    seconds: {
      freir: round2(PROCESSES.freir.seconds * speed('sarten')),
      hornear: round2(PROCESSES.hornear.seconds * speed('horno')),
      hervir: round2(PROCESSES.hervir.seconds * speed('olla'))
    },
    burnSeconds: {
      freir: round2(PROCESSES.freir.burnSeconds * campana),
      hornear: round2(PROCESSES.hornear.burnSeconds * campana)
    },
    patienceMult: round2(1 + 0.1 * ambiente),
    tipBonus: round2(0.08 * ambiente),
    slots: BASE_SLOTS + upgradeLevel(upgrades, 'mesas')
  };
}

// Tiempo mínimo físicamente posible para completar un componente.
export function minComponentMs(stats, process) {
  const p = PROCESSES[process];
  if (p.kind === 'raw') return 0;
  if (p.kind === 'tap') return stats.taps[process] * MIN_TAP_MS;
  return Math.floor(stats.seconds[process] * 1000 * 0.97);
}

// Ocupación mínima por estación para un plato.
export function stationLoadMs(stats, recipe) {
  const load = {};
  for (const c of recipe.components) {
    const st = PROCESSES[c.process].station;
    if (!st) continue;
    load[st] = (load[st] ?? 0) + minComponentMs(stats, c.process);
  }
  return load;
}

// Cada estación procesa una cosa a la vez; estaciones distintas trabajan en paralelo.
export function minPrepMs(stats, recipeId) {
  const load = stationLoadMs(stats, RECIPE_BY_ID[recipeId]);
  return Object.values(load).reduce((m, v) => Math.max(m, v), 0);
}

export function patienceMs(stats, recipe, { vip = false, tier = 0 } = {}) {
  const timed = recipe.components.filter((c) => PROCESSES[c.process].kind !== 'raw').length;
  const base = (18_000 + 5_500 * recipe.components.length + 2_000 * timed) * (1 - 0.08 * tier);
  return Math.round(base * stats.patienceMult * (vip ? VIP_PATIENCE_MULT : 1));
}

// Ingredientes que consume un plato (una unidad por componente).
export function recipeIngredients(recipe) {
  const need = {};
  for (const c of recipe.components) need[c.ingredient] = (need[c.ingredient] ?? 0) + 1;
  return need;
}

export const STATION_ORDER = Object.freeze(Object.keys(STATIONS));

function round2(x) { return Math.round(x * 100) / 100; }
