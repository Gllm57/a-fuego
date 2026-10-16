import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, honestServes } from './helpers.js';
import { ordersForConfig } from '../../shared/index.js';

async function guest(call) {
  const res = await call('POST', '/api/v1/auth/guest');
  assert.equal(res.status, 200);
  return res.body;
}

test('crear invitado devuelve perfil inicial con bono de bienvenida', async () => {
  const { app, call } = await makeApp();
  const { token, profile } = await guest(call);
  assert.ok(token);
  assert.equal(profile.state.coins, 200);
  assert.equal(profile.state.inventory.harina_maiz, 18);
  assert.deepEqual(profile.state.restaurants, ['arepera']);
  const me = await call('GET', '/api/v1/me', { token });
  assert.equal(me.status, 200);
  const ledger = await call('GET', '/api/v1/me/ledger', { token });
  assert.equal(ledger.body.entries[0].reason, 'bono_bienvenida');
  await app.close();
});

test('sin token o con token falso: 401', async () => {
  const { app, call } = await makeApp();
  assert.equal((await call('GET', '/api/v1/me')).status, 401);
  assert.equal((await call('GET', '/api/v1/me', { token: 'abc.def' })).status, 401);
  await app.close();
});

test('compras: dinero insuficiente, éxito, libro contable e idempotencia', async () => {
  const { app, call } = await makeApp();
  const { token } = await guest(call);
  const tooExpensive = await call('POST', '/api/v1/shop/purchase', { token, body: { kind: 'upgrade', id: 'refri' } });
  assert.equal(tooExpensive.status, 409);
  assert.equal(tooExpensive.body.error.code, 'sin_dinero');

  app.service.db.run('UPDATE players SET coins = 1000');
  const headers = { 'idempotency-key': 'compra-cuchillos-1' };
  const a = await call('POST', '/api/v1/shop/purchase', { token, headers, body: { kind: 'upgrade', id: 'cuchillos' } });
  const b = await call('POST', '/api/v1/shop/purchase', { token, headers, body: { kind: 'upgrade', id: 'cuchillos' } });
  assert.equal(a.status, 200);
  assert.deepEqual(a.body, b.body);
  assert.equal(a.body.profile.state.coins, 700);
  assert.equal(a.body.profile.state.upgrades.cuchillos, 1);

  const bad = await call('POST', '/api/v1/shop/purchase', { token, body: { kind: 'upgrade', id: 'cuchillos', extra: 1 } });
  assert.equal(bad.status, 400);
  await app.close();
});

test('partida completa: valida, paga, es idempotente y aparece en el ranking', async () => {
  const { app, clock, call } = await makeApp();
  const { token } = await guest(call);
  const start = await call('POST', '/api/v1/runs', { token, body: { restaurantId: 'arepera' } });
  assert.equal(start.status, 201);
  const { runId, config } = start.body;
  const serves = honestServes(config);

  clock.t += config.durationMs + 3000;
  const done = await call('POST', `/api/v1/runs/${runId}/complete`, { token, body: { serves } });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.ok(done.body.result.coins > 0);
  // Primer servicio: se cobran los logros cumplidos (al menos «Primer servicio»).
  const logros = done.body.rewards.achievements;
  assert.ok(logros.some((x) => x.id === 'primer_servicio'));
  const premio = logros.reduce((a, x) => a + x.reward, 0);
  assert.equal(done.body.profile.state.coins, 200 + done.body.result.coins + premio);
  assert.equal(done.body.profile.state.stats.runs, 1);
  assert.deepEqual(done.body.profile.state.achievements, logros.map((x) => x.id));
  // La despensa se descontó.
  const used = done.body.result.used;
  for (const [ing, n] of Object.entries(used)) assert.equal(done.body.profile.state.inventory[ing] ?? 0, config.stock[ing] - n);
  const hist = await call('GET', '/api/v1/me/runs', { token });
  assert.equal(hist.body.entries.length, 1);

  const again = await call('POST', `/api/v1/runs/${runId}/complete`, { token, body: { serves } });
  assert.deepEqual(again.body, done.body);

  const board = await call('GET', '/api/v1/leaderboard/arepera', { token });
  assert.equal(board.body.entries[0].score, done.body.result.score);
  assert.equal(board.body.entries[0].me, true);
  await app.close();
});

