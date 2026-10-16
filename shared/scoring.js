// Validación anti-trampas y cálculo de recompensas de un servicio.
// El servidor llama a esto con la configuración que ÉL generó; el cliente sólo
// envía qué pedidos sirvió, cuándo, y qué ingredientes desperdició.
// Todo el dinero se calcula aquí.

import { RECIPE_BY_ID, PROCESSES } from './data/catalog.js';
import { INGREDIENTS } from './data/ingredients.js';
import { generateOrders } from './levelgen.js';
import { minPrepMs, stationLoadMs, recipeIngredients, stationCount, VIP_PRICE_MULT, EMERGENCY_MAX_UNITS, GROUP_WINDOW_MS, GROUP_BONUS } from './rules.js';
import { generateEvents } from './levelgen.js';

export const MAX_COMBO_STEPS = 5;
export const TIP_RATE = 0.3;
export const STAR_THRESHOLDS = Object.freeze([0.4, 0.8, 1.15]);

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
    mode: config.mode,
    tier: config.tier ?? 0
  });
}

// Pago de un plato: precio + propina por rapidez + bono por perfectos (+ bono de grupo), por el combo.
export function plateEarnings(order, recipe, servedAt, perfects, combo, stats, together = false) {
  const price = recipe.price * (order.vip ? VIP_PRICE_MULT : 1);
  const patienceLeft = Math.max(0, 1 - (servedAt - order.arriveAt) / order.patienceMs);
  const tip = price * TIP_RATE * patienceLeft * (1 + stats.tipBonus);
  const perfectBonus = price * 0.05 * perfects;
  const groupBonus = together ? price * GROUP_BONUS : 0;
  const mult = 1 + 0.1 * Math.min(combo - 1, MAX_COMBO_STEPS);
  return { price, tip, perfectBonus, groupBonus, mult, earned: Math.round((price + tip + perfectBonus + groupBonus) * mult) };
}

// Un grupo "comió junto" si sus dos platos salieron con menos de GROUP_WINDOW_MS de diferencia.
export function groupsTogether(orders, servedAtById) {
  const byGroup = new Map();
  for (const o of orders) if (o.group != null) byGroup.set(o.group, [...(byGroup.get(o.group) ?? []), o.id]);
  const together = new Set();
  let count = 0;
  for (const ids of byGroup.values()) {
    if (ids.length < 2 || !ids.every((id) => servedAtById.has(id))) continue;
    const times = ids.map((id) => servedAtById.get(id));
    if (Math.max(...times) - Math.min(...times) > GROUP_WINDOW_MS) continue;
    ids.forEach((id) => together.add(id));
    count += 1;
  }
  return { together, count };
}

