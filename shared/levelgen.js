// Generación determinista de los clientes de un servicio.

import { RECIPE_BY_ID } from './data/catalog.js';
import { createRng } from './rng.js';
import { patienceMs } from './rules.js';

export function generateOrders({ seed, menu, durationMs, stats, mode = 'normal' }) {
  if (!Array.isArray(menu) || menu.length === 0) throw new Error('El menú está vacío');
  const rng = createRng(`${seed}:orders`);
  const pace = mode === 'daily' ? 0.85 : 1;
  const orders = [];
  let t = 1500;
  let prev = null;
  while (t < durationMs - 9000) {
    let recipeId = menu[Math.floor(rng() * menu.length)];
    if (recipeId === prev && menu.length > 1) recipeId = menu[(menu.indexOf(recipeId) + 1) % menu.length];
    prev = recipeId;
    const recipe = RECIPE_BY_ID[recipeId];
    orders.push({
      id: orders.length,
      recipeId,
      arriveAt: Math.round(t),
      patienceMs: patienceMs(stats, recipe),
      look: Math.floor(rng() * 6)
    });
    const progress = t / durationMs;
    const gap = (9500 - 3500 * progress) * pace * (0.75 + rng() * 0.5);
    t += gap + 900 * (recipe.components.length - 2);
  }
  return orders;
}
