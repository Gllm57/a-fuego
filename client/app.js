// Aplicación: pantallas, navegación y flujo de partidas.

import {
  RESTAURANTS, RESTAURANT_BY_ID, facadeStage, facadeNext, FACADE_STAGES, RECIPES, RECIPE_BY_ID, UPGRADES, INGREDIENTS, PROCESSES,
  recipesOf, kitchenStats, upgradeLevel, storageCapacity, inventoryCount, lineTotal, recipeIngredients, menuFor, restockPlan,
  evaluatePurchase, previousRestaurant, recipeProgress, ACHIEVEMENTS, achievementProgress, STAFF, STAFF_BY_ID, STAFF_RANKS, STATIONS, staffRank, rankName, staffOwned, DECOR, DECOR_BY_ID, DECOR_SLOTS, decorOf, decorOwned, decorAvailable, ACHIEVEMENT_BY_ID, TIER_GROUP_CHANCE, GROUP_WINDOW_MS, GROUP_BONUS
} from './shared/index.js';
import { createApi, ApiError, SANDBOX } from './api.js';
import { Kitchen } from './game.js';
import { sfx } from './audio.js';
import { prefTilesHtml, bindPrefTiles } from './prefs-ui.js';
import { lightsHtml, decoHtml } from './decor-art.js';
import { storefrontSvg, obraSvg } from './facades.js';
import { ingredientSvg, processSvg, icon, coinSvg, starSvg, panLogoSvg, UPGRADE_ICONS, customerSvg, plateSvgItems, staffSvg } from './art.js';
import { toast, openSheet, countUp, confetti, escapeHtml, fmt } from './ui.js';

const app = {
  api: null,
  profile: null,
  market: null,
  cart: {},
  tab: 'home',
  restaurantId: localGet('afuego.restaurant') ?? (SANDBOX ? 'cevicheria' : 'arepera'),
  recipeTab: null,
  boardTab: null,
  busy: false
};

const root = document.getElementById('app');

boot();

