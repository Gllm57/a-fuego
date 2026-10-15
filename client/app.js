// Aplicación: pantallas, navegación y flujo de partidas.

import { RESTAURANTS, RESTAURANT_BY_ID, RECIPES, UPGRADES, INGREDIENTS, PROCESSES, recipesOf, kitchenStats, upgradeLevel } from './shared/index.js';
import { createApi, ApiError } from './api.js';
import { Kitchen } from './game.js';
import { sfx, getPrefs, setPref } from './audio.js';
import { ingredientSvg, processSvg, icon, coinSvg, starSvg, storefrontSvg, panLogoSvg, UPGRADE_ICONS, customerSvg, plateSvgItems } from './art.js';
import { toast, openSheet, countUp, confetti, escapeHtml, fmt } from './ui.js';

const app = {
  api: null,
  profile: null,
  tab: 'home',
  restaurantId: localGet('afuego.restaurant') ?? 'taqueria',
  recipeTab: null,
  boardTab: null,
  busy: false
};

const root = document.getElementById('app');

boot();

// Instalable y jugable sin conexión (se ignora donde no hay service workers).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.ground);
}

function setProfile(next) {
  const prevCoins = app.profile?.state.coins ?? 0;
  app.profile = next;
  renderTopbar();
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

// ── Estructura ──────────────────────────────────────────────
const TABS = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'recipes', label: 'Recetas', icon: 'book' },
  { id: 'upgrades', label: 'Mejoras', icon: 'tools' },
  { id: 'ranking', label: 'Ranking', icon: 'trophy' }
];

function renderShell() {
  applyTheme(app.restaurantId);
  root.innerHTML = `
    <header class="topbar"></header>
    <main class="screen" id="screen" tabindex="-1"></main>
    <nav class="nav" aria-label="Secciones">
      ${TABS.map((t) => `<button class="nav__btn" data-tab="${t.id}">${icon(t.icon)}${t.label}<span class="nav__dot" hidden></span></button>`).join('')}
    </nav>`;
  root.querySelector('.nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b && b.dataset.tab !== app.tab) { sfx.tap(); go(b.dataset.tab); }
  });
  renderTopbar();
  go(app.tab);
}

function go(tab) {
  app.tab = tab;
  root.querySelectorAll('.nav__btn').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  const screen = document.getElementById('screen');
  screen.style.animation = 'none'; void screen.offsetWidth; screen.style.animation = '';
  screen.scrollTop = 0;
  ({ home: renderHome, recipes: renderRecipes, upgrades: renderUpgrades, ranking: renderRanking })[tab]();
  renderNavDots();
}

function renderNavDots() {
  const s = st();
  const canLearn = RECIPES.some((r) => !s.recipes.includes(r.id) && s.restaurants.includes(r.restaurant) && level() >= r.reqLevel && s.coins >= r.learnCost);
  const canUpgrade = UPGRADES.some((u) => upgradeLevel(s.upgrades, u.id) < u.costs.length && s.coins >= u.costs[upgradeLevel(s.upgrades, u.id)]);
  root.querySelector('[data-tab="recipes"] .nav__dot').hidden = !canLearn;
  root.querySelector('[data-tab="upgrades"] .nav__dot').hidden = !canUpgrade;
}

