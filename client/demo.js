// Demo independiente: el nivel más difícil del juego.
// Cevichería El Muelle (último restaurante), sus 8 recetas, sin ninguna mejora de
// cocina y con el ritmo del reto diario. Todo corre en el navegador.

import {
  RESTAURANT_BY_ID, RESTAURANTS, recipesOf, buildRunConfig, scoreRun, kitchenStats, rushWindow, generateEvents,
  ordersForConfig, todayUTC, RECIPE_BY_ID, newPlayerState
} from './shared/index.js';
import { Kitchen } from './game.js';
import { coinSvg, starSvg, icon, ingredientSvg, customerSvg } from './art.js';
import { countUp, confetti, escapeHtml, fmt } from './ui.js';
import { sfx } from './audio.js';

const REST = RESTAURANT_BY_ID.cevicheria;
const root = document.getElementById('app');
let attempt = 0;
let best = 0;

function hardestState() {
  const recipes = recipesOf(REST.id).map((r) => r.id);
  const inventory = {};
  for (const id of recipes) for (const c of RECIPE_BY_ID[id].components) inventory[c.ingredient] = 8;
  return {
    ...newPlayerState(),
    xp: 999_999,
    restaurants: RESTAURANTS.map((r) => r.id),
    recipes,
    upgrades: {},
    inventory
  };
}

function hardestConfig() {
  const state = hardestState();
  const cfg = buildRunConfig(state, { restaurantId: REST.id, randomSeed: `pesadilla-${Date.now()}-${attempt}`, day: todayUTC() });
  // Ritmo del reto diario (el más rápido del juego) en el restaurante más exigente.
  return { ...cfg, mode: 'daily', day: null };
}

function applyTheme() {
  const t = REST.theme;
  const r = document.documentElement.style;
  r.setProperty('--brand', t.primary);
  r.setProperty('--brand-deep', t.deep);
  r.setProperty('--brand-soft', t.soft);
  r.setProperty('--ground', t.ground);
}

function intro() {
  const cfg = hardestConfig();
  const orders = ordersForConfig(cfg);
  const easy = buildRunConfig(newPlayerState(), { restaurantId: 'taqueria', randomSeed: 'comparar', day: todayUTC() });
  const easyOrders = ordersForConfig(easy);
  const avgPatience = (os) => os.reduce((a, o) => a + o.patienceMs, 0) / os.length / 1000;
  const fires = generateEvents({ seed: cfg.seed, durationMs: cfg.durationMs, tier: cfg.tier }).length;
  const rush = rushWindow(cfg.seed, cfg.durationMs);
  const stats = kitchenStats({});
  const recipes = recipesOf(REST.id);
  root.innerHTML = `
    <div class="results" style="justify-content:flex-start">
      <div class="results__kicker">PRUEBA · NIVEL MÁXIMO</div>
      <h1>${REST.name}</h1>
      <p class="note" style="color:#EADBD0;text-align:center;max-width:330px">El último restaurante de la cadena, con el ritmo del reto del día y <strong>sin ninguna mejora de cocina</strong>. Así se siente el final del juego.</p>
      <div class="bubbles">
        <div><b>${orders.length}</b><span>clientes</span></div>
        <div><b>${orders.filter((o) => o.vip).length}</b><span>críticos</span></div>
        <div><b>${fires}</b><span>incendios</span></div>
        <div><b>${stats.slots}</b><span>mesas</span></div>
      </div>
      <div class="ticket">
        <div class="ticket__row"><span>Paciencia media del cliente</span><b class="neg">${avgPatience(orders).toFixed(0)} s <small class="note">(taquería: ${avgPatience(easyOrders).toFixed(0)} s)</small></b></div>
        <div class="ticket__row"><span>Clientes en 1:30</span><b class="neg">${orders.length} <small class="note">(taquería: ${easyOrders.length})</small></b></div>
        <div class="ticket__row"><span>Ingredientes por plato</span><b>3 a 5</b></div>
        <div class="ticket__row"><span>Hora pico</span><b>${Math.round(rush.from / 1000)}–${Math.round(rush.to / 1000)} s</b></div>
        <div class="ticket__row"><span>Se quema en</span><b class="neg">${stats.burnSeconds.freir} s</b></div>
        <div class="ticket__row"><span>Gastos del local</span><b class="neg">−${fmt(REST.upkeep)}</b></div>
        <div class="ticket__row"><span>Despensa</span><b>8 de cada ingrediente</b></div>
      </div>
      <div class="section-title" style="width:100%;margin:0"><h2 style="color:#fff;font-size:18px">El menú</h2></div>
      <div class="comp-list" style="justify-content:center">${recipes.map((r) => `<span class="comp" style="background:rgba(255,255,255,.92)">${ingredientSvg(r.components[0].ingredient, { title: '' })}${escapeHtml(r.name)} · ${r.components.length}</span>`).join('')}</div>
      ${best ? `<div class="bonus-line">${icon('trophy')} Tu mejor ganancia aquí: ${fmt(best)}</div>` : ''}
      <div class="results__actions">
        <button class="btn btn--xl btn--gold btn--shine" data-act="go">${icon('fire')} Entrar a la cocina</button>
      </div>
    </div>`;
  root.querySelector('[data-act="go"]').addEventListener('click', () => { sfx.tap(); play(cfg); });
}

