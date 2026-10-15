// Generación determinista de un servicio: clientes, hora pico y eventos de cocina.
// El servidor y el cliente obtienen exactamente lo mismo a partir de la semilla.

import { RECIPE_BY_ID } from './data/catalog.js';
import { createRng } from './rng.js';
import { patienceMs } from './rules.js';

// Ventana de hora pico: los clientes llegan mucho más seguido.
export function rushWindow(seed, durationMs) {
  const rng = createRng(`${seed}:rush`);
  const from = Math.round(durationMs * (0.35 + rng() * 0.25));
  return { from, to: from + 22_000 };
}

export function generateOrders({ seed, menu, durationMs, stats, mode = 'normal', tier = 0 }) {
  if (!Array.isArray(menu) || menu.length === 0) throw new Error('El menú está vacío');
  const rng = createRng(`${seed}:orders`);
  const rush = rushWindow(seed, durationMs);
  const pace = (mode === 'daily' ? 0.85 : 1) * (1 - 0.06 * tier);
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
      look: Math.floor(rng() * 6)
    });
    const progress = t / durationMs;
    const inRush = t >= rush.from && t < rush.to;
    const gap = (8500 - 3500 * progress) * pace * (inRush ? 0.55 : 1) * (0.75 + rng() * 0.5);
    t += gap + 800 * (recipe.components.length - 2);
  }
  return orders;
}

// Fuegos en la cocina: bloquean la sartén o el horno hasta apagarlos.
// Sólo hacen la partida más lenta, así que el servidor no necesita validarlos.
export function generateEvents({ seed, durationMs, tier = 0 }) {
  const rng = createRng(`${seed}:events`);
  const count = 1 + (tier >= 2 ? 1 : 0) + (tier >= 4 ? 1 : 0) + (rng() < 0.4 ? 1 : 0);
  const events = [];
  for (let i = 0; i < count; i++) {
    const slice = (durationMs - 30_000) / count;
    events.push({
      type: 'fuego',
      station: rng() < 0.6 ? 'sarten' : 'horno',
      at: Math.round(20_000 + slice * i + rng() * slice * 0.7)
    });
  }
  return events;
}