function renderTopbar() {
  const bar = root.querySelector('.topbar');
  if (!bar) return;
  const { level: lvl } = app.profile;
  const pct = Math.round((lvl.current / lvl.needed) * 100);
  bar.innerHTML = `
    <button class="chef-btn" data-act="profile" aria-label="Perfil y ajustes">
      <span class="lvl-ring" style="--p:${pct}"><span class="lvl-ring__inner">${lvl.level}</span></span>
      <span style="min-width:0">
        <span class="chef-btn__name" style="display:block">${escapeHtml(app.profile.player.displayName)}</span>
        <span class="chef-btn__title">${app.profile.empire.title}</span>
      </span>
    </button>
    <div class="coin-pill" aria-label="Monedas">${coinSvg()}<span class="coin-pill__num">${fmt(st().coins)}</span></div>`;
  bar.querySelector('[data-act="profile"]').addEventListener('click', openProfile);
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

  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div class="stagger" style="display:flex;flex-direction:column;gap:16px">
      <section class="card empire" aria-label="Tu imperio">
        <div class="empire__head">
          <div>
            <div class="empire__kicker">TU CADENA ¡A FUEGO!</div>
            <h1 class="empire__title">${empire.title}</h1>
          </div>
          <div class="empire__pct">${empire.percent}%</div>
        </div>
        <div class="progress"><div class="progress__fill" style="width:${empire.percent}%"></div></div>
        <div class="empire__stats">
          <div class="empire__stat"><b>${empire.restaurants}/${empire.restaurantsTotal}</b><span>restaurantes</span></div>
          <div class="empire__stat"><b>${empire.recipes}/${empire.recipesTotal}</b><span>recetas</span></div>
          <div class="empire__stat"><b>Nv. ${level()}</b><span>chef</span></div>
        </div>
        <button class="goal" data-act="goal" style="border:0;color:inherit;cursor:pointer;text-align:left;font:inherit">
          <span class="goal__icon">${icon('flag', 'style="color:#24160E"')}</span>
          <span class="goal__body">
            <span class="goal__label">SIGUIENTE META</span>
            <span class="goal__name">${escapeHtml(goal.name)}</span>
            <span class="progress"><span class="progress__fill" style="display:block;width:${goalPct}%"></span></span>
            <span class="goal__label" style="letter-spacing:0">${goalNote}</span>
          </span>
        </button>
      </section>

      <div class="section-title"><h2>Tus restaurantes</h2><span>Desliza →</span></div>
      <div class="rest-scroller" role="list">
        ${RESTAURANTS.map((r) => restaurantCard(r)).join('')}
      </div>

      <button class="btn btn--xl btn--shine" data-act="play">${icon('play', 'style="width:26px;height:26px;fill:#fff;stroke:none"')} Abrir servicio</button>
      <p class="note" style="text-align:center;margin:-6px 0 0">En ${escapeHtml(rest.name)} · ${recipesOf(rest.id).filter((x) => s.recipes.includes(x.id)).length} platos en el menú</p>

      <section class="card daily" aria-label="Reto del día">
        <div class="daily__icon">${icon('clock', 'style="color:#fff"')}</div>
        <div class="daily__body">
          <div class="daily__kicker">RETO DEL DÍA</div>
          <div class="daily__title">2 estrellas en ${escapeHtml(dailyRest.name)}</div>
          <div class="daily__reward">Premio extra: ${coinSvg()} ${fmt(daily.reward)}</div>
        </div>
        ${daily.claimed
          ? `<span class="done-badge">${icon('check', 'style="width:20px;height:20px"')} Hecho</span>`
          : `<button class="btn btn--sm" data-act="daily">Jugar</button>`}
      </section>
    </div>`;

  screen.querySelector('[data-act="play"]').addEventListener('click', () => play(app.restaurantId, 'normal'));
  screen.querySelector('[data-act="daily"]')?.addEventListener('click', () => play(daily.restaurantId, 'daily'));
  screen.querySelector('[data-act="goal"]').addEventListener('click', () => {
    if (goal.kind === 'recipe') { app.recipeTab = RECIPES.find((r) => r.id === goal.id).restaurant; go('recipes'); }
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
      requestAnimationFrame(() => document.querySelector(`[data-rest="${r.id}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }));
    } else {
      openRestaurant(r);
    }
  }));
  requestAnimationFrame(() => screen.querySelector(`[data-rest="${app.restaurantId}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }));
}

function restaurantCard(r) {
  const s = st();
  const owned = s.restaurants.includes(r.id);
  const recipes = recipesOf(r.id);
  const learned = recipes.filter((x) => s.recipes.includes(x.id)).length;
  return `
    <button class="rest ${owned ? '' : 'is-locked'}" role="listitem" data-rest="${r.id}" aria-pressed="${r.id === app.restaurantId}"
      style="--r-brand:${r.theme.primary};--r-soft:${r.theme.soft}">
      <span class="rest__art">${storefrontSvg(r.theme)}
        ${owned ? '' : `<span class="rest__lock">${icon('lock')}<span>${level() < r.reqLevel ? `Nivel ${r.reqLevel}` : 'Disponible'} · ${coinSvg()} ${fmt(r.cost)}</span></span>`}
      </span>
      <span class="rest__body">
        <span class="rest__cuisine">Cocina ${r.cuisine}</span>
        <span class="rest__name">${r.name}</span>
        <span class="rest__meta"><span>${learned}/${recipes.length} recetas</span>${owned ? `<span>${r.id === app.restaurantId ? '● Seleccionado' : 'Toca para elegir'}</span>` : ''}</span>
      </span>
    </button>`;
}

function openRestaurant(r) {
  const s = st();
  const can = level() >= r.reqLevel && s.coins >= r.cost;
  const reason = level() < r.reqLevel ? `Necesitas nivel de chef ${r.reqLevel} (tienes ${level()}).` : s.coins < r.cost ? `Te faltan ${fmt(r.cost - s.coins)} monedas.` : '¡Ya puedes abrirlo!';
  const recipes = recipesOf(r.id);
  openSheet(`
    <div class="sheet__head"><h2>${r.name}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
    <div class="rest__art" style="height:140px;border-radius:20px;background:${r.theme.soft}">${storefrontSvg(r.theme)}</div>
    <p class="note">Cocina ${r.cuisine}. Abre este local para servir ${recipes.length} recetas nuevas; ${recipes.filter((x) => x.learnCost === 0).length} vienen incluidas.</p>
    <div class="comp-list">${recipes.map((x) => `<span class="comp">${ingredientSvg(x.components[0].ingredient)}${escapeHtml(x.name)}</span>`).join('')}</div>
    <p class="note"><strong>${reason}</strong></p>
    <button class="btn btn--xl btn--gold" data-buy ${can ? '' : 'disabled'}>${coinSvg()} Abrir por ${fmt(r.cost)}</button>
  `, (sheet, close) => {
    sheet.querySelector('[data-buy]').addEventListener('click', async () => {
      const ok = await buy('restaurant', r.id);
      if (ok) {
        close();
        app.restaurantId = r.id;
        localSet('afuego.restaurant', r.id);
        applyTheme(r.id);
        confetti(document.body, [r.theme.primary, '#FFC23D', '#fff', r.theme.deep]);
        toast(`¡Abriste ${r.name}!`, 'good');
        go('home');
      }
    });
  });
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

// ── Recetas ─────────────────────────────────────────────────
function renderRecipes() {
  const s = st();
  app.recipeTab ??= app.restaurantId;
  const rid = app.recipeTab;
  const rest = RESTAURANT_BY_ID[rid];
  const list = recipesOf(rid);
  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div class="section-title"><h2>Recetario</h2><span>${s.recipes.length}/${RECIPES.length} aprendidas</span></div>
    <div class="chips" role="group" aria-label="Restaurante">
      ${RESTAURANTS.map((r) => `<button class="chip" data-chip="${r.id}" aria-pressed="${r.id === rid}">${s.restaurants.includes(r.id) ? '' : icon('lock')}${r.cuisine}</button>`).join('')}
    </div>
    ${s.restaurants.includes(rid) ? '' : `<div class="card" style="display:flex;gap:12px;align-items:center">${icon('lock', 'style="width:28px;height:28px;flex-shrink:0"')}<span class="note"><strong>${rest.name}</strong> está cerrado. Ábrelo desde Inicio para aprender estas recetas.</span></div>`}
    <div class="stagger" style="display:flex;flex-direction:column;gap:10px">
      ${list.map((r) => recipeCard(r)).join('')}
    </div>
    <p class="note" style="text-align:center">Cada receta nueva entra a tu menú y los clientes empezarán a pedirla. Los platos más elaborados pagan más.</p>`;
  screen.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); app.recipeTab = b.dataset.chip; renderRecipes(); }));
  screen.querySelectorAll('[data-learn]').forEach((b) => b.addEventListener('click', async () => {
    if (await buy('recipe', b.dataset.learn)) { toast('¡Receta aprendida! Ya está en tu menú', 'good'); renderRecipes(); }
  }));
}