function play(config) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const kitchen = new Kitchen(host, {
    config,
    restaurant: REST,
    firstTime: attempt === 0,
    onQuit: () => { host.remove(); intro(); },
    onFinish: (outcome) => {
      let result = null;
      let error = null;
      try {
        result = scoreRun(config, { serves: outcome.serves, waste: outcome.waste, emergency: outcome.emergency });
      } catch (err) {
        error = err.reason ?? err.message;
        window.__lastRun = JSON.stringify({ config, outcome, error, detail: err.detail });
      }
      kitchen.destroy();
      host.remove();
      attempt += 1;
      results(result, error);
    }
  });
  kitchen.mount();
}

const HEAD = ['La cocina te ganó', 'Sobreviviste', '¡Gran servicio!', '¡Chef Leyenda!'];

function results(r, error) {
  if (!r) {
    root.innerHTML = `<div class="results"><h1>No se pudo calcular el servicio</h1><p class="note" style="color:#EADBD0">${escapeHtml(String(error))}</p><div class="results__actions"><button class="btn btn--xl" data-act="again">Intentar de nuevo</button></div></div>`;
    root.querySelector('[data-act="again"]').addEventListener('click', () => play(hardestConfig()));
    return;
  }
  best = Math.max(best, r.coins);
  root.innerHTML = `
    <div class="results">
      <div class="results__kicker">NIVEL MÁXIMO · INTENTO ${attempt}</div>
      <h1>${HEAD[r.stars]}</h1>
      <div class="stars">${[0, 1, 2].map((i) => starSvg(`star ${i < r.stars ? 'is-on' : ''}`)).join('')}</div>
      <div class="results__coins">${coinSvg()}<span data-count>0</span></div>
      <div class="results__label">GANANCIA NETA</div>
      <div class="bubbles">
        <div><b>${r.served}/${r.totalOrders}</b><span>clientes</span></div>
        <div><b>${r.vipServed}/${r.vipTotal}</b><span>críticos</span></div>
        <div><b>×${r.bestCombo}</b><span>combo</span></div>
        <div><b>${r.missed}</b><span>se fueron</span></div>
      </div>
      <div class="ticket">
        <div class="ticket__row"><span>Ventas y propinas</span><b class="pos">+${fmt(r.gross)}</b></div>
        <div class="ticket__row"><span>Gastos del local</span><b class="neg">−${fmt(r.upkeep)}</b></div>
        ${r.emergencyCost ? `<div class="ticket__row"><span>Pedidos urgentes</span><b class="neg">−${fmt(r.emergencyCost)}</b></div>` : ''}
        <div class="ticket__row is-total"><span>Ganancia</span><b>${fmt(r.coins)}</b></div>
      </div>
      <div class="review"><span class="review__face">${customerSvg(2, r.stars >= 2 ? 'happy' : r.stars === 1 ? 'worried' : 'angry', '', true)}</span>
        <div><small>El crítico gastronómico dice</small><p>“${r.stars === 3 ? 'Impecable. Esta cocina merece todas las estrellas.' : r.stars === 2 ? 'Muy bien, aunque el ceviche tardó un suspiro de más.' : r.stars === 1 ? 'Sabroso, pero aquí el tiempo manda. Vuelva a intentarlo.' : 'Me fui antes del primer bocado.'}”</p></div></div>
      <div class="results__actions">
        <button class="btn btn--xl" data-act="again">Intentar de nuevo</button>
        <button class="btn btn--ghost btn--wide" data-act="intro">Ver los datos del nivel</button>
      </div>
    </div>`;
  countUp(root.querySelector('[data-count]'), r.coins, { ms: 1300 });
  for (let i = 0; i < r.stars; i++) setTimeout(() => sfx.star(i), 350 * i + 100);
  if (r.stars === 3) confetti(root.querySelector('.results'), [REST.theme.primary, '#FFC23D', '#fff']);
  root.querySelector('[data-act="again"]').addEventListener('click', () => play(hardestConfig()));
  root.querySelector('[data-act="intro"]').addEventListener('click', intro);
}

applyTheme();
intro();