// Instalable y jugable sin conexión (se ignora donde no hay service workers).
if (!SANDBOX && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

async function boot() {
  root.innerHTML = `<div class="boot">${panLogoSvg()}<div class="boot__logo">¡A Fuego!</div><div class="boot__text">Encendiendo los fogones…</div></div>`;
  try {
    app.api = await createApi();
    app.profile = await app.api.init();
  } catch (err) {
    root.innerHTML = `<div class="boot">${panLogoSvg()}<div class="boot__text">No pudimos abrir la cocina: ${escapeHtml(err.message)}</div><button class="btn" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  if (!app.profile.state.restaurants.includes(app.restaurantId)) app.restaurantId = app.profile.state.restaurants[0];
  renderShell();
}

// ── Utilidades ──────────────────────────────────────────────
function localGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localSet(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }
const st = () => app.profile.state;
const level = () => app.profile.level.level;

function applyTheme(restaurantId) {
  const t = RESTAURANT_BY_ID[restaurantId].theme;
  const r = document.documentElement.style;
  r.setProperty('--brand', t.primary);
  r.setProperty('--brand-deep', t.deep);
  r.setProperty('--brand-soft', t.soft);
  r.setProperty('--ground', t.ground);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.primary);
}

function setProfile(next) {
  const prevCoins = app.profile?.state.coins ?? 0;
  app.profile = next;
  renderHeaderBar();
  if (next.state.coins !== prevCoins) {
    const pill = document.querySelector('.coin-pill');
    if (pill) { pill.classList.remove('is-bump'); void pill.offsetWidth; pill.classList.add('is-bump'); }
    const num = document.querySelector('.coin-pill__num');
    if (num) countUp(num, next.state.coins, { from: prevCoins, ms: 700 });
  }
}

function errorToast(err) {
  sfx.error();
  toast(err instanceof ApiError ? err.message : 'Algo salió mal', 'bad');
}

// Cuántos platos del menú alcanzan con la despensa (aprox., atendiendo de forma pareja).
function dishesPossible(state, restaurantId) {
  const menu = menuFor(state, restaurantId).map((id) => recipeIngredients(RECIPE_BY_ID[id]));
  const inv = { ...state.inventory };
  let count = 0;
  for (let guard = 0; guard < 200; guard++) {
    const doable = menu.find((need) => Object.entries(need).every(([ing, n]) => (inv[ing] ?? 0) >= n));
    if (!doable) break;
    for (const [ing, n] of Object.entries(doable)) inv[ing] -= n;
    count++;
    menu.push(menu.shift());
  }
  return count;
}

// ── Estructura ──────────────────────────────────────────────
const TABS = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'market', label: 'Mercado', icon: 'market' },
  { id: 'recipes', label: 'Recetas', icon: 'book' },
  { id: 'upgrades', label: 'Mejoras', icon: 'tools' }
];
const PAGES = {
  home: { title: null },
  market: { title: 'Mercado', sub: 'Precios de hoy · cambian cada día' },
  recipes: { title: 'Recetario', sub: `${RECIPES.length} recetas de ${RESTAURANTS.length} cocinas del mundo` },
  upgrades: { title: 'Mejoras', sub: 'Aplican a todos tus locales' },
  diary: { title: 'Diario de caja', sub: 'Logros, ganancias y gastos de tus servicios', back: 'home' },
  ranking: { title: 'Ranking semanal', sub: 'Mejor servicio de la semana', back: 'home' },
  decor: { title: 'Mi local', sub: 'Decora tu restaurante · sólo cambia cómo se ve', back: 'home' }
};

function renderShell() {
  applyTheme(app.restaurantId);
  root.innerHTML = `
    <header class="awning awning--stripes"></header>
    <main class="screen" id="screen" tabindex="-1"></main>
    <nav class="nav" aria-label="Secciones">
      ${TABS.slice(0, 2).map(navBtn).join('')}
      <button class="fire-btn" data-act="play" aria-label="Abrir servicio">${icon('fire')}</button>
      ${TABS.slice(2).map(navBtn).join('')}
    </nav>`;
  root.querySelector('.nav').addEventListener('click', (e) => {
    if (e.target.closest('[data-act="play"]')) return play(app.restaurantId, 'normal');
    const b = e.target.closest('[data-tab]');
    if (b && b.dataset.tab !== app.tab) { sfx.tap(); go(b.dataset.tab); }
  });
  go(app.tab);
}

function navBtn(t) {
  return `<button class="nav__btn" data-tab="${t.id}">${icon(t.icon)}${t.label}<span class="nav__dot" hidden></span></button>`;
}

function go(tab) {
  app.tab = tab;
  if (tab !== 'market') {
    root.querySelector('.cart-bar')?.remove();
    document.getElementById('screen')?.classList.remove('has-cart');
  }
  const navTab = PAGES[tab].back ?? tab;
  root.querySelectorAll('.nav__btn').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === navTab ? 'page' : 'false'));
  renderHeaderBar();
  const screen = document.getElementById('screen');
  screen.style.animation = 'none'; void screen.offsetWidth; screen.style.animation = '';
  screen.scrollTop = 0;
  ({ home: renderHome, market: renderMarket, recipes: renderRecipes, upgrades: renderUpgrades, diary: renderDiary, ranking: renderRanking, decor: renderDecor })[tab]();
  renderNavDots();
}

function renderNavDots() {
  const s = st();
  const canLearn = RECIPES.some((r) => !s.recipes.includes(r.id) && s.restaurants.includes(r.restaurant) && level() >= r.reqLevel && s.coins >= r.learnCost);
  const canUpgrade = UPGRADES.some((u) => {
    const l = upgradeLevel(s.upgrades, u.id);
    return l < u.costs.length && s.coins >= u.costs[l] && level() >= (u.reqLevels?.[l] ?? 1);
  });
  const lowStock = dishesPossible(s, app.restaurantId) < 4 || s.basketClaimed !== app.profile.daily.day;
  const set = (id, on) => { const d = root.querySelector(`[data-tab="${id}"] .nav__dot`); if (d) d.hidden = !on; };
  set('recipes', canLearn);
  const canHire = STAFF.some((m) => { const x = staffState(s, m); return !x.owned && x.unlocked && s.coins >= m.hireCost; });
  set('upgrades', canUpgrade || canHire);
  set('market', lowStock);
}

function renderHeaderBar() {
  const bar = root.querySelector('.awning');
  if (!bar) return;
  const { level: lvl } = app.profile;
  const pct = Math.round((lvl.current / lvl.needed) * 100);
  const page = PAGES[app.tab];
  bar.innerHTML = `
    <div class="topbar">
      ${page.back ? `<button class="back-btn" data-act="back" aria-label="Volver">${icon('back')}</button>` : ''}
      <button class="chef-btn" data-act="profile" aria-label="Perfil y ajustes">
        <span class="ring" style="--p:${pct}"><span class="ring__inner">${lvl.level}</span></span>
        <span style="min-width:0">
          <span class="chef-btn__name">${escapeHtml(app.profile.player.displayName)}</span>
          <span class="chef-btn__title">${SANDBOX ? 'Modo prueba · ' : ''}${app.profile.empire.title}</span>
        </span>
      </button>
      <div class="coin-pill" aria-label="${SANDBOX ? 'Monedas infinitas' : 'Monedas'}">${coinSvg()}<span class="coin-pill__num">${SANDBOX ? '∞' : fmt(st().coins)}</span></div>
    </div>
    ${page.title ? `<div class="page-head"><div><h1>${page.title}</h1><p>${page.sub}</p></div></div>` : ''}`;
  bar.querySelector('[data-act="profile"]').addEventListener('click', openProfile);
  bar.querySelector('[data-act="back"]')?.addEventListener('click', () => go(page.back));
  if (root.querySelector('.nav')) renderNavDots();
}

// ── Inicio ──────────────────────────────────────────────────
function renderHome() {
  const s = st();
  const { empire, nextGoal: goal, daily } = app.profile;
  const rest = RESTAURANT_BY_ID[app.restaurantId];
  const goalPct = goal.price > 0 ? Math.min(100, Math.round((s.coins / goal.price) * 100)) : 100;
  const goalNote = goal.kind === 'done' ? '¡Lo lograste!' : level() < goal.reqLevel
    ? `Requiere nivel ${goal.reqLevel} · ${fmt(goal.price)} monedas`
    : `${fmt(Math.min(s.coins, goal.price))} / ${fmt(goal.price)} monedas`;
  const dailyRest = RESTAURANT_BY_ID[daily.restaurantId];
  const dishes = dishesPossible(s, app.restaurantId);
  const used = inventoryCount(s.inventory);
  const cap = storageCapacity(s.upgrades);

  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div class="stagger" style="display:flex;flex-direction:column;gap:18px">
      <section class="card blob empire" aria-label="Tu imperio">
        <span class="ring empire__ring" style="--p:${empire.percent}"><span class="ring__inner"><b>${empire.percent}%</b><small>IMPERIO</small></span></span>
        <div>
          <div class="empire__kicker">TU CADENA ¡A FUEGO!</div>
          <h1 class="empire__title">${empire.title}</h1>
          <div class="empire__stats">
            <span class="pill">${icon('store', 'style="width:14px;height:14px"')} ${empire.restaurants}/${empire.restaurantsTotal}</span>
            <span class="pill">${icon('book', 'style="width:14px;height:14px"')} ${empire.recipes}/${empire.recipesTotal}</span>
            <span class="pill">Nv. ${level()}</span>
          </div>
        </div>
        <button class="goal" data-act="goal">
          <span class="goal__icon">${icon('flag')}</span>
          <span class="goal__body">
            <span class="goal__label">SIGUIENTE META · ${escapeHtml(goal.name)}</span>
            <span class="progress"><span class="progress__fill" style="width:${goalPct}%"></span></span>
            <span class="goal__label" style="letter-spacing:0">${goalNote}</span>
          </span>
        </button>
      </section>

      <button class="play-cta" data-act="play">
        <span class="play-cta__text"><b>Abrir servicio</b><span>${escapeHtml(rest.name)} · alcanza para ~${dishes} platos</span></span>
        <span class="play-cta__icon">${icon('play')}</span>
      </button>
      ${dishes < 4 ? `<button class="card basket" data-act="to-market" style="border:0;cursor:pointer;text-align:left;font:inherit;color:inherit">
        <span class="basket__icon" style="background:var(--warn)">${icon('market')}</span>
        <span class="basket__body"><b>Tu despensa está casi vacía</b><span>${used}/${cap} ingredientes. Toca para surtir en el mercado.</span></span>
        ${icon('arrow', 'style="width:22px;height:22px;flex-shrink:0"')}
      </button>` : ''}

      <div class="section-title"><h2>Tus restaurantes</h2><span>Desliza →</span></div>
      <div class="rest-scroller" role="list">${RESTAURANTS.map((r, i) => restaurantCard(r, i)).join('')}</div>

      <div class="tiles">
        <button class="tile tile--daily" data-act="daily" ${daily.claimed ? 'disabled' : ''}>
          <span class="tile__icon">${icon('clock')}</span>
          <b>Reto del día</b>
          <span>2★ en ${escapeHtml(dailyRest.name)}</span>
          ${daily.claimed ? `<span class="done-badge">✓ Completado</span>` : `<span class="recipe__price">${coinSvg()} +${fmt(daily.reward)}</span>`}
        </button>
        <button class="tile" data-act="decor">
          <span class="tile__icon">${icon('sparkle')}</span>
          <b>Mi local</b>
          <span>Toldo, pared, luces y adornos</span>
        </button>
        <button class="tile" data-act="diary">
          <span class="tile__icon">${icon('journal')}</span>
          <b>Diario y logros</b>
          <span>${achievementProgress(s).filter((x) => x.done).length}/${ACHIEVEMENTS.length} logros</span>
        </button>
        <button class="tile" data-act="ranking">
          <span class="tile__icon">${icon('trophy')}</span>
          <b>Ranking</b>
          <span>Top de la semana</span>
        </button>
      </div>
    </div>`;

  screen.querySelector('[data-act="play"]').addEventListener('click', () => play(app.restaurantId, 'normal'));
  screen.querySelector('[data-act="daily"]')?.addEventListener('click', () => play(daily.restaurantId, 'daily'));
  screen.querySelectorAll('[data-act="to-market"]').forEach((b) => b.addEventListener('click', () => go('market')));
  screen.querySelector('[data-act="diary"]').addEventListener('click', () => go('diary'));
  screen.querySelector('[data-act="ranking"]').addEventListener('click', () => go('ranking'));
  screen.querySelector('[data-act="decor"]').addEventListener('click', () => go('decor'));
  screen.querySelector('[data-act="goal"]').addEventListener('click', () => {
    if (goal.kind === 'recipe') { app.recipeTab = RECIPE_BY_ID[goal.id].restaurant; go('recipes'); }
    else if (goal.kind === 'restaurant') openRestaurant(RESTAURANT_BY_ID[goal.id]);
  });
  screen.querySelectorAll('[data-rest]').forEach((b) => b.addEventListener('click', () => {
    const r = RESTAURANT_BY_ID[b.dataset.rest];
    if (s.restaurants.includes(r.id)) {
      sfx.tap();
      app.restaurantId = r.id;
      localSet('afuego.restaurant', r.id);
      applyTheme(r.id);
      renderHome();
    } else {
      openRestaurant(r);
    }
  }));
  requestAnimationFrame(() => screen.querySelector(`[data-rest="${app.restaurantId}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }));
}

function restaurantCard(r, i) {
  const s = st();
  const owned = s.restaurants.includes(r.id);
  const recipes = recipesOf(r.id);
  const learned = recipes.filter((x) => s.recipes.includes(x.id)).length;
  const stage = facadeStage(s, r.id);
  const next = facadeNext(s, r.id);
  // Recién abierto: los andamios caen y aparece su fachada.
  const reveal = app.revealRest === r.id;
  return `
    <button class="rest ${owned ? '' : 'is-locked'} ${reveal ? 'is-revealing' : ''}" role="listitem" data-rest="${r.id}" aria-pressed="${r.id === app.restaurantId}"
      style="--r-brand:${r.theme.primary};--r-soft:${r.theme.soft}">
      <span class="rest__art">${storefrontSvg(r.theme, r.id, { stage })}${reveal ? `<span class="rest__obra" aria-hidden="true">${obraSvg(r.theme)}</span>` : ''}
        ${owned ? '' : `<span class="rest__lock">${icon('lock')}<span>${lockLabel(r)} · ${coinSvg()} ${fmt(r.cost)}</span></span>`}
      </span>
      <span class="rest__body">
        <span class="rest__cuisine">Cocina ${r.cuisine}</span>
        <span class="rest__name">${r.name}</span>
        <span class="rest__meta">${learned}/${recipes.length} recetas · ${r.seats} mesas · gastos ${fmt(r.upkeep)}/servicio</span>
        ${owned ? `<span class="rest__stage" data-stage="${stage}">${icon(stage >= 3 ? 'crown' : 'home')} ${FACADE_STAGES[stage]}${next ? ` · <small>${next}</small>` : ''}</span>` : ''}
      </span>
    </button>`;
}

// Qué falta para abrir un local: recetas del anterior, nivel o nada.
function lockLabel(r) {
  const prev = previousRestaurant(r.id);
  if (prev) {
    const p = recipeProgress(st(), prev.id);
    if (p.learned < p.total) return `Recetas ${p.learned}/${p.total}`;
  }
  return level() < r.reqLevel ? `Nivel ${r.reqLevel}` : 'Disponible';
}

function openRestaurant(r) {
  const s = st();
  const d = evaluatePurchase(s, 'restaurant', r.id);
  const can = d.ok;
  const prev = previousRestaurant(r.id);
  const reason = d.ok ? '¡Ya puedes abrirlo!'
    : d.reason === 'recetas_pendientes' ? `Primero aprende las ${d.total} recetas de ${prev.name}: llevas ${d.learned}/${d.total}.`
    : d.reason === 'nivel_insuficiente' ? `Necesitas nivel de chef ${r.reqLevel} (tienes ${level()}).`
    : d.reason === 'sin_dinero' ? `Te faltan ${fmt(r.cost - s.coins)} monedas.` : '';
  const recipes = recipesOf(r.id);
  // Requisitos para abrirlo, cada uno con su avance.
  const prog = prev ? recipeProgress(s, prev.id) : null;
  const reqs = [
    prev && { done: prog.learned >= prog.total, icon: 'book', label: `Aprender las ${prog.total} recetas de ${prev.name}`, value: `${prog.learned}/${prog.total}`, pct: prog.learned / prog.total },
    { done: level() >= r.reqLevel, icon: 'up', label: `Nivel de chef ${r.reqLevel}`, value: `Tienes ${level()}`, pct: Math.min(1, level() / r.reqLevel) },
    { done: s.coins >= r.cost, icon: 'market', label: `${fmt(r.cost)} monedas`, value: `Tienes ${fmt(s.coins)}`, pct: r.cost ? Math.min(1, s.coins / r.cost) : 1 }
  ].filter(Boolean);
  const helper = STAFF.find((m) => m.reqRestaurant === r.id);
  const i = RESTAURANTS.indexOf(r);
  const perks = [
    `${icon('book')} ${recipes.length} recetas`,
    `${icon('table')} ${r.seats} mesas`,
    `${coinSvg()} Gastos ${fmt(r.upkeep)}`,
    (TIER_GROUP_CHANCE[i] ?? 0) > 0 ? `${icon('people')} Grupos` : '',
    helper ? `${staffSvg(helper, 'class="perk__face"')} ${helper.name}` : ''
  ].filter(Boolean);
  openSheet(`
    <div class="sheet__head"><h2>${r.name}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
    <div class="rest-hero ${can ? '' : 'is-locked'}" style="--r-brand:${r.theme.primary};--r-soft:${r.theme.soft};--r-deep:${r.theme.deep}">
      <div class="rest-hero__art">${storefrontSvg(r.theme, r.id, { stage: facadeStage(st(), r.id) })}</div>
      <span class="rest-hero__kicker">Cocina ${escapeHtml(r.cuisine.toLowerCase())}</span>
      ${can ? '' : `<span class="rest-hero__lock">${icon('lock')}</span>`}
    </div>
    <div class="perks">${perks.map((p) => `<span class="perk">${p}</span>`).join('')}</div>
    <section class="reqs" aria-label="Requisitos">
      <h3>${can ? '¡Cumples todo para abrirlo!' : 'Para abrirlo necesitas'}</h3>
      ${reqs.map((q) => `<div class="req ${q.done ? 'is-done' : ''}">
        <span class="req__icon">${icon(q.done ? 'check' : q.icon)}</span>
        <div class="req__body"><div class="req__row"><b>${escapeHtml(q.label)}</b><span>${q.done ? 'Listo' : escapeHtml(q.value)}</span></div>
          <div class="req__bar"><i style="width:${Math.round(q.pct * 100)}%"></i></div></div>
      </div>`).join('')}
    </section>
    <div class="section-title" style="margin-top:4px"><h2 style="font-size:16px">Sus recetas</h2><span>${recipes.filter((x) => x.learnCost === 0).length} incluidas</span></div>
    <div class="comp-list">${recipes.map((x) => `<span class="comp">${ingredientSvg(x.components[0].ingredient)}${escapeHtml(x.name)}</span>`).join('')}</div>
    ${!can && reason ? `<p class="note" style="text-align:center"><strong>${reason}</strong></p>` : ''}
    ${d.reason === 'recetas_pendientes'
      ? `<button class="btn btn--xl" data-go-recipes="${prev.id}">${icon('book')} Ir a las recetas</button>`
      : `<button class="btn btn--xl btn--gold" data-buy ${can ? '' : 'disabled'}>${coinSvg()} Abrir por ${fmt(r.cost)}</button>`}
  `, (sheet, close) => {
    sheet.querySelector('[data-go-recipes]')?.addEventListener('click', (e) => { close(); app.recipeTab = e.currentTarget.dataset.goRecipes; go('recipes'); });
    sheet.querySelector('[data-buy]')?.addEventListener('click', async () => {
      if (await buy('restaurant', r.id)) {
        close();
        app.restaurantId = r.id;
        localSet('afuego.restaurant', r.id);
        applyTheme(r.id);
        app.revealRest = r.id;
        go('home');
        setTimeout(() => confetti(document.body, [r.theme.primary, '#FFC23D', '#fff', r.theme.deep]), 1100);
        setTimeout(() => { app.revealRest = null; showUnlocks(r); }, 2300);
      }
    });
  });
}

// Letrero al abrir un local: qué desbloquea y qué cambia en la cocina.
function unlocksFor(r) {
  const i = RESTAURANTS.indexOf(r);
  const prev = RESTAURANTS[i - 1];
  const items = [];
  const free = recipesOf(r.id).filter((x) => x.learnCost === 0);
  items.push({ icon: 'book', title: `${recipesOf(r.id).length} recetas nuevas`, text: `Ya puedes cocinar ${free.map((x) => x.name).join(' y ')}. Las demás se aprenden en el Recetario.` });
  const newIngs = [...new Set(recipesOf(r.id).flatMap((x) => x.components.map((c) => c.ingredient)))]
    .filter((ing) => !RECIPES.some((x) => RESTAURANTS.indexOf(RESTAURANT_BY_ID[x.restaurant]) < i && x.components.some((c) => c.ingredient === ing)));
  if (newIngs.length) items.push({ icon: 'market', title: 'Ingredientes nuevos en el mercado', text: newIngs.map((ing) => INGREDIENTS[ing].name).join(', ') + '.' });
  if (prev && r.seats > prev.seats) items.push({ icon: 'table', title: `${r.seats} mesas`, text: 'Atiendes a más clientes a la vez.' });
  const chance = TIER_GROUP_CHANCE[i] ?? 0;
  const prevChance = TIER_GROUP_CHANCE[i - 1] ?? 0;
  if (chance > 0 && prevChance === 0) items.push({ icon: 'people', title: 'Llegan grupos de amigos', text: `Entran juntos y ocupan varias mesas. Si les sirves a todos con menos de ${GROUP_WINDOW_MS / 1000} s de diferencia, cada uno paga +${Math.round(GROUP_BONUS * 100)} %. Si dejas esperando a uno, pierdes el bono.` });
  else if (i === 4) items.push({ icon: 'people', title: 'Grupos de tres', text: 'Ahora también llegan grupos de tres amigos: sírvelos casi a la vez.' });
  const helper = STAFF.find((m) => m.reqRestaurant === r.id);
  if (helper) items.push({ icon: 'user', title: `Nuevo ayudante: ${helper.name}`, text: `${helper.role}. ${helper.desc} Contrátalo arriba en Mejoras.` });
  if (r.grill && !RESTAURANTS[i - 1]?.grill) items.push({ icon: 'fire', title: 'Nueva estación: la parrilla', text: 'Asa carnes y verduras. A mitad de cocción pide que la voltees: hazlo a tiempo para que salga perfecto, y recógelo antes de que se queme. Mejórala en Mejoras.' });
  if (i === 3 || i === 5) items.push({ icon: 'fire', title: 'Más incendios', text: 'En este local la cocina se prende fuego más seguido.' });
  items.push({ icon: 'clock', title: 'Clientes más exigentes', text: `Esperan menos y llegan más seguido. Al cerrar pagas ${fmt(r.upkeep)} de gastos del local.` });
  return items;
}

function showUnlocks(r) {
  const items = unlocksFor(r);
  sfx.logro();
  openSheet(`
    <div class="sheet__head"><h2>¡Abriste ${escapeHtml(r.name)}!</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
    <p class="note" style="margin:0">Esto es lo nuevo:</p>
    <ul class="unlocks">${items.map((x) => `<li><span class="unlocks__icon">${icon(x.icon)}</span><span><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.text)}</small></span></li>`).join('')}</ul>
    <button class="btn btn--xl btn--gold" data-act="market">${icon('market')} Comprar ingredientes</button>
  `, (sheet, close) => {
    sheet.querySelector('[data-act="market"]').addEventListener('click', () => { close(); go('market'); });
  });
}

// Cuánto falta para que cambien los precios y las ofertas (a medianoche UTC, igual que el servidor).
function untilTomorrow() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const mins = Math.max(1, Math.round((next - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h} h ${mins % 60} min` : `${mins} min`;
}

async function buy(kind, id) {
  if (app.busy) return false;
  app.busy = true;
  try {
    const res = await app.api.purchase(kind, id);
    setProfile(res.profile);
    sfx.buy();
    return true;
  } catch (err) {
    errorToast(err);
    return false;
  } finally {
    app.busy = false;
  }
}

// ── Mercado ─────────────────────────────────────────────────
async function renderMarket() {
  const screen = document.getElementById('screen');
  if (!app.market) screen.innerHTML = `<div class="empty">Abriendo puestos…</div>`;
  try { app.market = await app.api.market(); } catch (err) { errorToast(err); return; }
  if (app.tab !== 'market') return;
  drawMarket();
}

function drawMarket() {
  const m = app.market;
  const screen = document.getElementById('screen');
  const s = st();
  const restIngs = new Set(menuFor(s, app.restaurantId).flatMap((id) => RECIPE_BY_ID[id].components.map((c) => c.ingredient)));
  const items = [...m.items].sort((a, b) => (restIngs.has(b.id) - restIngs.has(a.id)) || (m.inventory[a.id] ?? 0) - (m.inventory[b.id] ?? 0));
  const deals = m.items.filter((i) => i.deal);
  const pct = Math.round((m.used / m.capacity) * 100);
  const basketItems = Object.entries(m.basket.items);
  const dishes = dishesPossible(s, app.restaurantId);
  const plan = restockPlan(s, app.restaurantId, 16);
  const planUnits = inventoryCount(plan);
  const planCost = Object.entries(plan).reduce((t, [id, q]) => t + lineTotal(m.items.find((i) => i.id === id)?.price ?? 0, q), 0);
  screen.innerHTML = `
    <section class="card market-hero">
      ${pantryDonut(m, dishes)}
      <div>
        <h2 style="font-size:19px">Tu despensa</h2>
        <p class="note"><strong>Alcanza para ~${dishes} platos</strong> en ${escapeHtml(RESTAURANT_BY_ID[app.restaurantId].name)}. Un servicio suele pedir 12–18.</p>
      </div>
      ${pantryLegend(m, restIngs)}
      ${planUnits
        ? `<button class="btn btn--good btn--wide restock" data-act="restock">${icon('basket')} Surtir para un servicio: ${planUnits} por ~${fmt(planCost)}</button>`
        : `<p class="note restock" style="text-align:center"><strong>✓ Tu despensa ya alcanza para un servicio completo.</strong></p>`}
    </section>

    ${m.basket.claimed || !basketItems.length ? '' : `
    <section class="card basket">
      <span class="basket__icon">${icon('basket')}</span>
      <span class="basket__body"><b>Canasta gratis del día</b><span>${basketItems.map(([ing, n]) => `${n} ${INGREDIENTS[ing].name}`).join(' · ')}</span></span>
      <button class="btn btn--sm btn--good" data-act="basket">Recoger</button>
    </section>`}

    ${deals.length ? `<div class="section-title"><h2>Ofertas de hoy</h2><span>−40% · nuevas en ${untilTomorrow()}</span></div>
    <div class="deals">${deals.map((d) => `
      <div class="deal"><span class="deal__bubble">${ingredientSvg(d.id)}<span class="deal__badge">−40%</span></span><b>${INGREDIENTS[d.id].name}</b><span>${coinSvg('coin" style="width:14px;height:14px;vertical-align:-2px')} ${d.price} c/u</span></div>`).join('')}
    </div>` : ''}

    <div class="section-title"><h2>Puestos</h2><span>${items.length} ingredientes</span></div>
    <div class="stall stagger">
      ${items.map((i) => {
        const have = m.inventory[i.id] ?? 0;
        const q = app.cart[i.id] ?? 0;
        return `<div class="produce">
          <span class="produce__icon">${ingredientSvg(i.id)}${have ? `<span class="produce__have">${have}</span>` : ''}</span>
          <span style="min-width:0">
            <span class="produce__name" style="display:block">${INGREDIENTS[i.id].name}${restIngs.has(i.id) ? '' : ' <small class="note">(otro local)</small>'}</span>
            <span class="produce__price">${coinSvg()} ${i.price}
              ${i.trend === 'up' ? icon('up', 'class="trend trend--up"') : i.trend === 'down' ? icon('down', 'class="trend trend--down"') : ''}
              ${i.deal ? '<span class="tag tag--deal" style="padding:2px 8px;font-size:11px">Oferta</span>' : ''}</span>
          </span>
          <span class="stepper">
            <button class="round-btn" data-dec="${i.id}" aria-label="Quitar ${INGREDIENTS[i.id].name}" ${q ? '' : 'disabled'}>${icon('minus')}</button>
            <output aria-live="polite">${q}</output>
            <button class="round-btn" data-inc="${i.id}" aria-label="Agregar ${INGREDIENTS[i.id].name}">${icon('plus')}</button>
          </span>
        </div>`;
      }).join('')}
    </div>`;
  drawCart();

  screen.querySelector('[data-act="restock"]')?.addEventListener('click', () => {
    app.cart = { ...plan };
    sfx.tap();
    toast('Carrito listo: revisa y paga abajo', 'good');
    drawMarket();
  });
  screen.querySelector('[data-act="basket"]')?.addEventListener('click', async () => {
    try {
      const res = await app.api.claimBasket();
      setProfile(res.profile);
      app.market = res.market;
      sfx.buy();
      toast('¡Canasta guardada en tu despensa!', 'good');
      drawMarket();
    } catch (err) { errorToast(err); }
  });
  screen.querySelectorAll('[data-inc],[data-dec]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.inc ?? b.dataset.dec;
    const cartUnits = Object.values(app.cart).reduce((a, n) => a + n, 0);
    if (b.dataset.inc && m.used + cartUnits >= m.capacity) { toast('Tu despensa está llena: mejora el refrigerador', 'bad'); sfx.error(); return; }
    app.cart[id] = Math.max(0, (app.cart[id] ?? 0) + (b.dataset.inc ? 1 : -1));
    if (!app.cart[id]) delete app.cart[id];
    sfx.tap();
    const row = b.closest('.produce');
    row.querySelector('output').textContent = app.cart[id] ?? 0;
    row.querySelector('[data-dec]').disabled = !app.cart[id];
    drawCart();
  }));
}

// Dona de la despensa: cada ingrediente es una porción de su color; lo gris es espacio libre.
function pantryDonut(m, dishes) {
  const entries = Object.entries(m.inventory).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  let deg = 0;
  const stops = entries.map(([ing, n]) => {
    const from = deg;
    deg += (n / m.capacity) * 360;
    return `${INGREDIENTS[ing].color} ${from.toFixed(1)}deg ${(deg - 0.8).toFixed(1)}deg, #3B2416 ${(deg - 0.8).toFixed(1)}deg ${deg.toFixed(1)}deg`;
  });
  stops.push(`rgba(59,36,22,.1) ${deg.toFixed(1)}deg 360deg`);
  const state = dishes === 0 ? 'is-empty' : dishes < 6 ? 'is-low' : '';
  return `<div class="pantry-donut ${state}" style="--donut:conic-gradient(${stops.join(',')})" role="img" aria-label="Despensa ${m.used} de ${m.capacity}">
    <span class="pantry-donut__center"><b>${m.used}</b><small>de ${m.capacity}</small><em>${dishes} platos</em></span>
  </div>`;
}

function pantryLegend(m, restIngs) {
  const ids = [...new Set([...restIngs, ...Object.keys(m.inventory)])];
  ids.sort((a, b) => (m.inventory[b] ?? 0) - (m.inventory[a] ?? 0));
  return `<div class="legend">${ids.map((id) => {
    const n = m.inventory[id] ?? 0;
    return `<span class="${n === 0 ? 'is-zero' : n <= 3 ? 'is-low' : ''}">${ingredientSvg(id)}${n}</span>`;
  }).join('')}</div>`;
}

function drawCart() {
  root.querySelector('.cart-bar')?.remove();
  document.getElementById('screen')?.classList.remove('has-cart');
  const entries = Object.entries(app.cart);
  if (!entries.length || app.tab !== 'market') return;
  const prices = Object.fromEntries(app.market.items.map((i) => [i.id, i.price]));
  const total = entries.reduce((s, [id, q]) => s + lineTotal(prices[id], q), 0);
  const units = entries.reduce((s, [, q]) => s + q, 0);
  const bar = document.createElement('div');
  bar.className = 'cart-bar';
  bar.innerHTML = `
    <span class="cart-bar__info">${units} ingredientes<small>Despensa quedará en ${app.market.used + units}/${app.market.capacity}</small></span>
    <button class="btn btn--sm btn--gold" data-act="checkout" ${st().coins < total ? 'disabled' : ''}>${coinSvg()} Pagar ${fmt(total)}</button>`;
  root.appendChild(bar);
  document.getElementById('screen')?.classList.add('has-cart');
  bar.querySelector('[data-act="checkout"]').addEventListener('click', async () => {
    if (app.busy) return;
    app.busy = true;
    try {
      const res = await app.api.marketBuy(app.cart);
      app.cart = {};
      app.market = res.market;
      setProfile(res.profile);
      sfx.buy();
      toast(`Compraste ${units} ingredientes por ${fmt(res.spent)}`, 'good');
      drawMarket();
    } catch (err) { errorToast(err); } finally { app.busy = false; }
  });
}

// ── Recetas ─────────────────────────────────────────────────
function renderRecipes() {
  const s = st();
  app.recipeTab ??= app.restaurantId;
  const rid = app.recipeTab;
  const rest = RESTAURANT_BY_ID[rid];
  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div class="chips" role="group" aria-label="Restaurante">
      ${RESTAURANTS.map((r) => `<button class="chip" data-chip="${r.id}" aria-pressed="${r.id === rid}">${s.restaurants.includes(r.id) ? '' : icon('lock')}${r.cuisine}</button>`).join('')}
    </div>
    ${s.restaurants.includes(rid) ? '' : `<div class="card" style="display:flex;gap:12px;align-items:center;border-radius:999px">${icon('lock', 'style="width:28px;height:28px;flex-shrink:0"')}<span class="note"><strong>${rest.name}</strong> está cerrado. Ábrelo desde Inicio para aprender estas recetas.</span></div>`}
    ${nextUnlockNote(rid)}
    <div class="stagger" style="display:flex;flex-direction:column;gap:12px">${recipesOf(rid).map((r) => recipeCard(r)).join('')}</div>
    <p class="note" style="text-align:center">El margen es lo que cobras menos lo que cuestan sus ingredientes en el mercado.</p>`;
  screen.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); app.recipeTab = b.dataset.chip; renderRecipes(); }));
  screen.querySelectorAll('[data-learn]').forEach((b) => b.addEventListener('click', async () => {
    if (await buy('recipe', b.dataset.learn)) { toast('¡Receta aprendida! Compra sus ingredientes en el mercado', 'good'); renderRecipes(); }
  }));
}

function nextUnlockNote(rid) {
  const idx = RESTAURANTS.findIndex((x) => x.id === rid);
  const next = RESTAURANTS[idx + 1];
  if (!next || !st().restaurants.includes(rid) || st().restaurants.includes(next.id)) return '';
  const p = recipeProgress(st(), rid);
  const pct = Math.round((p.learned / p.total) * 100);
  return `<div class="card" style="display:flex;flex-direction:column;gap:8px;border-radius:30px">
    <span class="note"><strong>${p.learned}/${p.total} recetas</strong> · ${p.learned < p.total ? `aprende las ${p.total} para poder abrir ${escapeHtml(next.name)}` : `¡completo! Ya puedes abrir ${escapeHtml(next.name)}`}</span>
    <span class="progress"><span class="progress__fill" style="width:${pct}%"></span></span>
  </div>`;
}

function recipeCard(r) {
  const s = st();
  const owned = s.recipes.includes(r.id);
  const open = s.restaurants.includes(r.restaurant);
  const cost = r.components.reduce((a, c) => a + INGREDIENTS[c.ingredient].cost, 0);
  let action;
  if (owned) action = `<span class="tag tag--ok">${icon('check')} En tu menú</span>`;
  else if (!open) action = `<span class="tag tag--lock">${icon('lock')} Local cerrado</span>`;
  else if (level() < r.reqLevel) action = `<span class="tag tag--lock">${icon('lock')} Nivel ${r.reqLevel}</span>`;
  else action = `<button class="btn btn--sm btn--gold" data-learn="${r.id}" ${s.coins < r.learnCost ? 'disabled' : ''}>${coinSvg()} ${fmt(r.learnCost)}</button>`;
  return `
    <article class="recipe ${owned ? '' : 'is-locked'}">
      <div class="plate"><div class="plate__dish"></div><div class="plate__items">${plateSvgItems(r)}</div></div>
      <div>
        <div class="recipe__name">${escapeHtml(r.name)}</div>
        <div class="comp-list">${r.components.map((c) => `<span class="comp" title="${INGREDIENTS[c.ingredient].name}: ${PROCESSES[c.process].verb}">${ingredientSvg(c.ingredient)}${processSvg(c.process)}</span>`).join('')}</div>
        <div class="recipe__row"><span class="recipe__price">${coinSvg()} ${r.price} · margen ~${r.price - cost}</span>${action}</div>
      </div>
    </article>`;
}

// ── Mejoras ─────────────────────────────────────────────────
function renderUpgrades() {
  const s = st();
  const now = kitchenStats(s.upgrades);
  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div class="stagger" style="display:flex;flex-direction:column;gap:12px">
      ${staffSection(s)}
      ${UPGRADES.map((u, i) => {
        const lvl = upgradeLevel(s.upgrades, u.id);
        const max = lvl >= u.costs.length;
        const price = max ? 0 : u.costs[lvl];
        const req = max ? 1 : (u.reqLevels?.[lvl] ?? 1);
        const header = u.extra && !UPGRADES[i - 1]?.extra
          ? `<div class="section-title"><h2>Equipo extra</h2><span>Un segundo fogón de cada tipo</span></div>` : '';
        return `${header}
        <article class="card upgrade">
          <div class="upgrade__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UPGRADE_ICONS[u.id] ?? ''}</svg></div>
          <div>
            <div class="upgrade__name">${u.name}</div>
            <div class="upgrade__desc">${u.desc}</div>
            <div class="pips" aria-label="Nivel ${lvl} de ${u.costs.length}">${u.costs.map((_, i) => `<span class="pip ${i < lvl ? 'is-on' : ''}" style="animation-delay:${i * 60}ms"></span>`).join('')}</div>
            <div class="upgrade__foot">
              <span class="upgrade__effect">${upgradeEffect(u.id, now, s)}</span>
              ${max ? `<span class="tag tag--ok">${icon('check')} ${u.extra ? 'Instalado' : 'Máximo'}</span>`
                : level() < req ? `<span class="tag tag--lock">${icon('lock')} Nivel ${req} · ${fmt(price)}</span>`
                : `<button class="btn btn--sm" data-up="${u.id}" ${s.coins < price ? 'disabled' : ''}>${coinSvg()} ${fmt(price)}</button>`}
            </div>
          </div>
        </article>`;
      }).join('')}
    </div>`;
  screen.querySelectorAll('[data-staff]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); openStaffSheet(b.dataset.staff); }));
  screen.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', async () => {
    if (await buy('upgrade', b.dataset.up)) { toast('¡Mejora instalada!', 'good'); app.market = null; renderUpgrades(); }
  }));
}