function recipeCard(r) {
  const s = st();
  const owned = s.recipes.includes(r.id);
  const open = s.restaurants.includes(r.restaurant);
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
        <div class="recipe__row"><span class="recipe__price">Paga ${coinSvg()} ${r.price}+ propina</span>${action}</div>
      </div>
    </article>`;
}

// ── Mejoras ─────────────────────────────────────────────────
function renderUpgrades() {
  const s = st();
  const now = kitchenStats(s.upgrades);
  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div class="section-title"><h2>Mejoras de cocina</h2><span>Aplican a todos tus locales</span></div>
    <div class="stagger" style="display:flex;flex-direction:column;gap:10px">
      ${UPGRADES.map((u) => {
        const lvl = upgradeLevel(s.upgrades, u.id);
        const max = lvl >= u.costs.length;
        const price = max ? 0 : u.costs[lvl];
        return `
        <article class="card upgrade">
          <div class="upgrade__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UPGRADE_ICONS[u.id]}</svg></div>
          <div>
            <div class="upgrade__name">${u.name}</div>
            <div class="upgrade__desc">${u.desc}</div>
            <div class="pips" aria-label="Nivel ${lvl} de ${u.costs.length}">${u.costs.map((_, i) => `<span class="pip ${i < lvl ? 'is-on' : ''}" style="animation-delay:${i * 60}ms"></span>`).join('')}</div>
            <div class="upgrade__foot">
              <span class="upgrade__effect">${upgradeEffect(u.id, now)}</span>
              ${max ? `<span class="tag tag--ok">${icon('check')} Máximo</span>` : `<button class="btn btn--sm" data-up="${u.id}" ${s.coins < price ? 'disabled' : ''}>${coinSvg()} ${fmt(price)}</button>`}
            </div>
          </div>
        </article>`;
      }).join('')}
    </div>`;
  screen.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', async () => {
    if (await buy('upgrade', b.dataset.up)) { toast('¡Mejora instalada!', 'good'); renderUpgrades(); }
  }));
}

