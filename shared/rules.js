// Reglas derivadas: cómo afectan las mejoras a la cocina, y los tiempos
// mínimos que el servidor usa para detectar partidas imposibles.

import { PROCESSES, RECIPE_BY_ID, RESTAURANT_BY_ID, UPGRADE_BY_ID, STATIONS } from './data/catalog.js';

export const RUN_DURATION_MS = 90_000;
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
// Dificultad por restaurante (0 = arepera … 7 = barbacoa coreana): paciencia de los
// clientes y ritmo de llegada. Cada local se nota más exigente que el anterior.
export const TIER_PATIENCE = Object.freeze([1.05, 0.96, 0.88, 0.82, 0.76, 0.68, 0.65, 0.62]);
export const TIER_PACE = Object.freeze([1.04, 0.97, 0.91, 0.87, 0.82, 0.76, 0.73, 0.70]);
// Vidas por servicio: cada cliente que se va enojado quita una (un crítico, dos).
// Sin vidas cierran la cocina antes de tiempo. Margen para el último fotograma.
export const SERVICE_LIVES = 3;
export const CLOSE_GRACE_MS = 400;
// Grupos: dos amigos que llegan juntos y quieren comer a la vez.
export const GROUP_WINDOW_MS = 10_000;
// Probabilidad de que llegue un grupo, según el restaurante: ninguno en los dos primeros
// locales; desde el diner aparecen parejas y con 5 mesas también grupos de tres.
export const TIER_GROUP_CHANCE = Object.freeze([0, 0, 0.14, 0.17, 0.2, 0.22, 0.24, 0.26]);
export const GROUP_BONUS = 0.25;
export const tierValue = (table, tier) => table[Math.max(0, Math.min(table.length - 1, tier | 0))];

export function upgradeLevel(upgrades, id) {
  const lvl = Number(upgrades?.[id] ?? 0);
  const max = UPGRADE_BY_ID[id]?.costs.length ?? 0;
  return Math.max(0, Math.min(max, Number.isFinite(lvl) ? Math.floor(lvl) : 0));
}

export function storageCapacity(upgrades = {}) {
  return BASE_STORAGE + 25 * upgradeLevel(upgrades, 'refri');
}

// Los lugares en la barra dependen del restaurante (3 → 5), no de una mejora.
export function kitchenStats(upgrades = {}, restaurantId = null) {
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
      hervir: round2(PROCESSES.hervir.seconds * speed('olla')),
      asar: round2(PROCESSES.asar.seconds * speed('parrilla'))
    },
    burnSeconds: {
      freir: round2(PROCESSES.freir.burnSeconds * campana),
      hornear: round2(PROCESSES.hornear.burnSeconds * campana),
      asar: round2(PROCESSES.asar.burnSeconds * campana)
    },
    patienceMult: round2(1 + 0.1 * ambiente),
    tipBonus: round2(0.08 * ambiente),
    slots: RESTAURANT_BY_ID[restaurantId]?.seats ?? BASE_SLOTS,
    // Cuántos fogones hay de cada tipo (1 + equipo extra comprado). La parrilla, sólo
    // en los locales que la tienen.
    stations: Object.fromEntries(Object.keys(STATIONS)
      .filter((st) => !STATIONS[st].grillOnly || !restaurantId || RESTAURANT_BY_ID[restaurantId]?.grill)
      .map((st) => [st, 1 + upgradeLevel(upgrades, `extra_${st}`)]))
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

export function stationCount(stats, station) {
  return Math.max(1, stats.stations?.[station] ?? 1);
}

// Cada fogón procesa una cosa a la vez; fogones distintos (o repetidos) trabajan en paralelo.
// Cota inferior: el componente más largo, o la carga de un tipo repartida entre sus fogones.
export function minPrepMs(stats, recipeId) {
  const recipe = RECIPE_BY_ID[recipeId];
  const load = stationLoadMs(stats, recipe);
  let min = 0;
  for (const c of recipe.components) min = Math.max(min, minComponentMs(stats, c.process));
  for (const [st, ms] of Object.entries(load)) min = Math.max(min, Math.ceil(ms / stationCount(stats, st)));
  return min;
}

export function patienceMs(stats, recipe, { vip = false, tier = 0 } = {}) {
  const timed = recipe.components.filter((c) => PROCESSES[c.process].kind !== 'raw').length;
  const base = (18_000 + 5_500 * recipe.components.length + 2_000 * timed) * tierValue(TIER_PATIENCE, tier);
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
