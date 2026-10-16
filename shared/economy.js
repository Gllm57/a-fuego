// Economía y progresión. Funciones puras: reciben un estado de jugador y
// devuelven decisiones. El servidor las aplica dentro de una transacción.
//
// Meta del dinero: construir la cadena «¡A Fuego!». Las ganancias se invierten en
//   1. Ingredientes del mercado (sin ellos no se cocina; precios cambian cada día),
//   2. Abrir restaurantes nuevos (5 cocinas del mundo),
//   3. Aprender recetas (más caras = platos que pagan más),
//   4. Mejorar la cocina (más rápida, más paciencia, más despensa…).
// Al completar el 100 % del imperio se obtiene el título «Chef Leyenda».

import { RESTAURANTS, RESTAURANT_BY_ID, RECIPES, RECIPE_BY_ID, UPGRADES, UPGRADE_BY_ID, STAFF_BY_ID, STAFF_RANKS, recipesOf } from './data/catalog.js';
import { INGREDIENTS } from './data/ingredients.js';
import { hashString } from './rng.js';
import { upgradeLevel, storageCapacity } from './rules.js';
import { emptyStats } from './achievements.js';

export const STARTING_COINS = 200;
// El primer restaurante de la cadena (gratis desde el inicio).
export const STARTER_RESTAURANT = RESTAURANTS[0].id;

// Mejoras que ya no existen: se devuelve lo pagado. Las mesas ahora vienen con cada restaurante.
export const RETIRED_UPGRADES = Object.freeze({ mesas: [1500, 5000] });
export function retiredRefund(id, level) {
  return (RETIRED_UPGRADES[id] ?? []).slice(0, Math.max(0, level)).reduce((a, b) => a + b, 0);
}

export function xpForLevel(level) {
  return 150 * (level - 1) * level / 2;
}

export function levelFromXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  return { level, current: xp - from, needed: to - from };
}

export function newPlayerState() {
  return {
    coins: STARTING_COINS,
    xp: 0,
    restaurants: [STARTER_RESTAURANT],
    recipes: recipesOf(STARTER_RESTAURANT).filter((x) => x.learnCost === 0).map((x) => x.id),
    upgrades: {},
    inventory: { harina_maiz: 18, queso: 11, carne_res: 11 },
    dailyClaimed: null,
    basketClaimed: null,
    stats: emptyStats(),
    achievements: [],
    staff: { hired: null, owned: [], exp: {} }
  };
}

// ── Personal de cocina ──────────────────────────────────────
export function staffRank(services = 0) {
  let rank = 0;
  STAFF_RANKS.forEach((r, i) => { if (services >= r.from) rank = i; });
  return rank;
}

// Contratar (o despedir con id = null). La primera vez se paga el contrato (`hireCost`);
// a quien ya trabajó contigo lo vuelves a llamar gratis. Además cobra sueldo en cada servicio.
export function evaluateHire(state, id) {
  if (id === null) return { ok: true, price: 0 };
  const member = STAFF_BY_ID[id];
  if (!member) return { ok: false, reason: 'no_existe' };
  if (state.staff?.hired === id) return { ok: false, reason: 'ya_comprado' };
  if (staffOwned(state).includes(id)) return { ok: true, price: 0 };
  if (!state.restaurants.includes(member.reqRestaurant)) return { ok: false, reason: 'personal_bloqueado', restaurant: member.reqRestaurant };
  if (state.coins < member.hireCost) return { ok: false, reason: 'sin_dinero', price: member.hireCost };
  return { ok: true, price: member.hireCost };
}

export function staffOwned(state) {
  const owned = new Set(state.staff?.owned ?? []);
  if (state.staff?.hired) owned.add(state.staff.hired);
  return [...owned];
}

export function applyHire(state, id, price = 0) {
  const owned = staffOwned(state);
  if (id && !owned.includes(id)) owned.push(id);
  return { ...state, coins: state.coins - price, staff: { hired: id, owned, exp: { ...(state.staff?.exp ?? {}) } } };
}

// Un servicio más de experiencia para quien trabajó.
export function addStaffExp(staff, id) {
  if (!id) return staff;
  return { ...staff, owned: staff.owned ?? [id], exp: { ...staff.exp, [id]: (staff.exp?.[id] ?? 0) + 1 } };
}