function upgradeEffect(id, k) {
  switch (id) {
    case 'cuchillos': return `${k.taps.cortar} cortes por ingrediente`;
    case 'batidora': return `${k.taps.batir} toques para batir`;
    case 'sarten': return `Fríe en ${k.seconds.freir.toFixed(1)} s`;
    case 'horno': return `Hornea en ${k.seconds.hornear.toFixed(1)} s`;
    case 'olla': return `Hierve en ${k.seconds.hervir.toFixed(1)} s`;
    case 'campana': return `Se quema tras ${k.burnSeconds.freir.toFixed(1)} s`;
    case 'ambiente': return `Paciencia ×${k.patienceMult.toFixed(1)} · propina +${Math.round(k.tipBonus * 100)}%`;
    case 'mesas': return `${k.slots} clientes a la vez`;
    default: return '';
  }
}

// ── Ranking ─────────────────────────────────────────────────
async function renderRanking() {
  const s = st();
  app.boardTab = s.restaurants.includes(app.boardTab) ? app.boardTab : app.restaurantId;
  const screen = document.getElementById('screen');
  screen.innerHTML = `
    <div class="section-title"><h2>Ranking semanal</h2><span>Mejor servicio</span></div>
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
    box.innerHTML = `${data.local ? '<p class="note" style="margin:0 0 8px">Sin conexión al servidor: se muestra tu mejor marca en este dispositivo.</p>' : ''}
      <div class="stagger">${data.entries.map((e) => `
        <div class="board-row ${e.me ? 'is-me' : ''}">
          <div class="board-rank">${e.rank <= 3 ? `<span class="medal medal--${e.rank}">${e.rank}</span>` : e.rank}</div>
          <div class="board-name">${escapeHtml(e.name)}${e.me ? ' (tú)' : ''}</div>
          <div class="board-score">${fmt(e.score)}</div>
        </div>`).join('')}</div>`;
  } catch (err) {
    box.innerHTML = `<div class="empty">No se pudo cargar el ranking.</div>`;
  }
}

// ── Perfil y ajustes ────────────────────────────────────────
function openProfile() {
  const p = app.profile;
  const prefs = getPrefs();
  const online = app.api.mode === 'online';
  openSheet(`
    <div class="sheet__head"><h2>Tu chef</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
    <div class="card" style="display:flex;gap:14px;align-items:center">
      ${customerSvg(1, 'happy', 'customer__face" style="width:64px;height:64px;flex-shrink:0')}
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:17px">${escapeHtml(p.player.displayName)}</div>
        <div class="note">${p.empire.title} · Nivel ${p.level.level}</div>
        <div class="progress" style="margin-top:6px"><div class="progress__fill" style="width:${Math.round(p.level.current / p.level.needed * 100)}%"></div></div>
        <div class="note" style="font-size:11px;margin-top:3px">${fmt(p.level.current)} / ${fmt(p.level.needed)} XP para nivel ${p.level.level + 1}</div>
      </div>
    </div>
    <div class="card">
      <div class="switch-row"><span>Sonido</span><button class="switch" role="switch" data-pref="sound" aria-checked="${prefs.sound}" aria-label="Sonido"></button></div>
      <div class="switch-row"><span>Vibración</span><button class="switch" role="switch" data-pref="haptics" aria-checked="${prefs.haptics}" aria-label="Vibración"></button></div>
    </div>
    <button class="btn btn--ghost btn--wide" data-act="ledger">${icon('refresh')} Historial de monedas</button>
    ${online ? accountSection(p) : `<div class="card"><p class="note" style="margin:0 0 10px">Jugando sin servidor: tu progreso se guarda sólo en este dispositivo.</p><button class="btn btn--ghost btn--wide" data-act="reset">Borrar progreso</button></div>`}
  `, (sheet, close) => {
    sheet.querySelectorAll('[data-pref]').forEach((b) => b.addEventListener('click', () => {
      const v = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', String(v));
      setPref(b.dataset.pref, v);
      if (v) sfx.tap();
    }));
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
      app.restaurantId = 'taqueria';
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
      <p class="note" style="margin:0">Guarda tu progreso con un usuario para no perderlo y jugar en otros dispositivos.</p>
      <div class="field"><label for="u">Usuario</label><input id="u" name="username" autocomplete="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.\\-]+"></div>
      <div class="field"><label for="pw">Contraseña</label><input id="pw" name="password" type="password" autocomplete="current-password" required minlength="8"></div>
      <button class="btn btn--wide" type="submit" value="register">Guardar mi cuenta</button>
      <button class="btn btn--ghost btn--wide" type="submit" value="login">Ya tengo cuenta: entrar</button>
    </form>`;
}