function upgradeEffect(id, k, s) {
  switch (id) {
    case 'cuchillos': return `${k.taps.cortar} cortes por ingrediente`;
    case 'batidora': return `${k.taps.batir} toques para batir`;
    case 'sarten': return `Fríe en ${k.seconds.freir.toFixed(1)} s`;
    case 'horno': return `Hornea en ${k.seconds.hornear.toFixed(1)} s`;
    case 'olla': return `Hierve en ${k.seconds.hervir.toFixed(1)} s`;
    case 'parrilla': return `Asa en ${k.seconds.asar.toFixed(1)} s`;
    case 'campana': return `Se quema tras ${k.burnSeconds.freir.toFixed(1)} s`;
    case 'ambiente': return `Paciencia ×${k.patienceMult.toFixed(1)} · +${Math.round(k.tipBonus * 100)}% propina`;
    case 'refri': return `Despensa de ${storageCapacity(s.upgrades)} lugares`;
    case 'extra_tabla': case 'extra_bol': case 'extra_sarten': case 'extra_olla': case 'extra_horno': {
      const st = id.slice(6);
      return `Tienes ${k.stations[st]} ${k.stations[st] > 1 ? 'en paralelo' : 'ahora'}`;
    }
    default: return '';
  }
}

// ── Diario de caja ──────────────────────────────────────────
async function renderDiary() {
  const screen = document.getElementById('screen');
  screen.innerHTML = `<div class="empty">Abriendo el libro…</div>`;
  let entries = [];
  try { entries = (await app.api.history()).entries; } catch (err) { errorToast(err); return; }
  if (app.tab !== 'diary') return;
  const medals = achievementsCard(st());
  if (!entries.length) {
    screen.innerHTML = `${medals}<div class="card empty">${icon('journal')}<span>Aún no hay servicios. Cada servicio que cierres aparecerá aquí con sus ganancias y gastos.</span></div>`;
    bindAchievements(screen);
    return;
  }
  const net = entries.reduce((a, e) => a + e.net, 0);
  const avg = entries.reduce((a, e) => a + e.stars, 0) / entries.length;
  screen.innerHTML = `
    ${medals}
    <div class="summary">
      <div><b>${fmt(net)}</b><span>ganancia</span></div>
      <div><b>${entries.length}</b><span>servicios</span></div>
      <div><b>${avg.toFixed(1)}★</b><span>promedio</span></div>
    </div>
    <div class="journal stagger">${entries.map((e) => {
      const r = RESTAURANT_BY_ID[e.restaurantId];
      return `<article class="ticket journal-entry">
        <div class="ticket__head">
          <div><h3>${escapeHtml(r.name)}${e.mode === 'daily' ? ' · reto' : ''}</h3><small>${new Date(e.finishedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</small></div>
          <span class="mini-stars">${[0, 1, 2].map((i) => i < e.stars ? starSvg('') : '').join('')}</span>
        </div>
        <div class="ticket__row"><span>Clientes atendidos</span><b>${e.served}/${e.totalOrders}${e.vipServed ? ` · ${e.vipServed} VIP` : ''}</b></div>
        <div class="ticket__row"><span>Ventas y propinas</span><b class="pos">+${fmt(e.gross)}</b></div>
        <div class="ticket__row"><span>Gastos del local</span><b class="neg">−${fmt(e.upkeep)}</b></div>
        ${e.salary ? `<div class="ticket__row"><span>Sueldo del asistente</span><b class="neg">−${fmt(e.salary)}</b></div>` : ''}
        ${e.emergencyCost ? `<div class="ticket__row"><span>Pedidos urgentes</span><b class="neg">−${fmt(e.emergencyCost)}</b></div>` : ''}
        <div class="ticket__row is-total"><span>Ganancia</span><b>${fmt(e.net)}</b></div>
        <div class="ticket__row"><span class="note">Ingredientes usados (pagados en el mercado)</span><b class="note">~${fmt(e.ingredientCost)}</b></div>
      </article>`;
    }).join('')}</div>`;
  bindAchievements(screen);
}

// Logros: tarjeta plegable con el progreso de cada uno.
function achievementsCard(s) {
  const list = achievementProgress(s);
  const done = list.filter((x) => x.done).length;
  const open = app.medalsOpen ?? false;
  const next = list.filter((x) => !x.done).sort((a, b) => b.value / b.goal - a.value / a.goal)[0];
  return `<section class="card medals ${open ? 'is-open' : ''}">
    <button class="medals__head" data-act="medals" aria-expanded="${open}">
      <span class="medals__icon">${icon('medal')}</span>
      <span style="flex:1;min-width:0;text-align:left"><b>Logros ${done}/${list.length}</b>
        <small>${next ? `Siguiente: ${escapeHtml(next.name)} · ${fmt(next.value)}/${fmt(next.goal)}` : '¡Los tienes todos!'}</small></span>
      <span class="medals__chev">${icon('down')}</span>
    </button>
    <div class="medals__list">${list.map((x) => `
      <div class="ach-row ${x.done ? 'is-done' : ''}">
        <span class="ach-row__badge">${x.done ? icon('check') : icon('medal')}</span>
        <div class="ach-row__body"><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.desc)}</small>
          ${x.done ? '' : `<div class="progress"><div class="progress__fill" style="width:${Math.round(x.value / x.goal * 100)}%"></div></div>`}</div>
        <span class="ach-row__reward">${x.done ? 'Cobrado' : `${coinSvg()} ${fmt(x.reward)}`}</span>
      </div>`).join('')}</div>
  </section>`;
}