test('no se puede enviar una partida antes de jugarla (reloj del servidor)', async () => {
  const { app, clock, call } = await makeApp();
  const { token } = await guest(call);
  const { body } = await call('POST', '/api/v1/runs', { token, body: { restaurantId: 'arepera' } });
  clock.t += 5000;
  const res = await call('POST', `/api/v1/runs/${body.runId}/complete`, { token, body: { serves: honestServes(body.config) } });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.details.reason, 'reloj');
  await app.close();
});

test('tramposos reincidentes quedan bloqueados', async () => {
  const { app, clock, call } = await makeApp({ maxCheatStrikes: 2 });
  const { token } = await guest(call);
  for (let i = 0; i < 2; i++) {
    const { body } = await call('POST', '/api/v1/runs', { token, body: { restaurantId: 'arepera' } });
    const o = ordersForConfig(body.config)[0];
    clock.t += body.config.durationMs;
    const res = await call('POST', `/api/v1/runs/${body.runId}/complete`, { token, body: { serves: [{ orderId: o.id, recipeId: o.recipeId, servedAt: o.arriveAt + 1 }] } });
    assert.equal(res.status, 422);
  }
  assert.equal((await call('GET', '/api/v1/me', { token })).status, 403);
  await app.close();
});

test('no se puede jugar en un restaurante cerrado', async () => {
  const { app, call } = await makeApp();
  const { token } = await guest(call);
  const res = await call('POST', '/api/v1/runs', { token, body: { restaurantId: 'izakaya' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'restaurante_cerrado');
  await app.close();
});

test('reto diario paga bono una sola vez', async () => {
  const { app, clock, call } = await makeApp();
  const { token } = await guest(call);
  let bonus = 0;
  for (let i = 0; i < 2; i++) {
    app.service.db.run('UPDATE inventory SET qty = 10');
    const { body } = await call('POST', '/api/v1/runs', { token, body: { mode: 'daily' } });
    clock.t += body.config.durationMs + 2000;
    const res = await call('POST', `/api/v1/runs/${body.runId}/complete`, { token, body: { serves: honestServes(body.config, { pace: 1500 }) } });
    assert.equal(res.status, 200);
    if (res.body.result.stars >= 2) bonus += res.body.rewards.dailyBonus;
  }
  assert.ok(bonus === 0 || bonus === 300);
  await app.close();
});

test('registro y login conservan la cuenta e invalidan el token de invitado', async () => {
  const { app, call } = await makeApp();
  const { token } = await guest(call);
  const reg = await call('POST', '/api/v1/auth/register', { token, body: { username: 'chef_ana', password: 'contraseña-segura' } });
  assert.equal(reg.status, 200);
  assert.equal((await call('GET', '/api/v1/me', { token })).status, 401);
  const bad = await call('POST', '/api/v1/auth/login', { body: { username: 'chef_ana', password: 'otra-cosa-123' } });
  assert.equal(bad.status, 401);
  const ok = await call('POST', '/api/v1/auth/login', { body: { username: 'chef_ana', password: 'contraseña-segura' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.profile.player.registered, true);
  await app.close();
});

test('mercado: comprar, canasta diaria y despensa llena', async () => {
  const { app, call } = await makeApp();
  const { token } = await guest(call);
  const m = await call('GET', '/api/v1/market', { token });
  assert.equal(m.status, 200);
  assert.equal(m.body.capacity, 60);
  assert.equal(m.body.used, 40);
  const price = m.body.items.find((i) => i.id === 'queso').price;
  const buy = await call('POST', '/api/v1/market/buy', { token, body: { items: { queso: 3 } } });
  assert.equal(buy.status, 200, JSON.stringify(buy.body));
  assert.equal(buy.body.profile.state.coins, 200 - price * 3);
  assert.equal(buy.body.profile.state.inventory.queso, 14);
  const full = await call('POST', '/api/v1/market/buy', { token, body: { items: { queso: 30 } } });
  assert.equal(full.body.error.code, 'despensa_llena');
  const notSold = await call('POST', '/api/v1/market/buy', { token, body: { items: { salmon: 1 } } });
  assert.equal(notSold.status, 400);
  const b1 = await call('POST', '/api/v1/market/basket', { token });
  assert.equal(b1.status, 200);
  const b2 = await call('POST', '/api/v1/market/basket', { token });
  assert.equal(b2.body.error.code, 'ya_reclamada');
  await app.close();
});

test('no se puede servir más de lo que hay en la despensa', async () => {
  const { app, clock, call } = await makeApp();
  const { token } = await guest(call);
  app.service.db.run('UPDATE inventory SET qty = 1');
  const { body } = await call('POST', '/api/v1/runs', { token, body: { restaurantId: 'arepera' } });
  clock.t += body.config.durationMs + 2000;
  const greedy = honestServes({ ...body.config, stock: undefined });
  assert.ok(greedy.length >= 2);
  const res = await call('POST', `/api/v1/runs/${body.runId}/complete`, { token, body: { serves: greedy } });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.details.reason, 'sin_ingredientes');
  await app.close();
});

test('personal: contratar por la API y sumar experiencia tras un servicio', async () => {
  const { app, clock, call } = await makeApp();
  const { token } = await guest(call);
  const low = await call('POST', '/api/v1/staff/hire', { token, body: { id: 'pepe' } });
  assert.equal(low.body.error.code, 'personal_bloqueado');
  app.service.db.run("INSERT INTO unlocks (player_id, kind, item_id, level, created_at) SELECT id, 'restaurant', 'diner', 1, 0 FROM players");
  app.service.db.run('UPDATE players SET xp = 100000');
  const poor = await call('POST', '/api/v1/staff/hire', { token, body: { id: 'pepe' } });
  assert.equal(poor.body.error.code, 'sin_dinero');
  app.service.db.run('UPDATE players SET coins = 5000');
  const ok = await call('POST', '/api/v1/staff/hire', { token, body: { id: 'pepe' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.profile.state.staff.hired, 'pepe');
  assert.equal(ok.body.profile.state.coins, 2000);
  const ledger = await call('GET', '/api/v1/me/ledger', { token });
  assert.ok(ledger.body.entries.some((e) => e.reason === 'contrato' && e.delta === -3000));
  const start = await call('POST', '/api/v1/runs', { token, body: { restaurantId: 'arepera' } });
  assert.equal(start.body.config.salary, 60);
  clock.t += start.body.config.durationMs + 3000;
  const done = await call('POST', `/api/v1/runs/${start.body.runId}/complete`, { token, body: { serves: [] } });
  assert.equal(done.status, 200);
  assert.equal(done.body.profile.state.staff.exp.pepe, 1);
  const fire = await call('POST', '/api/v1/staff/hire', { token, body: { id: null } });
  assert.equal(fire.body.profile.state.staff.hired, null);
  await app.close();
});

test('jugadores anteriores reciben la arepera gratis', async () => {
  const { app, call } = await makeApp();
  const { token } = await guest(call);
  app.service.db.run("DELETE FROM unlocks WHERE item_id IN ('arepera', 'arepa_queso', 'empanada')");
  app.service.db.run("INSERT INTO unlocks (player_id, kind, item_id, level, created_at) SELECT id, 'restaurant', 'taqueria', 1, 0 FROM players");
  const again = new app.service.constructor({ db: app.service.db, config: app.service.config, now: app.service.now });
  const pid = app.service.db.get('SELECT id FROM players').id;
  const st = again.state(pid);
  assert.deepEqual(st.restaurants, ['arepera', 'taqueria']);
  assert.ok(st.recipes.includes('arepa_queso'));
  await app.close();
});