// Decide si una compra es válida. Nunca muta el estado.
export function evaluatePurchase(state, kind, id) {
  const level = levelFromXp(state.xp);
  const no = (reason, extra = {}) => ({ ok: false, reason, ...extra });

  if (kind === 'restaurant') {
    const rest = RESTAURANT_BY_ID[id];
    if (!rest) return no('no_existe');
    if (state.restaurants.includes(id)) return no('ya_comprado');
    // Hay que dominar la cocina anterior: tenerla abierta y saber sus 8 recetas.
    const prev = previousRestaurant(id);
    if (prev) {
      const progress = recipeProgress(state, prev.id);
      if (!state.restaurants.includes(prev.id) || progress.learned < progress.total) {
        return no('recetas_pendientes', { restaurant: prev.id, learned: progress.learned, total: progress.total });
      }
    }
    if (level < rest.reqLevel) return no('nivel_insuficiente', { reqLevel: rest.reqLevel });
    if (state.coins < rest.cost) return no('sin_dinero', { price: rest.cost });
    const freeRecipes = recipesOf(id).filter((x) => x.learnCost === 0).map((x) => x.id);
    return { ok: true, price: rest.cost, grants: [{ kind: 'restaurant', id }, ...freeRecipes.map((rid) => ({ kind: 'recipe', id: rid }))] };
  }

  if (kind === 'recipe') {
    const rec = RECIPE_BY_ID[id];
    if (!rec) return no('no_existe');
    if (state.recipes.includes(id)) return no('ya_comprado');
    if (!state.restaurants.includes(rec.restaurant)) return no('restaurante_cerrado');
    if (level < rec.reqLevel) return no('nivel_insuficiente', { reqLevel: rec.reqLevel });
    if (state.coins < rec.learnCost) return no('sin_dinero', { price: rec.learnCost });
    return { ok: true, price: rec.learnCost, grants: [{ kind: 'recipe', id }] };
  }

  if (kind === 'upgrade') {
    const up = UPGRADE_BY_ID[id];
    if (!up) return no('no_existe');
    const current = upgradeLevel(state.upgrades, id);
    if (current >= up.costs.length) return no('nivel_maximo');
    const reqLevel = up.reqLevels?.[current] ?? 1;
    if (level < reqLevel) return no('nivel_insuficiente', { reqLevel });
    const price = up.costs[current];
    if (state.coins < price) return no('sin_dinero', { price });
    return { ok: true, price, grants: [{ kind: 'upgrade', id, level: current + 1 }] };
  }

  return no('tipo_invalido');
}

// Aplica una compra ya validada (usado por el modo sin conexión del cliente).
export function applyGrants(state, price, grants) {
  const next = structuredClone(state);
  next.coins -= price;
  for (const g of grants) {
    if (g.kind === 'restaurant' && !next.restaurants.includes(g.id)) next.restaurants.push(g.id);
    if (g.kind === 'recipe' && !next.recipes.includes(g.id)) next.recipes.push(g.id);
    if (g.kind === 'upgrade') next.upgrades[g.id] = g.level;
  }
  return next;
}

// ── Mercado ─────────────────────────────────────────────────
export const BULK_QTY = 10;
export const BULK_DISCOUNT = 0.1;
export const DEALS_PER_DAY = 3;

export function inventoryCount(inventory = {}) {
  return Object.values(inventory).reduce((s, n) => s + n, 0);
}

// Lo que se vende: ingredientes de las recetas que el jugador ya sabe preparar.
export function marketIngredients(state) {
  const set = new Set();
  for (const id of state.recipes) for (const c of RECIPE_BY_ID[id].components) set.add(c.ingredient);
  return [...set];
}

// Precios del día: ±25 % sobre el costo base y 3 ofertas al 40 % de descuento.
export function marketPrices(day) {
  const ids = Object.keys(INGREDIENTS);
  const deals = new Set([...ids].sort((a, b) => hashString(`deal:${day}:${a}`) - hashString(`deal:${day}:${b}`)).slice(0, DEALS_PER_DAY));
  const prices = {};
  for (const id of ids) {
    const f = 0.75 + 0.5 * (hashString(`price:${day}:${id}`) / 4294967296);
    const price = Math.max(1, Math.round(INGREDIENTS[id].cost * f * (deals.has(id) ? 0.6 : 1)));
    prices[id] = { price, deal: deals.has(id), trend: price > INGREDIENTS[id].cost ? 'up' : price < INGREDIENTS[id].cost ? 'down' : 'flat' };
  }
  return prices;
}