function bindAchievements(screen) {
  screen.querySelector('[data-act="medals"]')?.addEventListener('click', (e) => {
    app.medalsOpen = !app.medalsOpen;
    const card = e.currentTarget.closest('.medals');
    card.classList.toggle('is-open', app.medalsOpen);
    e.currentTarget.setAttribute('aria-expanded', String(app.medalsOpen));
    sfx.tap();
  });
}

// ── Mi local (decoración) ───────────────────────────────────
function awningVars(id) {
  const t = RESTAURANT_BY_ID[app.restaurantId].theme;
  const [a, b, deep] = DECOR_BY_ID[id]?.colors ?? [t.primary, `color-mix(in srgb, ${t.primary} 82%, #fff)`, t.deep];
  return `--aw-a:${a};--aw-b:${b};--aw-deep:${deep}`;
}

function decorSwatch(item) {
  switch (item.slot) {
    case 'toldo': return `<span class="sw sw--awning" data-awning="${item.id}" style="${awningVars(item.id)}"></span>`;
    case 'pared': return `<span class="sw scene-wall" data-wall="${item.id}"></span>`;
    case 'barra': return `<span class="sw sw--counter" data-counter="${item.id}"><span class="bar__counter"></span></span>`;
    case 'luces': return `<span class="sw sw--lights">${lightsHtml(item.id)}</span>`;
    default: return `<span class="sw sw--deco">${decoHtml([item.id])}</span>`;
  }
}

