import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECIPES, RESTAURANTS, newPlayerState, buildRunConfig, ordersForConfig, scoreRun, RunValidationError,
  evaluatePurchase, applyGrants, kitchenStats, levelFromXp, xpForLevel, empireProgress, generateOrders,
  evaluateMarketBuy, marketPrices, applyInventory, dailyBasket, lineTotal, generateEvents, RECIPE_BY_ID,
  restockPlan, inventoryDelta, storageCapacity, inventoryCount, minPrepMs, nextGoal, UPGRADE_BY_ID, retiredRefund, groupsTogether, plateEarnings, GROUP_WINDOW_MS, TIER_PATIENCE, TIER_PACE, addRunToStats, pendingAchievements, achievementProgress
} from '../../shared/index.js';
import { honestServes } from './helpers.js';

const stocked = () => ({ ...newPlayerState(), inventory: { tortilla: 40, carne_res: 40, cebolla: 40, queso: 40 } });
const cfgFor = (state = stocked(), seed = 'semilla') => buildRunConfig(state, { restaurantId: 'taqueria', randomSeed: seed, day: '2026-10-15' });

test('el catálogo tiene 40 recetas, 8 por restaurante', () => {
  assert.equal(RECIPES.length, 40);
  for (const r of RESTAURANTS) assert.equal(RECIPES.filter((x) => x.restaurant === r.id).length, 8);
});