const REASONS = {
  bono_bienvenida: 'Bono de bienvenida', servicio: 'Servicio', reto_diario: 'Reto del día',
  compra_restaurant: 'Abrir restaurante', compra_recipe: 'Aprender receta', compra_upgrade: 'Mejora de cocina'
};

async function openLedger() {
  let entries = [];
  try { entries = (await app.api.ledger()).entries; } catch (err) { errorToast(err); return; }
  openSheet(`
    <div class="sheet__head"><h2>Historial de monedas</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
    <div class="card">${entries.length ? entries.map((e) => `
      <div class="ledger-row"><span>${REASONS[e.reason] ?? e.reason}<br><small class="note">${new Date(e.createdAt).toLocaleString('es')}</small></span>
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
    return;
  }
  app.busy = false;
  applyTheme(run.config.restaurantId);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const firstTime = !localGet('afuego.tutorial');
  const kitchen = new Kitchen(host, {
    config: run.config,
    restaurant: RESTAURANT_BY_ID[run.config.restaurantId],
    firstTime,
    onQuit: () => {
      app.api.abandonRun(run.runId);
      host.remove();
      applyTheme(app.restaurantId);
    },
    onFinish: (outcome) => {
      localSet('afuego.tutorial', '1');
      submitRun(host, kitchen, run, outcome);
    }
  });
  kitchen.mount();
}

async function submitRun(host, kitchen, run, outcome, attempt = 0) {
  try {
    const res = await app.api.completeRun(run.runId, outcome.serves);
    kitchen.destroy();
    showResults(host, run, res);
    setProfile(res.profile);
  } catch (err) {
    if (err.status === 0 && attempt < 3) return setTimeout(() => submitRun(host, kitchen, run, outcome, attempt + 1), 1500);
    kitchen.destroy();
    host.innerHTML = `<div class="game"><div class="results">
      <h1>Ups…</h1><p class="note" style="color:#EADBD0;text-align:center">${escapeHtml(err.message)}${err.details?.reason ? ` (${escapeHtml(err.details.reason)})` : ''}</p>
      <div class="results__actions"><button class="btn btn--xl btn--gold" data-act="home">Volver</button></div></div></div>`;
    host.querySelector('[data-act="home"]').addEventListener('click', () => { host.remove(); applyTheme(app.restaurantId); go(app.tab); });
  }
}