function renderDecor() {
  const s = st();
  const dec = decorOf(s);
  app.decorTab ??= 'toldo';
  app.decorPreview ??= {};
  // Lo que se ve: lo puesto, con lo que estés probando encima.
  const look = { ...dec.equipped, ...app.decorPreview };
  const lookDeco = app.decorPreview.deco ?? dec.equipped.deco;
  const slot = DECOR_SLOTS.find((x) => x.id === app.decorTab);
  const items = DECOR.filter((x) => x.slot === slot.id);
  const preview = Object.values(app.decorPreview).flat().find((id) => id && !decorOwned(s, id));
  const pv = preview ? DECOR_BY_ID[preview] : null;
  const lockText = (x) => {
    const av = decorAvailable(s, x);
    if (av.reason === 'logro_pendiente') return `Logro: ${ACHIEVEMENT_BY_ID[x.achievement]?.name ?? ''}`;
    if (av.reason === 'nivel_insuficiente') return `Nivel ${x.reqLevel}`;
    return null;
  };
  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <section class="scene" data-counter="${look.barra}" data-awning="${look.toldo}" aria-label="Vista previa del local" style="${awningVars(look.toldo)}">
        <div class="scene-wall" data-wall="${look.pared}"></div>
        <div class="scene-awning"></div>
        <div class="scene-stage">${lightsHtml(look.luces)}${decoHtml(lookDeco)}</div>
        <div class="scene-guests">${[1, 3, 6].map((l) => `<span class="avatar" style="--p:100"><span class="avatar__face">${customerSvg(l, 'happy', '')}</span></span>`).join('')}</div>
        <span class="bar__counter"></span>
      </section>
      ${pv ? `<div class="decor-buy card">
        <div style="flex:1;min-width:0"><b>${escapeHtml(pv.name)}</b><small>${lockText(pv) ? `Se desbloquea con ${escapeHtml(lockText(pv))}` : 'Estás viendo cómo queda'}</small></div>
        ${lockText(pv) ? `<button class="btn btn--sm btn--ghost" data-act="undo">Quitar</button>` : `<button class="btn btn--sm btn--gold" data-act="buy-decor" ${s.coins < pv.cost ? 'disabled' : ''}>${coinSvg()} ${fmt(pv.cost)}</button>`}
      </div>` : `<p class="note" style="text-align:center">Toca algo para ver cómo queda. Lo que ya es tuyo se pone al instante.</p>`}
      <div class="chips" role="tablist" aria-label="Qué decorar">
        ${DECOR_SLOTS.map((x) => `<button class="chip" role="tab" data-slot="${x.id}" aria-pressed="${x.id === slot.id}">${x.name}</button>`).join('')}
      </div>
      <div class="decor-grid">${items.map((x) => {
        const owned = decorOwned(s, x.id);
        const on = slot.multi ? lookDeco.includes(x.id) : look[slot.id] === x.id;
        const equipped = slot.multi ? dec.equipped.deco.includes(x.id) : dec.equipped[slot.id] === x.id;
        const lock = owned ? null : lockText(x);
        const label = equipped ? 'Puesto' : owned ? 'Tuyo' : lock ?? fmt(x.cost);
        return `<button class="decor-item ${on ? 'is-on' : ''} ${lock ? 'is-locked' : ''}" data-decor="${x.id}" aria-pressed="${on}">
          ${decorSwatch(x)}
          <b>${escapeHtml(x.name)}</b>
          <small class="${equipped ? 'is-equipped' : owned ? '' : lock ? 'is-lock' : 'is-price'}">${!owned && !lock ? coinSvg() : ''}${escapeHtml(label)}</small>
        </button>`;
      }).join('')}</div>
    </div>`;
  screen.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); app.decorTab = b.dataset.slot; renderDecor(); }));
  screen.querySelectorAll('[data-decor]').forEach((b) => b.addEventListener('click', async () => {
    const x = DECOR_BY_ID[b.dataset.decor];
    sfx.tap();
    if (decorOwned(st(), x.id)) {
      // Lo tuyo se pone (o en Adornos, se quita) al instante.
      app.decorPreview = {};
      try { const res = await app.api.equipDecor(x.id); setProfile(res.profile); } catch (err) { errorToast(err); }
      renderDecor();
      return;
    }
    // Lo que no es tuyo: probarlo en la vista previa.
    app.decorPreview = x.slot === 'deco' ? { deco: [...new Set([...decorOf(st()).equipped.deco, x.id])] } : { [x.slot]: x.id };
    renderDecor();
  }));
  screen.querySelector('[data-act="undo"]')?.addEventListener('click', () => { app.decorPreview = {}; renderDecor(); });
  screen.querySelector('[data-act="buy-decor"]')?.addEventListener('click', async () => {
    if (app.busy) return;
    app.busy = true;
    try {
      const res = await app.api.buyDecor(pv.id);
      app.decorPreview = {};
      setProfile(res.profile);
      sfx.buy();
      confetti(document.body, ['#FFC23D', '#fff', RESTAURANT_BY_ID[app.restaurantId].theme.primary]);
      toast(`¡${pv.name} en tu local!`, 'good');
      renderDecor();
    } catch (err) { errorToast(err); } finally { app.busy = false; }
  });
}

// ── Ayudantes (arriba de Mejoras) ───────────────────────────
function staffState(s, m) {
  const owned = staffOwned(s).includes(m.id);
  const exp = s.staff?.exp?.[m.id] ?? 0;
  const rank = staffRank(exp);
  const restOk = s.restaurants.includes(m.reqRestaurant);
  return { owned, exp, rank, hired: s.staff?.hired === m.id, restOk, unlocked: owned || restOk };
}

function staffSection(s) {
  return `<section class="card helpers">
    <div class="helpers__head"><h2>Ayudantes</h2><span>Uno nuevo en cada local avanzado</span></div>
    <div class="helpers__row">${STAFF.map((m) => {
      const x = staffState(s, m);
      const label = x.hired ? 'Trabajando' : x.owned ? 'Contratable' : x.unlocked ? fmt(m.hireCost) : `Con ${RESTAURANT_BY_ID[m.reqRestaurant].name.split(' ')[0]}`;
      return `<button class="helper ${x.hired ? 'is-hired' : ''} ${x.unlocked ? '' : 'is-locked'}" data-staff="${m.id}" aria-label="${m.name}, ${m.role}">
        <span class="staff-face">${staffSvg(m)}${x.unlocked ? '' : `<span class="helper__lock">${icon('lock')}</span>`}</span>
        <b>${m.name}</b><small>${x.hired ? icon('check') : ''}${escapeHtml(label)}</small>
      </button>`;
    }).join('')}</div>
  </section>`;
}

function openStaffSheet(id) {
  const m = STAFF_BY_ID[id];
  const draw = () => {
    const s = st();
    const x = staffState(s, m);
    const nextRank = STAFF_RANKS[x.rank + 1];
    const pct = nextRank ? Math.round((x.exp - STAFF_RANKS[x.rank].from) / (nextRank.from - STAFF_RANKS[x.rank].from) * 100) : 100;
    let action;
    if (x.hired) action = `<button class="btn btn--ghost btn--wide" data-hire="">Despedir</button>`;
    else if (x.owned) action = `<button class="btn btn--wide" data-hire="${m.id}">Llamar a ${m.name} · gratis</button>`;
    else if (!x.restOk) action = `<div class="staff-lock">${icon('lock')} Se desbloquea al abrir <b>${escapeHtml(RESTAURANT_BY_ID[m.reqRestaurant].name)}</b></div>`;
    else action = `<button class="btn btn--wide" data-hire="${m.id}" ${s.coins < m.hireCost ? 'disabled' : ''}>Contratar · ${coinSvg()} ${fmt(m.hireCost)}</button>`;
    return `
      <div class="sheet__head"><h2>${m.name}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
      <div class="staff-card ${x.hired ? 'is-hired' : ''}">
        <div class="staff-card__head">
          <span class="staff-face staff-face--lg">${staffSvg(m)}</span>
          <div style="flex:1;min-width:0"><b class="staff-card__name">${m.role}</b><span class="staff-card__role">${m.stations.length ? m.stations.map((t) => STATIONS[t].name).join(' y ') : 'Barra'}</span></div>
        </div>
        <p class="staff-card__desc">${m.desc}</p>
        <ol class="ranks" aria-label="Lo que hace en cada rango">
          ${m.levels.map((lv, i) => {
            const now = x.owned && i === x.rank;
            const done = x.owned && i < x.rank;
            const from = STAFF_RANKS[i].from;
            return `<li class="rank ${now ? 'is-now' : done ? 'is-done' : ''}">
              <span class="rank__dot">${icon(done ? 'check' : now ? 'sparkle' : 'lock')}</span>
              <span><b>${rankName(m, i)}</b> <small>${from ? `desde ${from} servicios` : 'al contratar'}${now ? ' · ahora' : ''}</small><span class="rank__perk">${lv.perk}</span></span>
            </li>`;
          }).join('')}
        </ol>
        <div class="ticket">
          <div class="ticket__row"><span>Contrato (una vez)</span><b>${x.owned ? 'Pagado' : fmt(m.hireCost)}</b></div>
          <div class="ticket__row"><span>Sueldo por servicio</span><b class="neg">−${fmt(m.salary)}</b></div>
          <div class="ticket__row"><span>Se desbloquea con</span><b>${escapeHtml(RESTAURANT_BY_ID[m.reqRestaurant].name)}</b></div>
        </div>
        ${x.owned ? `<div class="staff-card__exp"><span>${rankName(m, x.rank)}${nextRank ? ` · ${x.exp - STAFF_RANKS[x.rank].from}/${nextRank.from - STAFF_RANKS[x.rank].from} servicios para ${rankName(m, x.rank + 1)}` : ' · rango máximo'}</span>
          <div class="progress"><div class="progress__fill" style="width:${pct}%"></div></div></div>` : ''}
        ${action}
      </div>`;
  };
  openSheet(draw(), (sheet, close) => {
    const bind = () => sheet.querySelector('[data-hire]')?.addEventListener('click', async (e) => {
      const target = e.currentTarget.dataset.hire || null;
      if (app.busy) return;
      app.busy = true;
      try {
        const res = await app.api.hireStaff(target);
        setProfile(res.profile);
        sfx.buy();
        toast(target ? `¡${m.name} se une a tu cocina!` : `${m.name} ya no trabaja contigo`, target ? 'good' : '');
        close();
        if (app.tab === 'upgrades') renderUpgrades();
      } catch (err) { errorToast(err); } finally { app.busy = false; }
    });
    bind();
  });
}

// ── Ranking ─────────────────────────────────────────────────
async function renderRanking() {
  const s = st();
  app.boardTab = s.restaurants.includes(app.boardTab) ? app.boardTab : app.restaurantId;
  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div class="chips" role="group" aria-label="Restaurante">
      ${RESTAURANTS.filter((r) => s.restaurants.includes(r.id)).map((r) => `<button class="chip" data-chip="${r.id}" aria-pressed="${r.id === app.boardTab}">${r.cuisine}</button>`).join('')}
    </div>
    <section class="card" id="board"><div class="empty">Cargando…</div></section>`;
  screen.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); app.boardTab = b.dataset.chip; renderRanking(); }));
  const box = screen.querySelector('#board');
  try {
    const data = await app.api.leaderboard(app.boardTab);
    if (app.tab !== 'ranking') return;
    if (!data.entries.length) {
      box.innerHTML = `<div class="empty">${icon('trophy')}<span>Nadie ha jugado aquí esta semana. ¡Sé el primero!</span></div>`;
      return;
    }
    box.innerHTML = `${data.local ? '<p class="note" style="margin:0 0 10px">Sin servidor: se muestra tu mejor marca en este dispositivo.</p>' : ''}
      <div class="stagger">${data.entries.map((e) => `
        <div class="board-row ${e.me ? 'is-me' : ''}">
          <div class="board-rank">${e.rank <= 3 ? `<span class="medal medal--${e.rank}">${e.rank}</span>` : e.rank}</div>
          <div class="board-name">${escapeHtml(e.name)}${e.me ? ' (tú)' : ''}</div>
          <div class="board-score">${fmt(e.score)}</div>
        </div>`).join('')}</div>`;
  } catch {
    box.innerHTML = `<div class="empty">No se pudo cargar el ranking.</div>`;
  }
}