export function lineTotal(unitPrice, qty) {
  const total = unitPrice * qty;
  return qty >= BULK_QTY ? Math.round(total * (1 - BULK_DISCOUNT)) : total;
}

export function evaluateMarketBuy(state, items, day) {
  const no = (reason, extra = {}) => ({ ok: false, reason, ...extra });
  const entries = Object.entries(items ?? {}).filter(([, q]) => q !== 0);
  if (entries.length === 0) return no('carrito_vacio');
  const sellable = new Set(marketIngredients(state));
  const prices = marketPrices(day);
  let price = 0;
  let units = 0;
  for (const [ing, qty] of entries) {
    if (!sellable.has(ing)) return no('no_disponible', { ingredient: ing });
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return no('cantidad_invalida', { ingredient: ing });
    price += lineTotal(prices[ing].price, qty);
    units += qty;
  }
  const capacity = storageCapacity(state.upgrades);
  if (inventoryCount(state.inventory) + units > capacity) return no('despensa_llena', { capacity });
  if (state.coins < price) return no('sin_dinero', { price });
  return { ok: true, price, delta: Object.fromEntries(entries) };
}

export function applyInventory(state, delta, price = 0) {
  const next = structuredClone(state);
  next.coins -= price;
  next.inventory ??= {};
  for (const [ing, n] of Object.entries(delta)) {
    const v = (next.inventory[ing] ?? 0) + n;
    if (v > 0) next.inventory[ing] = v; else delete next.inventory[ing];
  }
  return next;
}

// Plan de compra para surtir la despensa: lo que falta para ~N platos del menú
// de un restaurante, repartido entre sus recetas y limitado por el espacio libre.
export function restockPlan(state, restaurantId, dishes = 10) {
  const menu = menuFor(state, restaurantId);
  if (!menu.length) return {};
  const need = {};
  const per = Math.ceil(dishes / menu.length);
  for (const id of menu) {
    for (const c of RECIPE_BY_ID[id].components) need[c.ingredient] = (need[c.ingredient] ?? 0) + per;
  }
  let free = Math.max(0, storageCapacity(state.upgrades) - inventoryCount(state.inventory));
  const plan = {};
  // Primero lo que más falta, para no quedarse sin nada a mitad del servicio.
  const missing = Object.entries(need)
    .map(([ing, n]) => [ing, n - (state.inventory?.[ing] ?? 0)])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  while (free > 0 && missing.some(([, n]) => n > 0)) {
    for (const entry of missing) {
      if (free <= 0) break;
      if (entry[1] <= 0) continue;
      plan[entry[0]] = (plan[entry[0]] ?? 0) + 1;
      entry[1] -= 1;
      free -= 1;
    }
  }
  return plan;
}

// Canasta gratuita una vez al día: evita quedarse sin poder cocinar.
export function dailyBasket(day, state) {
  const pool = marketIngredients(state).sort((a, b) => hashString(`basket:${day}:${a}`) - hashString(`basket:${day}:${b}`));
  const free = Math.max(0, storageCapacity(state.upgrades) - inventoryCount(state.inventory));
  const items = {};
  let left = Math.min(12, free);
  for (const ing of pool) {
    if (left <= 0) break;
    const n = Math.min(3, left);
    items[ing] = n;
    left -= n;
  }
  return { day, items, claimed: state.basketClaimed === day };
}

export function menuFor(state, restaurantId) {
  return recipesOf(restaurantId).filter((x) => state.recipes.includes(x.id)).map((x) => x.id);
}

const TOTAL_UPGRADE_LEVELS = UPGRADES.reduce((s, u) => s + u.costs.length, 0);
const TOTAL_INVESTMENT =
  RESTAURANTS.reduce((s, x) => s + x.cost, 0) +
  RECIPES.reduce((s, x) => s + x.learnCost, 0) +
  UPGRADES.reduce((s, u) => s + u.costs.reduce((a, b) => a + b, 0), 0);

