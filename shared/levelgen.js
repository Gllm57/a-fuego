// Generación determinista de un servicio: clientes, hora pico y eventos de cocina.
// El servidor y el cliente obtienen exactamente lo mismo a partir de la semilla.

import { RECIPE_BY_ID } from './data/catalog.js';
import { createRng } from './rng.js';
import { patienceMs, TIER_PACE, TIER_GROUP_CHANCE, tierValue } from './rules.js';

// Ventana de hora pico: los clientes llegan mucho más seguido.
// Desde el Izakaya (nivel de local 4) dura más y es más intensa.
export function rushWindow(seed, durationMs, tier = 0) {
  const rng = createRng(`${seed}:rush`);
  const from = Math.round(durationMs * (0.35 + rng() * 0.25));
  const hard = tier >= 4;
  return { from, to: from + (hard ? 30_000 : 22_000), pace: hard ? 0.48 : 0.55 };
}

export function generateOrders({ seed, menu, durationMs, stats, mode = 'normal', tier = 0 }) {
  if (!Array.isArray(menu) || menu.length === 0) throw new Error('El menú está vacío');
  const rng = createRng(`${seed}:orders`);
  const rush = rushWindow(seed, durationMs, tier);
  const pace = (mode === 'daily' ? 0.85 : 1) * tierValue(TIER_PACE, tier);
  // Los grupos aparecen cuando sube la dificultad (y hay mesas para sentarlos).
  const slots = stats.slots ?? 3;
  const groupChance = slots >= 4 ? tierValue(TIER_GROUP_CHANCE, tier) : 0;
  const orders = [];
  let t = 1500;
  let prev = null;
  while (t < durationMs - 8000) {
    let recipeId = menu[Math.floor(rng() * menu.length)];
    if (recipeId === prev && menu.length > 1) recipeId = menu[(menu.indexOf(recipeId) + 1) % menu.length];
    prev = recipeId;
    const recipe = RECIPE_BY_ID[recipeId];
    const vip = orders.length >= 2 && rng() < 0.12;
    orders.push({
      id: orders.length,
      recipeId,
      arriveAt: Math.round(t),
      patienceMs: patienceMs(stats, recipe, { vip, tier }),
      vip,
      look: Math.floor(rng() * 8)
    });
    let extra = 0;
    // A veces llegan amigos con él: se sientan al lado y cada uno pide otro plato.
    if (groupChance > 0 && !vip && orders.length >= 2 && rng() < groupChance) {
      const first = orders[orders.length - 1];
      const friends = slots >= 5 && tier >= 4 && rng() < 0.4 ? 2 : 1;
      first.group = first.id;
      for (let k = 1; k <= friends; k++) {
        const pool = menu.length > 1 ? menu.filter((id) => id !== prev) : menu;
        const friendId = pool[Math.floor(rng() * pool.length)];
        const friend = RECIPE_BY_ID[friendId];
        orders.push({
          id: orders.length,
          recipeId: friendId,
          arriveAt: first.arriveAt + 400 * k,
          patienceMs: patienceMs(stats, friend, { tier }),
          vip: false,
          look: (first.look + k * 3 + Math.floor(rng() * 2)) % 8,
          group: first.id
        });
        prev = friendId;
      }
      extra = 0.6 * friends;
    }
    const progress = t / durationMs;
    const inRush = t >= rush.from && t < rush.to;
    const gap = (8500 - 3500 * progress) * pace * (inRush ? rush.pace : 1) * (0.75 + rng() * 0.5);
    t += gap * (1 + extra) + 800 * (recipe.components.length - 2);
  }
  return orders;
}

// Fuegos en la cocina: bloquean la sartén, el horno o (en los locales con parrilla) la parrilla.
// Sólo hacen la partida más lenta, así que el servidor no necesita validarlos.
export function generateEvents({ seed, durationMs, tier = 0 }) {
  const rng = createRng(`${seed}:events`);
  const count = 1 + (tier >= 3 ? 1 : 0) + (tier >= 5 ? 1 : 0) + (rng() < 0.4 ? 1 : 0);
  const events = [];
  for (let i = 0; i < count; i++) {
    const slice = (durationMs - 30_000) / count;
    events.push({
      type: 'fuego',
      station: pickFireStation(rng(), tier),
      at: Math.round(20_000 + slice * i + rng() * slice * 0.7)
    });
  }
  return events;
}

// Desde la cevichería (tier 5) los tres últimos locales tienen parrilla, que también se prende.
function pickFireStation(x, tier) {
  if (tier >= 5 && x < 0.3) return 'parrilla';
  return x < 0.6 ? 'sarten' : 'horno';
}