// ── Perfil y ajustes ────────────────────────────────────────
function openProfile() {
  const p = app.profile;
  const online = app.api.mode === 'online';
  openSheet(`
    <div class="sheet__head"><h2>Tu chef</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
    <div class="card" style="display:flex;gap:14px;align-items:center;border-radius:999px 30px 30px 999px">
      <span class="review__face" style="width:68px;height:68px">${customerSvg(1, 'happy', '')}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:17px">${escapeHtml(p.player.displayName)}</div>
        <div class="note">${p.empire.title} · Nivel ${p.level.level}</div>
        <div class="progress" style="margin-top:6px"><div class="progress__fill" style="width:${Math.round(p.level.current / p.level.needed * 100)}%"></div></div>
        <div class="note" style="font-size:11px;margin-top:3px">${fmt(p.level.current)} / ${fmt(p.level.needed)} XP para nivel ${p.level.level + 1}</div>
      </div>
    </div>
    ${prefTilesHtml()}
    <button class="btn btn--ghost btn--wide" data-act="ledger">${icon('refresh')} Historial de monedas</button>
    ${online ? accountSection(p) : `<div class="card"><p class="note" style="margin:0 0 10px">Tu progreso se guarda en este celular.</p><button class="btn btn--ghost btn--wide" data-act="reset">Borrar progreso</button></div>`}
  `, (sheet, close) => {
    bindPrefTiles(sheet);
    sheet.querySelector('[data-act="ledger"]').addEventListener('click', () => { close(); openLedger(); });
    sheet.querySelector('[data-act="reset"]')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      if (b.dataset.armed !== '1') {
        b.dataset.armed = '1';
        b.textContent = 'Toca otra vez para borrar todo';
        b.classList.replace('btn--ghost', 'btn--dark');
        return;
      }
      setProfile(await app.api.reset());
      app.restaurantId = 'arepera';
      app.market = null;
      app.cart = {};
      close(); renderShell();
    });
    const form = sheet.querySelector('form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const action = e.submitter?.value ?? 'register';
      try {
        const profile = action === 'login'
          ? await app.api.login(fd.get('username'), fd.get('password'))
          : await app.api.register(fd.get('username'), fd.get('password'));
        setProfile(profile);
        toast(action === 'login' ? '¡Bienvenido de vuelta!' : 'Cuenta guardada', 'good');
        close(); renderShell();
      } catch (err) { errorToast(err); }
    });
    sheet.querySelector('[data-act="logout"]')?.addEventListener('click', async () => {
      setProfile(await app.api.logout());
      close(); renderShell();
    });
  });
}

