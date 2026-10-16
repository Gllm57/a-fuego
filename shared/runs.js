// Construcción de la configuración de un servicio a partir del estado del jugador.
// La configuración es inmutable durante la partida: se valida contra ella.

import { RESTAURANT_BY_ID, RESTAURANTS, RECIPE_BY_ID, STAFF_BY_ID } from './data/catalog.js';
import { kitchenStats, RUN_DURATION_MS } from './rules.js';
import { menuFor, dailyChallenge, marketPrices, staffRank } from './economy.js';
import { EMERGENCY_PRICE_MULT } from './rules.js';

export class RunStartError extends Error {
  constructor(reason) {
    super(`No se puede empezar: ${reason}`);
    this.name = 'RunStartError';
    this.reason = reason;
  }
}

export function buildRunConfig(state, { restaurantId, mode = 'normal', randomSeed, day }) {
  if (mode !== 'normal' && mode !== 'daily') throw new RunStartError('modo_invalido');
  let seed = randomSeed;
  if (mode === 'daily') {
    const challenge = dailyChallenge(day, state);
    restaurantId = challenge.restaurantId;
    seed = challenge.seed;
  }
  if (!RESTAURANT_BY_ID[restaurantId]) throw new RunStartError('restaurante_desconocido');
  if (!state.restaurants.includes(restaurantId)) throw new RunStartError('restaurante_cerrado');
  const menu = menuFor(state, restaurantId);
  if (menu.length === 0) throw new RunStartError('menu_vacio');
  // Foto de la despensa al empezar: sólo se puede cocinar con esto.
  const stock = {};
  for (const id of menu) {
    for (const c of RECIPE_BY_ID[id].components) stock[c.ingredient] = state.inventory?.[c.ingredient] ?? 0;
  }
  if (Object.values(stock).every((n) => n === 0)) throw new RunStartError('despensa_vacia');
  const rest = RESTAURANT_BY_ID[restaurantId];
  // Precios del pedido urgente (el doble del mercado de hoy), fijados al empezar.
  const prices = marketPrices(day);
  const emergencyPrices = Object.fromEntries(Object.keys(stock).map((ing) => [ing, prices[ing].price * EMERGENCY_PRICE_MULT]));
  // Asistente contratado: su rango queda fijo durante el servicio.
  const stats = kitchenStats(state.upgrades, restaurantId);
  const member = STAFF_BY_ID[state.staff?.hired];
  let staff = null;
  if (member) {
    const rank = staffRank(state.staff.exp?.[member.id] ?? 0);
    staff = { id: member.id, rank, salary: member.salary };
    const lv = member.levels[rank];
    if (lv.patience) stats.patienceMult = Math.round(stats.patienceMult * lv.patience * 100) / 100;
    if (lv.tip) stats.tipBonus = Math.round((stats.tipBonus + lv.tip) * 100) / 100;
  }
  return {
    version: 3,
    emergencyPrices,
    tier: RESTAURANTS.indexOf(rest),
    upkeep: rest.upkeep,
    staff,
    salary: staff?.salary ?? 0,
    stock,
    restaurantId,
    mode,
    day: mode === 'daily' ? day : null,
    seed: String(seed),
    menu,
    durationMs: RUN_DURATION_MS,
    stats
  };
}