test('la generación de pedidos es determinista', () => {
  const c = cfgFor();
  assert.deepEqual(ordersForConfig(c), ordersForConfig(c));
  assert.notDeepEqual(ordersForConfig(c), ordersForConfig(cfgFor(stocked(), 'otra')));
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

test('las mejoras aceleran la cocina y las mesas crecen con el restaurante', () => {
  const base = kitchenStats({});
  const up = kitchenStats({ sarten: 4, cuchillos: 4, mesas: 2, ambiente: 4 }, 'cevicheria');
  assert.ok(up.seconds.freir < base.seconds.freir);
  assert.ok(up.taps.cortar < base.taps.cortar);
  assert.equal(base.slots, 3);
  assert.equal(up.slots, 5);
  assert.equal(kitchenStats({}, 'diner').slots, 4);
  assert.ok(up.patienceMult > base.patienceMult);
});

test('la economía exige dinero y nivel', () => {
  const s = newPlayerState();
  assert.equal(evaluatePurchase(s, 'restaurant', 'diner').reason, 'recetas_pendientes');
  assert.equal(evaluatePurchase({ ...s, recipes: RECIPES.filter((r) => r.restaurant === 'taqueria').map((r) => r.id) }, 'restaurant', 'diner').reason, 'nivel_insuficiente');
  assert.equal(evaluatePurchase({ ...s, xp: xpForLevel(3), recipes: RECIPES.filter((r) => r.restaurant === 'taqueria').map((r) => r.id) }, 'restaurant', 'diner').reason, 'sin_dinero');
  assert.equal(evaluatePurchase({ ...s, xp: xpForLevel(6), coins: 9000 }, 'restaurant', 'diner').reason, 'recetas_pendientes');
  const allTaco = RECIPES.filter((r) => r.restaurant === 'taqueria').map((r) => r.id);
  const rich = { ...s, xp: xpForLevel(3), coins: 5000, recipes: allTaco };
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
  s.upgrades = { cuchillos: 4, batidora: 4, sarten: 4, horno: 4, olla: 4, campana: 2, ambiente: 4, refri: 3, extra_tabla: 1, extra_bol: 1, extra_sarten: 1, extra_olla: 1, extra_horno: 1 };
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

test('no se puede cocinar sin ingredientes en la despensa', () => {
  const st = { ...newPlayerState(), inventory: { tortilla: 1, carne_res: 1, cebolla: 1, queso: 1 } };
  const c = cfgFor(st);
  const all = honestServes({ ...c, stock: undefined });
  assert.ok(all.length > 2);
  assert.throws(() => scoreRun(c, { serves: all }), (e) => e.reason === 'sin_ingredientes');
});

test('los gastos del local se descuentan y el resultado nunca es negativo', () => {
  const c = cfgFor();
  const res = scoreRun(c, { serves: honestServes(c) });
  assert.equal(res.upkeep, 60);
  assert.equal(res.coins, Math.max(0, res.gross - 60));
  assert.equal(scoreRun(c, { serves: [] }).coins, 0);
});

test('el desperdicio declarado se limita a lo que quedaba', () => {
  const c = cfgFor();
  const res = scoreRun(c, { serves: [], waste: { carne_res: 999 } });
  assert.equal(res.waste.carne_res, 40);
});

test('mercado: precios del día, ofertas, mayoreo y capacidad', () => {
  const p = marketPrices('2026-10-15');
  assert.deepEqual(p, marketPrices('2026-10-15'));
  assert.equal(Object.values(p).filter((x) => x.deal).length, 3);
  assert.equal(lineTotal(10, 10), 90);
  const s = { ...newPlayerState(), coins: 1000 };
  assert.equal(evaluateMarketBuy(s, { salmon: 1 }, '2026-10-15').reason, 'no_disponible');
  assert.equal(evaluateMarketBuy(s, { tortilla: 30 }, '2026-10-15').reason, 'despensa_llena');
  const ok = evaluateMarketBuy(s, { tortilla: 5 }, '2026-10-15');
  assert.ok(ok.ok);
  const after = applyInventory(s, ok.delta, ok.price);
  assert.equal(after.inventory.tortilla, 19);
  assert.equal(after.coins, 1000 - ok.price);
  assert.equal(evaluateMarketBuy({ ...s, coins: 0 }, { tortilla: 5 }, '2026-10-15').reason, 'sin_dinero');
});

test('canasta diaria respeta la capacidad', () => {
  const s = newPlayerState();
  const b = dailyBasket('2026-10-15', s);
  assert.ok(Object.values(b.items).reduce((a, n) => a + n, 0) <= 12);
  const full = { ...s, inventory: { tortilla: 60 } };
  assert.deepEqual(dailyBasket('2026-10-15', full).items, {});
});

test('los críticos VIP pagan más y hay eventos de fuego', () => {
  const c = cfgFor();
  const orders = ordersForConfig(c);
  const vip = orders.find((o) => o.vip);
  if (vip) {
    const normal = orders.find((o) => !o.vip && o.recipeId === vip.recipeId);
    if (normal) assert.ok(vip.patienceMs < normal.patienceMs);
  }
  assert.ok(generateEvents({ seed: 'x', durationMs: 120000 }).length >= 1);
});

test('pedido urgente: amplía la despensa, cuesta el doble y tiene límite', () => {
  const st = { ...newPlayerState(), inventory: { tortilla: 1, carne_res: 1, cebolla: 1, queso: 1 } };
  const c = cfgFor(st);
  const all = honestServes({ ...c, stock: { tortilla: 4, carne_res: 4, cebolla: 4, queso: 4 } });
  const emergency = { tortilla: 3, carne_res: 3, cebolla: 3, queso: 3 };
  const res = scoreRun(c, { serves: all, emergency });
  const cost = Object.entries(emergency).reduce((a, [ing, n]) => a + c.emergencyPrices[ing] * n, 0);
  assert.equal(res.emergencyCost, cost);
  assert.equal(res.coins, Math.max(0, res.gross - res.upkeep - cost));
  assert.throws(() => scoreRun(c, { serves: [], emergency: { tortilla: 13 } }), (e) => e.reason === 'urgente_excedido');
  assert.throws(() => scoreRun(c, { serves: [], emergency: { salmon: 1 } }), (e) => e.reason === 'urgente_invalido');
  const delta = inventoryDelta(res);
  for (const ing of Object.keys(emergency)) assert.ok(delta[ing] <= emergency[ing]);
});

test('surtir: el plan cubre el menú sin pasarse de la capacidad', () => {
  const s = { ...newPlayerState(), inventory: {} };
  const plan = restockPlan(s, 'taqueria', 10);
  assert.ok(Object.keys(plan).length >= 4);
  assert.ok(inventoryCount(plan) <= storageCapacity(s.upgrades));
  const full = { ...s, inventory: { tortilla: 60 } };
  assert.deepEqual(restockPlan(full, 'taqueria', 10), {});
});

test('equipo extra: exige nivel y permite cocinar en paralelo', () => {
  const s = { ...newPlayerState(), coins: 10000 };
  assert.equal(evaluatePurchase(s, 'upgrade', 'extra_olla').reason, 'nivel_insuficiente');
  const lvl6 = { ...s, xp: xpForLevel(6) };
  const d = evaluatePurchase(lvl6, 'upgrade', 'extra_olla');
  assert.ok(d.ok);
  const after = applyGrants(lvl6, d.price, d.grants);
  assert.equal(evaluatePurchase(after, 'upgrade', 'extra_olla').reason, 'nivel_maximo');
  const one = kitchenStats({});
  const two = kitchenStats({ extra_olla: 1 });
  assert.equal(one.stations.olla, 1);
  assert.equal(two.stations.olla, 2);
  // Ají de gallina lleva 3 cosas hervidas: con dos ollas el mínimo baja.
  assert.ok(minPrepMs(two, 'aji_gallina') < minPrepMs(one, 'aji_gallina'));
});

test('la siguiente meta guía a completar el recetario antes de abrir otro local', () => {
  const s = { ...newPlayerState(), xp: xpForLevel(6) };
  const g = nextGoal(s);
  assert.equal(g.kind, 'recipe');
  assert.equal(RECIPES.find((r) => r.id === g.id).restaurant, 'taqueria');
  const all = { ...s, recipes: RECIPES.filter((r) => r.restaurant === 'taqueria').map((r) => r.id) };
  assert.deepEqual([nextGoal(all).kind, nextGoal(all).id], ['restaurant', 'diner']);
});

test('las mesas extra ya no se venden y se reembolsan', () => {
  assert.equal(UPGRADE_BY_ID.mesas, undefined);
  assert.equal(retiredRefund('mesas', 2), 6500);
  assert.equal(retiredRefund('mesas', 0), 0);
});

test('grupos: llegan juntos en locales de 4+ mesas y pagan bono si comen a la vez', () => {
  const s = newPlayerState();
  s.restaurants = ['taqueria', 'diner'];
  s.recipes = RECIPES.filter((r) => r.restaurant === 'diner').map((r) => r.id);
  s.xp = 1e6;
  s.inventory = { pan: 20, carne_res: 20 };
  let found = null;
  for (let i = 0; i < 40 && !found; i++) {
    const cfg = buildRunConfig(s, { restaurantId: 'diner', randomSeed: `g${i}`, day: '2026-10-16' });
    const orders = ordersForConfig(cfg);
    const g = orders.find((o) => o.group != null && o.group !== o.id);
    if (g) found = { cfg, orders, a: orders[g.group], b: g };
  }
  assert.ok(found, 'debería haber algún grupo');
  assert.equal(found.b.arriveAt - found.a.arriveAt, 400);
  const taq = buildRunConfig({ ...s, restaurants: ['taqueria'], recipes: newPlayerState().recipes, inventory: newPlayerState().inventory }, { restaurantId: 'taqueria', randomSeed: 'g1', day: '2026-10-16' });
  assert.ok(ordersForConfig(taq).every((o) => o.group == null), 'la taquería (3 mesas) no tiene grupos');

  const { a, b } = found;
  const both = new Map([[a.id, 30_000], [b.id, 35_000]]);
  assert.equal(groupsTogether(found.orders, both).count, 1);
  const apart = new Map([[a.id, 30_000], [b.id, 30_000 + GROUP_WINDOW_MS + 1]]);
  assert.equal(groupsTogether(found.orders, apart).count, 0);
  const rec = RECIPE_BY_ID[a.recipeId];
  const solo = plateEarnings(a, rec, a.arriveAt + 5000, 0, 1, found.cfg.stats, false).earned;
  const juntos = plateEarnings(a, rec, a.arriveAt + 5000, 0, 1, found.cfg.stats, true).earned;
  assert.ok(juntos > solo);
});

test('el diner es más exigente que la taquería', () => {
  assert.ok(TIER_PATIENCE[1] <= 0.9);
  assert.ok(TIER_PACE[1] < 0.94);
});

test('logros: contadores y cobro una sola vez', () => {
  const s = newPlayerState();
  const result = { served: 12, vipServed: 1, firesOut: 2, groupsServed: 1, perfects: 5, stars: 3, missed: 0, bestCombo: 9 };
  s.stats = addRunToStats(s.stats, result);
  const ids = pendingAchievements(s).map((x) => x.id);
  assert.deepEqual(ids.sort(), ['combo_8', 'primer_servicio', 'sin_enojos', 'tres_estrellas'].sort());
  s.achievements = ids;
  assert.equal(pendingAchievements(s).length, 0);
  assert.equal(achievementProgress(s).find((x) => x.id === 'platos_50').value, 12);
});