function accountSection(p) {
  if (p.player.registered) {
    return `<div class="card"><p class="note" style="margin:0 0 10px">Tu progreso está guardado en el servidor. Puedes entrar desde cualquier celular.</p><button class="btn btn--ghost btn--wide" data-act="logout">Cerrar sesión</button></div>`;
  }
  return `<form class="card" style="display:flex;flex-direction:column;gap:12px">
      <p class="note">Guarda tu progreso con un usuario para no perderlo y jugar en otros dispositivos.</p>
      <div class="field"><label for="u">Usuario</label><input id="u" name="username" autocomplete="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.\\-]+"></div>
      <div class="field"><label for="pw">Contraseña</label><input id="pw" name="password" type="password" autocomplete="current-password" required minlength="8"></div>
      <button class="btn btn--wide" type="submit" value="register">Guardar mi cuenta</button>
      <button class="btn btn--ghost btn--wide" type="submit" value="login">Ya tengo cuenta: entrar</button>
    </form>`;
}

const REASONS = {
  bono_bienvenida: 'Bono de bienvenida', servicio: 'Servicio (ganancia neta)', perdida: 'Servicio con pérdidas', reto_diario: 'Reto del día', mercado: 'Mercado',
  compra_restaurant: 'Abrir restaurante', compra_recipe: 'Aprender receta', compra_upgrade: 'Mejora de cocina', reembolso_mejora: 'Reembolso: mesas extra', logro: 'Logro', contrato: 'Contrato de ayudante', decoracion: 'Decoración del local', reembolso_decoracion: 'Reembolso: decoración retirada'
};

async function openLedger() {
  let entries = [];
  try { entries = (await app.api.ledger()).entries; } catch (err) { errorToast(err); return; }
  openSheet(`
    <div class="sheet__head"><h2>Historial de monedas</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
    <div class="ticket">${entries.length ? entries.map((e) => `
      <div class="ticket__row"><span>${REASONS[e.reason] ?? e.reason}<br><small class="note">${new Date(e.createdAt).toLocaleString('es')}</small></span>
      <b class="${e.delta >= 0 ? 'pos' : 'neg'}">${e.delta >= 0 ? '+' : ''}${fmt(e.delta)}</b></div>`).join('') : '<div class="empty">Sin movimientos</div>'}
    </div>`);
}

// ── Partida ─────────────────────────────────────────────────
async function play(restaurantId, mode) {
  if (app.busy) return;
  app.busy = true;
  sfx.tap();
  let run;
  try {
    run = await app.api.startRun(restaurantId, mode);
  } catch (err) {
    app.busy = false;
    errorToast(err);
    if (err.code === 'despensa_vacia') go('market');
    return;
  }
  app.busy = false;
  root.querySelector('.cart-bar')?.remove();
  applyTheme(run.config.restaurantId);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const firstTime = localGet('afuego.tutorial') !== '2';
  const kitchen = new Kitchen(host, {
    config: run.config,
    restaurant: RESTAURANT_BY_ID[run.config.restaurantId],
    decor: decorOf(st()).equipped,
    firstTime,
    onQuit: () => {
      app.api.abandonRun(run.runId);
      host.remove();
      applyTheme(app.restaurantId);
    },
    onFinish: (outcome) => {
      localSet('afuego.tutorial', '2');
      submitRun(host, kitchen, run, outcome);
    }
  });
  kitchen.mount();
}

async function submitRun(host, kitchen, run, outcome, attempt = 0) {
  try {
    const res = await app.api.completeRun(run.runId, outcome.serves, outcome.waste, outcome.emergency, outcome.firesOut);
    const rid = run.config.restaurantId;
    const stageBefore = facadeStage(st(), rid);
    kitchen.destroy();
    app.market = null;
    showResults(host, run, res, outcome);
    setProfile(res.profile);
    // Si la fachada del local subió de etapa, se avisa al terminar.
    const stageAfter = facadeStage(st(), rid);
    if (stageAfter > stageBefore) setTimeout(() => toast(`¡Tu fachada mejoró! ${RESTAURANT_BY_ID[rid].name}: ${FACADE_STAGES[stageAfter]}`, 'good'), 1800);
  } catch (err) {
    if (err.status === 0 && attempt < 3) return setTimeout(() => submitRun(host, kitchen, run, outcome, attempt + 1), 1500);
    kitchen.destroy();
    host.innerHTML = `<div class="game"><div class="results">
      <h1>Ups…</h1><p class="note" style="color:#EADBD0;text-align:center">${escapeHtml(err.message)}${err.details?.reason ? ` (${escapeHtml(err.details.reason)})` : ''}</p>
      <div class="results__actions"><button class="btn btn--xl btn--gold" data-act="home">Volver</button></div></div></div>`;
    host.querySelector('[data-act="home"]').addEventListener('click', () => { host.remove(); applyTheme(app.restaurantId); go(app.tab); });
  }
}