export function empireProgress(state) {
  const rest = (state.restaurants.length - 1) / (RESTAURANTS.length - 1);
  const rec = state.recipes.length / RECIPES.length;
  const upLevels = UPGRADES.reduce((s, u) => s + upgradeLevel(state.upgrades, u.id), 0) / TOTAL_UPGRADE_LEVELS;
  const pct = Math.round((rest * 0.4 + rec * 0.4 + upLevels * 0.2) * 100);
  return {
    percent: pct,
    restaurants: state.restaurants.length,
    restaurantsTotal: RESTAURANTS.length,
    recipes: state.recipes.length,
    recipesTotal: RECIPES.length,
    totalInvestment: TOTAL_INVESTMENT,
    title: titleFor(pct)
  };
}

export function titleFor(pct) {
  if (pct >= 100) return 'Chef Leyenda';
  if (pct >= 75) return 'Chef Ejecutivo';
  if (pct >= 50) return 'Chef de Cocina';
  if (pct >= 25) return 'Sous Chef';
  return 'Cocinero Novato';
}

// Sugiere el siguiente objetivo concreto en el que invertir.
export function previousRestaurant(id) {
  const idx = RESTAURANTS.findIndex((r) => r.id === id);
  return idx > 0 ? RESTAURANTS[idx - 1] : null;
}

export function recipeProgress(state, restaurantId) {
  const list = recipesOf(restaurantId);
  return { learned: list.filter((r) => state.recipes.includes(r.id)).length, total: list.length };
}

// Siguiente objetivo concreto: primero completar el recetario del último local
// abierto (requisito para el siguiente), luego abrir el siguiente restaurante.
export function nextGoal(state) {
  const level = levelFromXp(state.xp);
  const nextRest = RESTAURANTS.find((x) => !state.restaurants.includes(x.id));
  const pending = RECIPES
    .filter((x) => !state.recipes.includes(x.id) && state.restaurants.includes(x.restaurant))
    .sort((a, b) => a.reqLevel - b.reqLevel || a.learnCost - b.learnCost);
  const asGoal = (r) => ({ kind: 'recipe', id: r.id, name: `Aprender ${r.name}`, price: r.learnCost, reqLevel: r.reqLevel });
  if (nextRest) {
    const prev = previousRestaurant(nextRest.id);
    const blocking = prev ? pending.filter((r) => r.restaurant === prev.id) : [];
    if (blocking.length) return asGoal(blocking.find((r) => level >= r.reqLevel) ?? blocking[0]);
    return { kind: 'restaurant', id: nextRest.id, name: `Abrir ${nextRest.name}`, price: nextRest.cost, reqLevel: nextRest.reqLevel };
  }
  if (pending.length) return asGoal(pending.find((r) => level >= r.reqLevel) ?? pending[0]);
  return { kind: 'done', name: '¡Eres Chef Leyenda!', price: 0, reqLevel: 0 };
}

// Reto del día: mismo para todos los jugadores con los mismos restaurantes.
export const DAILY_REWARD_BASE = 300;

export function dailyChallenge(day, state) {
  const owned = RESTAURANTS.filter((x) => state.restaurants.includes(x.id));
  const rest = owned[hashString(`daily:${day}`) % owned.length];
  const tier = RESTAURANTS.indexOf(rest);
  return {
    day,
    restaurantId: rest.id,
    seed: `daily:${day}:${rest.id}`,
    minStars: 2,
    reward: DAILY_REWARD_BASE + 150 * tier,
    claimed: state.dailyClaimed === day
  };
}

export function todayUTC(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// Cambio en la despensa tras un servicio: + urgente comprado, − usado y desperdiciado.
export function inventoryDelta(result) {
  const delta = {};
  const add = (ing, n) => { delta[ing] = (delta[ing] ?? 0) + n; };
  for (const [ing, n] of Object.entries(result.emergency ?? {})) add(ing, n);
  for (const [ing, n] of Object.entries(result.used ?? {})) add(ing, -n);
  for (const [ing, n] of Object.entries(result.waste ?? {})) add(ing, -n);
  return delta;
}