const REVIEWS = [
  ['Me fui con hambre… ¿abren mañana?', 'Esperé tanto que me creció la barba.'],
  ['Estaba rico, cuando por fin llegó.', 'Buen sazón, pero el servicio puede mejorar.'],
  ['¡Muy rico! Volveré con mis amigos.', 'Rápido y sabroso. El chef sabe lo que hace.'],
  ['¡El mejor plato de mi vida! Vuelvo mañana con toda mi familia.', 'Rapidísimo y delicioso. Cinco estrellas no alcanzan.']
];
const HEADLINES = ['Hay que practicar', 'Servicio completado', '¡Buen servicio!', '¡Servicio perfecto!'];

function showResults(host, run, res) {
  const { result, rewards, levelUp, profile } = res;
  const rest = RESTAURANT_BY_ID[run.config.restaurantId];
  const quote = REVIEWS[result.stars][Math.floor(Math.random() * 2)];
  const goal = profile.nextGoal;
  host.innerHTML = `
    <div class="game"><div class="game__inner" style="padding:0;display:flex">
      <div class="results">
        <div class="results__kicker">${rest.name.toUpperCase()}${run.config.mode === 'daily' ? ' · RETO DEL DÍA' : ''}</div>
        <h1>${HEADLINES[result.stars]}</h1>
        <div class="stars">${[0, 1, 2].map((i) => starSvg(`star ${i < result.stars ? 'is-on' : ''}`)).join('')}</div>
        <div class="results__coins">${coinSvg()}<span data-count>0</span></div>
        ${rewards.dailyBonus ? `<div class="bonus-line">${icon('sparkle', 'style="width:20px;height:20px"')} Reto del día: +${fmt(rewards.dailyBonus)}</div>` : ''}
        <div class="results__grid">
          <div class="stat"><b>${result.served}/${result.totalOrders}</b><span>clientes</span></div>
          <div class="stat"><b>x${result.bestCombo}</b><span>combo máx.</span></div>
          <div class="stat"><b>${result.perfects}</b><span>perfectos</span></div>
        </div>
        ${levelUp ? `<div class="levelup">${starSvg('coin')} ¡Subiste a nivel ${levelUp}! Nuevas recetas y locales disponibles.</div>` : ''}
        <div class="review">${customerSvg(Math.floor(Math.random() * 6), result.stars >= 2 ? 'happy' : result.stars === 1 ? 'worried' : 'angry')}
          <div><small>Reseña de un cliente</small><p>“${quote}”</p></div></div>
        <div class="results__actions">
          <button class="btn btn--xl" data-act="again">Otro servicio</button>
          <button class="btn btn--gold btn--wide" data-act="invest">${icon('arrow')} Invertir: ${escapeHtml(goal.name)}</button>
          <button class="btn btn--ghost btn--wide" data-act="home">Volver al inicio</button>
        </div>
      </div>
    </div></div>`;
  countUp(host.querySelector('[data-count]'), rewards.coins + rewards.dailyBonus, { ms: 1400 });
  for (let i = 0; i < result.stars; i++) setTimeout(() => sfx.star(i), 350 * i + 100);
  if (result.stars === 3 || levelUp) confetti(host.querySelector('.results'), [rest.theme.primary, '#FFC23D', '#fff']);
  const close = (tab) => { host.remove(); applyTheme(app.restaurantId); go(tab); };
  host.querySelector('[data-act="again"]').addEventListener('click', () => { host.remove(); play(run.config.restaurantId, 'normal'); });
  host.querySelector('[data-act="home"]').addEventListener('click', () => close('home'));
  host.querySelector('[data-act="invest"]').addEventListener('click', () => {
    if (goal.kind === 'recipe') { app.recipeTab = RECIPES.find((r) => r.id === goal.id).restaurant; close('recipes'); }
    else if (goal.kind === 'restaurant') { close('home'); openRestaurant(RESTAURANT_BY_ID[goal.id]); }
    else close('upgrades');
  });
}