// Lo que aportó el ayudante en el servicio, su sueldo y cuánto le falta para el siguiente rango.
function helperSummary(result, run, profile, hs = {}) {
  const m = STAFF_BY_ID[result.staff];
  if (!m) return '';
  const before = run.config.staff?.rank ?? 0;
  const exp = profile.state.staff?.exp?.[m.id] ?? 0;
  const rank = staffRank(exp);
  const did = !m.stations.length ? `Atendió la barra: <b>+${fmt(result.staffBonus ?? 0)}</b> monedas extra por los ${result.served} platos, con clientes más pacientes.`
    : m.id === 'pepe' ? `Hizo <b>${hs.cuts ?? 0}</b> cortes por ti.`
      : `Volteó <b>${hs.flips ?? 0}</b> y sacó <b>${hs.saves ?? 0}</b> a tiempo por ti.`;
  const next = STAFF_RANKS[rank + 1];
  // En la arepera la sartén se llama budare.
  const local = (t) => (RESTAURANT_BY_ID[run.config.restaurantId].stationNames?.sarten ? t.replace(/las dos sartenes/g, 'los dos budares').replace(/una sartén/g, 'un budare').replace(/la sartén/g, 'el budare') : t);
  const growth = rank > before
    ? `<b>¡Ahora es ${rankName(m, rank)}!</b> ${m.levels[rank].perk}`
    : next ? `${rankName(m, rank + 1)} en ${next.from - exp} ${next.from - exp === 1 ? 'servicio' : 'servicios'}: ${m.levels[rank + 1].perk.charAt(0).toLowerCase()}${m.levels[rank + 1].perk.slice(1)}`
      : `${rankName(m, rank)}: ${m.levels[rank].perk.charAt(0).toLowerCase()}${m.levels[rank].perk.slice(1)}`;
  return `<div class="helper-sum ${rank > before ? 'is-up' : ''}">
    <span class="staff-face">${staffSvg(m)}</span>
    <div><small>${escapeHtml(m.name)} · ${rankName(m, before)} · sueldo ${fmt(result.salary)}</small><p>${did}</p><p class="helper-sum__next">${local(growth)}</p></div>
  </div>`;
}

const REVIEWS = [
  ['Me fui con hambre… ¿abren mañana?', 'Esperé tanto que me creció la barba.'],
  ['Estaba rico, cuando por fin llegó.', 'Buen sazón, pero el servicio puede mejorar.'],
  ['¡Muy rico! Volveré con mis amigos.', 'Rápido y sabroso. El chef sabe lo que hace.'],
  ['¡El mejor plato de mi vida! Vuelvo mañana con toda mi familia.', 'Rapidísimo y delicioso. Cinco estrellas no alcanzan.']
];
const HEADLINES = ['Hay que practicar', 'Servicio completado', '¡Buen servicio!', '¡Servicio perfecto!'];

function showResults(host, run, res, outcome = {}) {
  const { result, rewards, levelUp, profile } = res;
  const rest = RESTAURANT_BY_ID[run.config.restaurantId];
  const quote = REVIEWS[result.stars][Math.floor(Math.random() * 2)];
  const goal = profile.nextGoal;
  const wasted = Object.values(result.waste ?? {}).reduce((a, n) => a + n, 0);
  const achievementCoins = (rewards.achievements ?? []).reduce((a, x) => a + x.reward, 0);
  const net = result.coins + rewards.dailyBonus + achievementCoins;
  // Una pérdida se paga hasta donde alcance la caja.
  // (st() todavía tiene la caja de antes del servicio: el perfil nuevo se aplica después.)
  const paidLoss = net < 0 ? Math.max(0, st().coins - profile.state.coins) : 0;
  host.innerHTML = `
    <div class="game"><div class="game__inner" style="display:flex">
      <div class="results">
        <div class="results__kicker">${rest.name.toUpperCase()}${run.config.mode === 'daily' ? ' · RETO DEL DÍA' : ''}</div>
        <h1>${result.closed ? '¡Te cerraron la cocina!' : result.coins < 0 ? 'Servicio con pérdidas' : HEADLINES[result.stars]}</h1>
        <div class="stars">${[0, 1, 2].map((i) => starSvg(`star ${i < result.stars ? 'is-on' : ''}`)).join('')}</div>
        <div class="results__coins ${net < 0 ? 'is-loss' : ''}">${coinSvg()}<span data-count>0</span></div>
        <div class="results__label">${net < 0 ? `PÉRDIDA${paidLoss < -net ? ` · pagaste ${fmt(paidLoss)} (no alcanzó la caja)` : ''}` : 'GANANCIA NETA'}</div>
        ${result.closed ? `<div class="bonus-line bonus-line--bad">${icon('heart')} Se fueron demasiados clientes enojados: el servicio terminó antes de tiempo.</div>` : ''}
        ${rewards.dailyBonus ? `<div class="bonus-line">${icon('sparkle')} Reto del día: +${fmt(rewards.dailyBonus)}</div>` : ''}
        ${(rewards.achievements ?? []).map((x, i) => `<div class="achievement-pop" style="animation-delay:${0.6 + i * 0.35}s">${icon('medal')}<span><small>¡Logro desbloqueado!</small>${escapeHtml(x.name)}</span><b>+${fmt(x.reward)}</b></div>`).join('')}
        <div class="bubbles">
          <div><b>${result.served}/${result.totalOrders}</b><span>clientes</span></div>
          <div><b>${result.vipServed}/${result.vipTotal}</b><span>críticos</span></div>
          <div><b>×${result.bestCombo}</b><span>combo</span></div>
          <div><b>${result.perfects}</b><span>perfectos</span></div>
          ${result.groupsTotal ? `<div><b>${result.groupsServed}/${result.groupsTotal}</b><span>grupos</span></div>` : ''}
        </div>
        <div class="ticket">
          <div class="ticket__row"><span>Ventas y propinas</span><b class="pos">+${fmt(result.gross)}</b></div>
          <div class="ticket__row"><span>Gastos del local</span><b class="neg">−${fmt(result.upkeep)}</b></div>
          ${result.salary ? `<div class="ticket__row"><span>Sueldo de ${escapeHtml(STAFF_BY_ID[result.staff]?.name ?? 'tu asistente')}</span><b class="neg">−${fmt(result.salary)}</b></div>` : ''}
          ${result.emergencyCost ? `<div class="ticket__row"><span>Pedidos urgentes</span><b class="neg">−${fmt(result.emergencyCost)}</b></div>` : ''}
          ${rewards.dailyBonus ? `<div class="ticket__row"><span>Bono reto del día</span><b class="pos">+${fmt(rewards.dailyBonus)}</b></div>` : ''}
          ${achievementCoins ? `<div class="ticket__row"><span>Premios por logros</span><b class="pos">+${fmt(achievementCoins)}</b></div>` : ''}
          <div class="ticket__row is-total"><span>${net < 0 ? 'Pérdida' : 'Ganancia'}</span><b class="${net < 0 ? 'neg' : ''}">${fmt(net)}</b></div>
          <div class="ticket__row"><span class="note">Ingredientes usados${wasted ? `, ${wasted} desperdiciados` : ''} (ya pagados en el mercado)</span><b class="note">~${fmt(result.ingredientCost)}</b></div>
        </div>
        ${helperSummary(result, run, profile, outcome.helperStats)}
        ${levelUp ? `<div class="levelup">${starSvg('')} ¡Subiste a nivel ${levelUp}! Hay recetas y locales nuevos.</div>` : ''}
        <div class="review"><span class="review__face">${customerSvg(Math.floor(Math.random() * 6), result.stars >= 2 ? 'happy' : result.stars === 1 ? 'worried' : 'angry', '')}</span>
          <div><small>Reseña de un cliente</small><p>“${quote}”</p></div></div>
        <div class="results__actions">
          <button class="btn btn--xl" data-act="again">Otro servicio</button>
          <button class="btn btn--gold btn--wide" data-act="market">${icon('market')} Ir al mercado</button>
          <button class="btn btn--ghost btn--wide" data-act="invest">${icon('arrow')} Meta: ${escapeHtml(goal.name)}</button>
        </div>
      </div>
    </div></div>`;
  countUp(host.querySelector('[data-count]'), net, { ms: 1400 });
  (rewards.achievements ?? []).forEach((_, i) => setTimeout(() => sfx.logro(), 600 + i * 350));
  for (let i = 0; i < result.stars; i++) setTimeout(() => sfx.star(i), 350 * i + 100);
  if (!result.closed && net >= 0 && (result.stars === 3 || levelUp || achievementCoins)) confetti(host.querySelector('.results'), [rest.theme.primary, '#FFC23D', '#fff']);
  const close = (tab) => { host.remove(); applyTheme(app.restaurantId); go(tab); };
  host.querySelector('[data-act="again"]').addEventListener('click', () => { host.remove(); play(run.config.restaurantId, 'normal'); });
  host.querySelector('[data-act="market"]').addEventListener('click', () => close('market'));
  host.querySelector('[data-act="invest"]').addEventListener('click', () => {
    if (goal.kind === 'recipe') { app.recipeTab = RECIPE_BY_ID[goal.id].restaurant; close('recipes'); }
    else if (goal.kind === 'restaurant') { close('home'); openRestaurant(RESTAURANT_BY_ID[goal.id]); }
    else close('upgrades');
  });
}
