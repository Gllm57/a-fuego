import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECIPES, RESTAURANTS, newPlayerState, buildRunConfig, ordersForConfig, scoreRun, RunValidationError,
  evaluatePurchase, applyGrants, kitchenStats, levelFromXp, xpForLevel, empireProgress, generateOrders
} from '../../shared/index.js';
import { honestServes } from './helpers.js';

const cfgFor = (state = newPlayerState(), seed = 'semilla') => buildRunConfig(state, { restaurantId: 'taqueria', randomSeed: seed });

test('el catálogo tiene 40 recetas, 8 por restaurante', () => {
  assert.equal(RECIPES.length, 40);
  for (const r of RESTAURANTS) assert.equal(RECIPES.filter((x) => x.restaurant === r.id).length, 8);
});

test('la generación de pedidos es determinista', () => {
  const c = cfgFor();
  assert.deepEqual(ordersForConfig(c), ordersForConfig(c));
  assert.notDeepEqual(ordersForConfig(c), ordersForConfig(cfgFor(newPlayerState(), 'otra')));
});

test('un jugador honesto obtiene monedas y estrellas', () => {
  const c = cfgFor();
  const res = scoreRun(c, { serves: honestServes(c) });
  assert.ok(res.served > 5);
  assert.ok(res.coins > 0);
  assert.ok(res.stars >= 1);
});

test('una partida vacía es válida y no paga', () => {
  const res = scoreRun(cfgFor(), { serves: [] });
  assert.equal(res.coins, 0);
  assert.equal(res.stars, 0);
});

const rejects = (c, serves, reason) => assert.throws(() => scoreRun(c, { serves }), (e) => e instanceof RunValidationError && e.reason === reason);

test('rechaza platos servidos más rápido de lo posible', () => {
  const c = cfgFor();
  const o = ordersForConfig(c)[1];
  rejects(c, [{ orderId: o.id, recipeId: o.recipeId, servedAt: o.arriveAt + 10 }], 'demasiado_rapido');
});

test('rechaza pedidos duplicados, inexistentes y recetas cambiadas', () => {
  const c = cfgFor();
  const [s] = honestServes(c);
  rejects(c, [s, s], 'pedido_duplicado');
  rejects(c, [{ ...s, orderId: 999 }], 'pedido_inexistente');
  rejects(c, [{ ...s, recipeId: 'lomo' }], 'receta_no_coincide');
  rejects(c, [{ ...s, perfects: 9 }], 'perfectos_invalidos');
});

test('rechaza servir a un cliente que ya se fue', () => {
  const c = cfgFor();
  const o = ordersForConfig(c)[0];
  rejects(c, [{ orderId: o.id, recipeId: o.recipeId, servedAt: o.arriveAt + o.patienceMs + 1 }], 'cliente_ya_se_fue');
});

test('rechaza servir a un cliente que todavía no estaba sentado', () => {
  const c = cfgFor();
  const orders = ordersForConfig(c);
  // Llegan varios clientes y nadie atiende a los primeros: el 4.º no tiene mesa.
  const t = orders[3].arriveAt + 20000;
  const o = orders[3];
  const stillSeated = orders.slice(0, 3).every((x) => x.arriveAt + x.patienceMs >= t);
  if (stillSeated) rejects(c, [{ orderId: o.id, recipeId: o.recipeId, servedAt: t }], 'cliente_no_sentado');
});

test('las mejoras aceleran la cocina y añaden mesas', () => {
  const base = kitchenStats({});
  const up = kitchenStats({ sarten: 4, cuchillos: 4, mesas: 2, ambiente: 4 });
  assert.ok(up.seconds.freir < base.seconds.freir);
  assert.ok(up.taps.cortar < base.taps.cortar);
  assert.equal(up.slots, base.slots + 2);
  assert.ok(up.patienceMult > base.patienceMult);
});

test('la economía exige dinero y nivel', () => {
  const s = newPlayerState();
  assert.equal(evaluatePurchase(s, 'restaurant', 'diner').reason, 'nivel_insuficiente');
  assert.equal(evaluatePurchase({ ...s, xp: xpForLevel(3) }, 'restaurant', 'diner').reason, 'sin_dinero');
  const rich = { ...s, xp: xpForLevel(3), coins: 5000 };
  const d = evaluatePurchase(rich, 'restaurant', 'diner');
  assert.ok(d.ok);
  const after = applyGrants(rich, d.price, d.grants);
  assert.equal(after.coins, 2500);
  assert.ok(after.recipes.includes('hamburguesa'));
  assert.equal(evaluatePurchase(after, 'restaurant', 'diner').reason, 'ya_comprado');
  assert.equal(evaluatePurchase(s, 'recipe', 'lomo').reason, 'restaurante_cerrado');
});

test('el imperio llega al 100 % con todo comprado', () => {
  const s = newPlayerState();
  s.restaurants = RESTAURANTS.map((r) => r.id);
  s.recipes = RECIPES.map((r) => r.id);
  s.upgrades = { cuchillos: 4, batidora: 4, sarten: 4, horno: 4, olla: 4, campana: 2, ambiente: 4, mesas: 2 };
  const e = empireProgress(s);
  assert.equal(e.percent, 100);
  assert.equal(e.title, 'Chef Leyenda');
});

test('niveles de chef', () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(xpForLevel(5)), 5);
  assert.equal(levelFromXp(xpForLevel(5) - 1), 4);
});

test('generateOrders exige menú', () => {
  assert.throws(() => generateOrders({ seed: 'x', menu: [], durationMs: 1000, stats: kitchenStats() }));
});
