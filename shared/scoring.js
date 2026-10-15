// Validación anti-trampas y cálculo de recompensas de un servicio.
// El servidor llama a esto con la configuración que ÉL generó; el cliente sólo
// envía qué pedidos sirvió y cuándo. Todo el dinero se calcula aquí.

import { RECIPE_BY_ID, PROCESSES } from './data/catalog.js';
import { generateOrders } from './levelgen.js';
import { minPrepMs, stationLoadMs } from './rules.js';

export const MAX_COMBO_STEPS = 10;
export const STAR_THRESHOLDS = Object.freeze([0.45, 0.9, 1.4]);

export class RunValidationError extends Error {
  constructor(reason, detail) {
    super(`Partida inválida: ${reason}`);
    this.name = 'RunValidationError';
    this.reason = reason;
    this.detail = detail;
  }
}

export function ordersForConfig(config) {
  return generateOrders({
    seed: config.seed,
    menu: config.menu,
    durationMs: config.durationMs,
    stats: config.stats,
    mode: config.mode
  });
}

export function scoreRun(config, submission) {
  const orders = ordersForConfig(config);
  const { stats, durationMs } = config;
  const fail = (reason, detail) => { throw new RunValidationError(reason, detail); };

  if (!submission || !Array.isArray(submission.serves)) fail('formato');
  if (submission.serves.length > orders.length) fail('demasiados_platos');

  const serves = submission.serves.map((s) => ({
    orderId: s.orderId, recipeId: s.recipeId, servedAt: s.servedAt, perfects: s.perfects ?? 0
  }));
  const seen = new Set();
  for (const s of serves) {
    if (!Number.isInteger(s.orderId) || s.orderId < 0 || s.orderId >= orders.length) fail('pedido_inexistente', s);
    if (seen.has(s.orderId)) fail('pedido_duplicado', s);
    seen.add(s.orderId);
    if (!Number.isInteger(s.servedAt) || s.servedAt < 0 || s.servedAt > durationMs) fail('tiempo_fuera_de_rango', s);
    if (!Number.isInteger(s.perfects) || s.perfects < 0) fail('perfectos_invalidos', s);
    const order = orders[s.orderId];
    if (s.recipeId !== order.recipeId) fail('receta_no_coincide', s);
    const recipe = RECIPE_BY_ID[order.recipeId];
    const timedComponents = recipe.components.filter((c) => PROCESSES[c.process].kind !== 'raw').length;
    if (s.perfects > timedComponents) fail('perfectos_invalidos', s);
    if (s.servedAt < order.arriveAt + minPrepMs(stats, order.recipeId)) fail('demasiado_rapido', s);
    if (s.servedAt > order.arriveAt + order.patienceMs) fail('cliente_ya_se_fue', s);
  }
  serves.sort((a, b) => a.servedAt - b.servedAt || a.orderId - b.orderId);

  // Cada estación procesa una cosa a la vez: la carga total no puede superar la partida.
  const totalLoad = {};
  for (const s of serves) {
    for (const [st, ms] of Object.entries(stationLoadMs(stats, RECIPE_BY_ID[s.recipeId]))) {
      totalLoad[st] = (totalLoad[st] ?? 0) + ms;
    }
  }
  for (const [st, ms] of Object.entries(totalLoad)) {
    if (ms > durationMs + 1000) fail('estacion_sobrecargada', { station: st, ms });
  }

  // Sólo se puede servir a un cliente sentado (dentro de las mesas disponibles).
  const servedAtById = new Map(serves.map((s) => [s.orderId, s.servedAt]));
  for (const s of serves) {
    const t = s.servedAt;
    const seated = orders.filter((o) => {
      if (o.arriveAt > t) return false;
      const sv = servedAtById.get(o.id);
      if (sv !== undefined && sv < t) return false;
      if (o.arriveAt + o.patienceMs < t) return false;
      return true;
    });
    const pos = seated.findIndex((o) => o.id === s.orderId);
    if (pos < 0 || pos >= stats.slots) fail('cliente_no_sentado', s);
  }

  // Clientes que se fueron sin comer rompen el combo.
  const departures = orders
    .filter((o) => !servedAtById.has(o.id) && o.arriveAt + o.patienceMs <= durationMs)
    .map((o) => o.arriveAt + o.patienceMs)
    .sort((a, b) => a - b);

  let combo = 0;
  let bestCombo = 0;
  let d = 0;
  let coins = 0;
  let perfectsTotal = 0;
  const breakdown = [];
  for (const s of serves) {
    while (d < departures.length && departures[d] < s.servedAt) { combo = 0; d++; }
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    const order = orders[s.orderId];
    const recipe = RECIPE_BY_ID[order.recipeId];
    const waited = s.servedAt - order.arriveAt;
    const patienceLeft = Math.max(0, 1 - waited / order.patienceMs);
    const tip = recipe.price * 0.5 * patienceLeft * (1 + stats.tipBonus);
    const perfectBonus = recipe.price * 0.05 * s.perfects;
    const mult = 1 + 0.1 * Math.min(combo - 1, MAX_COMBO_STEPS);
    const earned = Math.round((recipe.price + tip + perfectBonus) * mult);
    coins += earned;
    perfectsTotal += s.perfects;
    breakdown.push({ orderId: s.orderId, recipeId: recipe.id, base: recipe.price, tip: Math.round(tip), perfectBonus: Math.round(perfectBonus), mult, earned });
  }

  const target = orders.reduce((sum, o) => sum + RECIPE_BY_ID[o.recipeId].price, 0);
  const ratio = target > 0 ? coins / target : 0;
  const stars = STAR_THRESHOLDS.filter((th) => ratio >= th).length;
  const xp = serves.length * 10 + perfectsTotal * 2 + stars * 25;

  return {
    served: serves.length,
    missed: departures.length,
    totalOrders: orders.length,
    bestCombo,
    perfects: perfectsTotal,
    coins,
    score: coins,
    target,
    stars,
    xp,
    breakdown
  };
}