export function scoreRun(config, submission) {
  const orders = ordersForConfig(config);
  const { stats, durationMs } = config;
  const stock = config.stock ?? null;
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

  // Ingredientes: no se puede cocinar con lo que no hay en la despensa.
  const used = {};
  for (const s of serves) {
    for (const [ing, n] of Object.entries(recipeIngredients(RECIPE_BY_ID[s.recipeId]))) used[ing] = (used[ing] ?? 0) + n;
  }
  const waste = {};
  // Pedido urgente: unidades extra compradas durante el servicio al doble de precio.
  const emergency = {};
  let emergencyCost = 0;
  let emergencyUnits = 0;
  for (const [ing, n] of Object.entries(submission.emergency ?? {})) {
    if (!Number.isInteger(n) || n < 0) fail('urgente_invalido', { ing, n });
    if (n === 0) continue;
    const price = config.emergencyPrices?.[ing];
    if (!price) fail('urgente_invalido', { ing });
    emergency[ing] = n;
    emergencyUnits += n;
    emergencyCost += price * n;
  }
  if (emergencyUnits > EMERGENCY_MAX_UNITS) fail('urgente_excedido', { units: emergencyUnits });
  if (stock) {
    const avail = (ing) => (stock[ing] ?? 0) + (emergency[ing] ?? 0);
    for (const [ing, n] of Object.entries(used)) {
      if (n > avail(ing)) fail('sin_ingredientes', { ingredient: ing, used: n, stock: avail(ing) });
    }
    // Desperdicio declarado (quemados, clientes que se fueron): se limita a lo que quedaba.
    for (const [ing, n] of Object.entries(submission.waste ?? {})) {
      if (!INGREDIENTS[ing] || !Number.isInteger(n) || n < 0) fail('desperdicio_invalido', { ing, n });
      const left = avail(ing) - (used[ing] ?? 0);
      if (n > 0 && left > 0) waste[ing] = Math.min(n, left);
    }
  }

  // Cada estación procesa una cosa a la vez: la carga total no puede superar la partida.
  const totalLoad = {};
  for (const s of serves) {
    for (const [st, ms] of Object.entries(stationLoadMs(stats, RECIPE_BY_ID[s.recipeId]))) {
      totalLoad[st] = (totalLoad[st] ?? 0) + ms;
    }
  }
  for (const [st, ms] of Object.entries(totalLoad)) {
    if (ms > (durationMs + 1000) * stationCount(stats, st)) fail('estacion_sobrecargada', { station: st, ms });
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

  const groups = groupsTogether(orders, servedAtById);
  // Fuegos apagados (sólo cuentan para logros): no puede haber más que los que hubo.
  const firesOut = Math.max(0, Math.min(
    Number.isInteger(submission.firesOut) ? submission.firesOut : 0,
    generateEvents({ seed: config.seed, durationMs, tier: config.tier ?? 0 }).length
  ));

  let combo = 0;
  let bestCombo = 0;
  let d = 0;
  let gross = 0;
  let tips = 0;
  let perfectsTotal = 0;
  let vipServed = 0;
  const breakdown = [];
  for (const s of serves) {
    while (d < departures.length && departures[d] < s.servedAt) { combo = 0; d++; }
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    const order = orders[s.orderId];
    const recipe = RECIPE_BY_ID[order.recipeId];
    const e = plateEarnings(order, recipe, s.servedAt, s.perfects, combo, stats, groups.together.has(s.orderId));
    gross += e.earned;
    tips += Math.round(e.tip * e.mult);
    perfectsTotal += s.perfects;
    if (order.vip) vipServed += 1;
    breakdown.push({ orderId: s.orderId, recipeId: recipe.id, vip: order.vip, together: groups.together.has(s.orderId), base: e.price, tip: Math.round(e.tip), mult: e.mult, earned: e.earned });
  }

  const upkeep = config.upkeep ?? 0;
  const coins = Math.max(0, gross - upkeep - emergencyCost);
  const target = orders.reduce((sum, o) => sum + RECIPE_BY_ID[o.recipeId].price * (o.vip ? VIP_PRICE_MULT : 1), 0);
  const ratio = target > 0 ? gross / target : 0;
  const stars = STAR_THRESHOLDS.filter((th) => ratio >= th).length;
  const xp = serves.length * 10 + perfectsTotal * 2 + vipServed * 15 + stars * 25;
  const ingredientCost = Object.entries(used).reduce((s, [ing, n]) => s + INGREDIENTS[ing].cost * n, 0)
    + Object.entries(waste).reduce((s, [ing, n]) => s + INGREDIENTS[ing].cost * n, 0);

  return {
    served: serves.length,
    missed: departures.length,
    totalOrders: orders.length,
    vipServed,
    vipTotal: orders.filter((o) => o.vip).length,
    bestCombo,
    perfects: perfectsTotal,
    groupsServed: groups.count,
    groupsTotal: new Set(orders.filter((o) => o.group != null).map((o) => o.group)).size,
    firesOut,
    gross,
    tips,
    upkeep,
    emergency,
    emergencyCost,
    coins,
    score: gross,
    target,
    stars,
    xp,
    used,
    waste,
    ingredientCost,
    breakdown
  };
}
