// Economía y progresión. Funciones puras: reciben un estado de jugador y
// devuelven decisiones. El servidor las aplica dentro de una transacción.
//
// Meta del dinero: construir la cadena «¡A Fuego!». Las propinas se invierten en
//   1. Abrir restaurantes nuevos (5 cocinas del mundo),
//   2. Aprender recetas (más caras = platos que pagan más),
//   3. Mejorar la cocina (más rápida, clientes más pacientes, más mesas).
// Al completar el 100 % del imperio se obtiene el título «Chef Leyenda».

import { RESTAURANTS, RESTAURANT_BY_ID, RECIPES, RECIPE_BY_ID, UPGRADES, UPGRADE_BY_ID, recipesOf } from './data/catalog.js';
import { hashString } from './rng.js';
import { upgradeLevel } from './rules.js';

export const STARTING_COINS = 150;

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
    restaurants: ['taqueria'],
    recipes: recipesOf('taqueria').filter((x) => x.learnCost === 0).map((x) => x.id),
    upgrades: {},
    dailyClaimed: null
  };
}

// Decide si una compra es válida. Nunca muta el estado.
export function evaluatePurchase(state, kind, id) {
  const level = levelFromXp(state.xp);
  const no = (reason, extra = {}) => ({ ok: false, reason, ...extra });

  if (kind === 'restaurant') {
    const rest = RESTAURANT_BY_ID[id];
    if (!rest) return no('no_existe');
    if (state.restaurants.includes(id)) return no('ya_comprado');
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
export function nextGoal(state) {
  const level = levelFromXp(state.xp);
  const nextRest = RESTAURANTS.find((x) => !state.restaurants.includes(x.id));
  const learnable = RECIPES
    .filter((x) => !state.recipes.includes(x.id) && state.restaurants.includes(x.restaurant) && level >= x.reqLevel)
    .sort((a, b) => a.learnCost - b.learnCost)[0];
  const candidates = [];
  if (nextRest) candidates.push({ kind: 'restaurant', id: nextRest.id, name: `Abrir ${nextRest.name}`, price: nextRest.cost, reqLevel: nextRest.reqLevel });
  if (learnable) candidates.push({ kind: 'recipe', id: learnable.id, name: `Aprender ${learnable.name}`, price: learnable.learnCost, reqLevel: learnable.reqLevel });
  const affordable = candidates.filter((c) => level >= c.reqLevel);
  const pick = affordable.find((c) => c.kind === 'restaurant') ?? affordable[0] ?? candidates[0];
  if (!pick) return { kind: 'done', name: '¡Eres Chef Leyenda!', price: 0, reqLevel: 0 };
  return pick;
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
