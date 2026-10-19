// Motor de la cocina. Corre a 60 fps con requestAnimationFrame y registra
// qué pedidos se sirvieron, cuándo y qué se desperdició; el servidor valida y paga.

import {
  RECIPE_BY_ID, PROCESSES, STATIONS, STATION_IDS, INGREDIENTS, ordersForConfig, plateEarnings,
  rushWindow, generateEvents, PERFECT_WINDOW_MS, MAX_COMBO_STEPS, MIN_TAP_MS, FIRE_TAPS,
  EMERGENCY_MAX_UNITS, EMERGENCY_DELAY_MS, GROUP_WINDOW_MS, GROUP_BONUS, STAFF_BY_ID, STAFF_RANKS, rankName, SERVICE_LIVES
} from './shared/index.js';
import { ingredientSvg, processSvg, customerSvg, STATION_ART, TOOL_ART, coinSvg, icon, staffSvg } from './art.js';
import { sfx, music, vibrate } from './audio.js';
import { prefTilesHtml, bindPrefTiles } from './prefs-ui.js';
import { lightsHtml, decoHtml, floorHtml, decorAttrs, awningStyle } from './decor-art.js';
import { floatText, flyIcon, flyPlate, escapeHtml, fmt } from './ui.js';
import { Coach } from './coach.js';
import { t } from './i18n.js';

const TAP_PERFECT_MS_PER_TAP = 380;

export class Kitchen {
  constructor(host, { config, restaurant, firstTime, onFinish, onQuit, decor, guide = false }) {
    // Práctica guiada: pedidos fijos, sin reloj ni prisa; el entrenador explica cada paso.
    this.guide = guide ? { step: -1, allow: null } : null;
    // Decoración elegida en «Mi local» (sólo se ve; no cambia las reglas).
    this.decor = decor ?? { toldo: 'toldo_local', pared: 'pared_lisa', luces: 'luces_colgantes', barra: 'barra_roble', deco: [] };
    this.host = host;
    this.config = config;
    this.restaurant = restaurant;
    this.firstTime = firstTime;
    this.onFinish = onFinish;
    this.onQuit = onQuit;
    this.stats = config.stats;
    this.orders = (config.orders ?? ordersForConfig(config)).map((o) => {
      const recipe = RECIPE_BY_ID[o.recipeId];
      return { ...o, recipe, status: 'waiting', filled: recipe.components.map(() => false), busy: recipe.components.map(() => false), perfects: 0 };
    });
    // Fogones: uno por tipo, más los extra comprados ("olla#2").
    // Fogones de este local: la parrilla sólo existe en los que la tienen.
    this.stationKeys = STATION_IDS.filter((st) => (this.stats.stations?.[st] ?? (STATIONS[st].grillOnly ? 0 : 1)) > 0)
      .flatMap((st) => Array.from({ length: Math.max(1, this.stats.stations?.[st] ?? 1) }, (_, i) => (i ? `${st}#${i + 1}` : st)));
    this.stations = Object.fromEntries(this.stationKeys.map((s) => [s, null]));
    this.fires = {};
    this.events = guide ? [] : generateEvents({ seed: config.seed, durationMs: config.durationMs, tier: config.tier ?? 0 }).map((e) => ({ ...e, done: false }));
    this.rush = guide ? { from: Infinity, to: Infinity, pace: 1 } : rushWindow(config.seed, config.durationMs, config.tier ?? 0);
    this.rushState = 'before';
    this.stock = { ...(config.stock ?? {}) };
    this.waste = {};
    this.emergency = {};
    this.emergencyUnits = 0;
    this.deliveries = [];
    this.t = 0;
    this.running = false;
    this.paused = false;
    this.selected = null;
    this.serves = [];
    this.combo = 0;
    this.coins = 0;
    this.firesOut = 0;
    this.groupSeen = false;
    // Vidas del servicio: sin vidas cierran la cocina antes de tiempo.
    this.lives = SERVICE_LIVES;
    this.closed = false;
    // Asistente contratado (si hay): trabaja solo en sus fogones.
    // El ayudante atiende los fogones de su rango (de experto, a veces más de uno).
    const member = config.staff ? STAFF_BY_ID[config.staff.id] : null;
    this.helper = member ? { ...member, rank: config.staff.rank, stations: member.levels[config.staff.rank]?.stations ?? member.stations, paused: false, task: '' } : null;
    // Lo que hizo durante el servicio, para el resumen final.
    this.helperStats = { cuts: 0, flips: 0, saves: 0 };
    this.itemSeq = 0;
    this.custEls = new Map();
    this.leaving = new Map();
    this.ticketHold = null;
    // Cuándo aterriza cada ingrediente en el plato o el fogón (para mostrarlo justo al llegar).
    this.landAt = new Map();
    this.onPlate = new Set();
    this.sig = { order: '', stations: {}, pantry: '' };
    this.pantryIds = [...new Set(config.menu.flatMap((id) => RECIPE_BY_ID[id].components.map((c) => c.ingredient)))];
    this.frame = this.frame.bind(this);
  }

  // ── Montaje ─────────────────────────────────────────────
  mount() {
    this.host.innerHTML = `
      <div class="game" role="application" aria-label="Cocina">
        <div class="game__inner" data-station-rows="${this.#stationRows().length}" ${decorAttrs(this.decor)} style="${awningStyle(this.decor.toldo)}">
          <div class="wall">
            <div class="hud">
              <button class="round-btn" data-act="pause" aria-label="Pausa">${icon('pause')}</button>
              <div class="timer">
                <span class="ring timer__ring"><span class="ring__inner timer__clock">${this.guide ? '∞' : clockText(this.config.durationMs)}</span></span>
                <span style="min-width:0"><span class="timer__name" style="display:block">${escapeHtml(this.restaurant.name)}</span>${this.helper
                  ? `<button class="helper-chip" data-act="helper" aria-label="Pausar o reanudar a ${escapeHtml(this.helper.name)}"><span class="helper-chip__face">${staffSvg(this.helper)}</span><span class="helper-chip__text"></span></button>`
                  : `<span class="timer__sub">${this.guide ? t('Práctica · sin reloj') : `Gastos del local: ${fmt(this.config.upkeep ?? 0)}`}</span>`}</span>
              </div>
              <span class="hud__right"><span class="hud__coins">${coinSvg()}<span class="hud__num">0</span></span>
                <span class="lives" role="img" aria-label="${SERVICE_LIVES} vidas">${Array.from({ length: SERVICE_LIVES }, () => `<span class="life">${icon('heart')}</span>`).join('')}</span></span>
            </div>
          </div>
          <div class="bar">
            ${lightsHtml(this.decor.luces)}${decoHtml(this.decor.deco, { floor: false })}${floorHtml(this.decor.deco)}
            <div class="bar__counter"></div>
            <div class="customers" data-slots="${this.stats.slots}" style="--slots:${this.stats.slots}"></div>
          </div>
          <div class="order-wrap"><div class="ticket order"></div><div class="combo" aria-live="polite"></div></div>
          <div class="counter" data-rows="${this.#stationRows().length}" style="--ring:${this.#ringSize()}">${this.#stationRows().map((row) => `<div class="counter__row">${row.map((type) => this.#stationGroup(type)).join('')}</div>`).join('')}</div>
          <div class="shelf" ${this.pantryIds.length > 15 ? 'data-many' : ''} style="--jar:${this.pantryIds.length <= 5 ? 84 : this.pantryIds.length <= 10 ? 64 : this.pantryIds.length <= 15 ? 54 : 46}px">
            <div class="shelf__head"><span class="shelf__count"></span><span class="shelf__urgent"></span></div>
            <div class="shelf__grid">${this.pantryIds.map((id) => `
              <button class="jar" data-ing="${id}" aria-label="${INGREDIENTS[id].name}"><span class="jar__glass">${ingredientSvg(id, { title: '' })}</span><span class="jar__qty"></span><span class="jar__eta" hidden></span></button>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    this.el = {
      root: this.host.querySelector('.game__inner'),
      clock: this.host.querySelector('.timer__clock'),
      ring: this.host.querySelector('.timer__ring'),
      timer: this.host.querySelector('.timer'),
      coins: this.host.querySelector('.hud__coins'),
      coinNum: this.host.querySelector('.hud__num'),
      combo: this.host.querySelector('.combo'),
      customers: this.host.querySelector('.customers'),
      lives: [...this.host.querySelectorAll('.life')],
      order: this.host.querySelector('.order'),
      stations: Object.fromEntries(this.stationKeys.map((s) => [s, this.host.querySelector(`[data-station="${s}"]`)])),
      pantry: [...this.host.querySelectorAll('.jar')],
      shelfCount: this.host.querySelector('.shelf__count'),
      urgent: this.host.querySelector('.shelf__urgent'),
      helper: this.host.querySelector('.helper-chip')
    };
    this.#bind();
    this.#renderCustomers();
    this.#renderOrder();
    this.#renderStock();
    this.stationKeys.forEach((s) => this.#renderStation(s));
    this.#helperUi(true);
    this.#intro();
  }

  #bind() {
    const root = this.el.root;
    root.addEventListener('pointerdown', (e) => {
      if (this.guide && !this.#guideAllows(e.target)) return;
      const ing = e.target.closest('[data-ing]');
      if (ing) { e.preventDefault(); return this.#onIngredient(ing.dataset.ing, ing); }
      const st = e.target.closest('[data-station]');
      if (st) { e.preventDefault(); return this.#onStation(st.dataset.station, st); }
      const cust = e.target.closest('[data-order]');
      if (cust) { e.preventDefault(); return this.#select(Number(cust.dataset.order)); }
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const target = e.target.closest('[data-ing],[data-station],[data-order]');
      if (!target || (this.guide && !this.#guideAllows(target))) return;
      e.preventDefault();
      if (target.dataset.ing) this.#onIngredient(target.dataset.ing, target);
      else if (target.dataset.station) this.#onStation(target.dataset.station, target);
      else this.#select(Number(target.dataset.order));
    });
    root.querySelector('[data-act="pause"]').addEventListener('click', () => this.pause());
    this.el.helper?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.running || this.paused) return;
      this.helper.paused = !this.helper.paused;
      sfx.tap();
      for (const st of this.stationKeys) {
        if (this.#helperAt(st)) this.el.stations[st].classList.toggle('is-helper-paused', this.helper.paused);
      }
      this.#helperUi(true);
    });
    this.onVisibility = () => { if (document.hidden && this.running) this.pause(); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onResize = () => { cancelAnimationFrame(this.fitRaf); this.fitRaf = requestAnimationFrame(() => this.#fitLayout()); };
    addEventListener('resize', this.onResize);
    this.#fitLayout();
    document.fonts?.ready.then(() => this.onResize());
  }

  // Fogones y frascos se achican lo justo para que toda la despensa quepa entera en
  // pantalla (sin frascos cortados), en cualquier alto: iPhone con Safari, Android, tablet.
  #fitLayout() {
    if (!this.el?.root?.isConnected) return;
    // Espacio a los lados de la barra para lo que el jugador puso en el piso.
    for (const side of ['l', 'r']) {
      const f = this.el.root.querySelector(`.floor--${side}`);
      this.el.customers.style.setProperty(`--floor-${side}`, f ? `${Math.ceil(f.getBoundingClientRect().width) + 2}px` : '0px');
    }
    const counter = this.el.root.querySelector('.counter');
    const shelf = this.el.root.querySelector('.shelf');
    const grid = shelf.querySelector('.shelf__grid');
    counter.style.removeProperty('--ring-max');
    const ring = parseFloat(getComputedStyle(counter).getPropertyValue('--ring-max')) || 60;
    const n = this.pantryIds.length;
    const jar = n <= 5 ? 84 : n <= 10 ? 64 : n <= 15 ? 56 : 52;
    // Los fogones se quedan de su tamaño: primero los frascos se achican un poco (así suelen
    // caber más por fila y sobra una fila entera). Los fogones sólo ceden en pantallas muy bajas.
    const fits = () => grid.scrollHeight <= grid.clientHeight + 1;
    const setJar = (k) => shelf.style.setProperty('--jar', `${Math.round(jar * k)}px`);
    let r = ring, k = 1;
    counter.style.setProperty('--ring-max', `${r}px`);
    setJar(k);
    while (!fits() && k > 0.76) setJar(k -= 0.03);
    while (!fits() && r > 48) { r -= 2; counter.style.setProperty('--ring-max', `${r}px`); }
    while (!fits() && k > 0.6) setJar(k -= 0.03);
    while (!fits() && r > 40) { r -= 2; counter.style.setProperty('--ring-max', `${r}px`); }
  }

  destroy() {
    this.running = false;
    music.stop();
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVisibility);
    removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.fitRaf);
    this.host.innerHTML = '';
  }

  // ── Práctica guiada ─────────────────────────────────────
  // Pasos del tutorial jugable. Cada paso ilumina algo y avanza con un botón,
  // cuando el jugador hace lo que se pide (on) o cuando pasa algo en la cocina (tick).
  #guideSteps() {
    const jar = (id) => () => this.el.pantry.find((b) => b.dataset.ing === id);
    const station = (st) => () => this.el.stations[st];
    const cust = (id) => () => this.custEls.get(id)?.querySelector('.avatar');
    const fry = this.#stName('sarten').toLowerCase();
    const ready = (st) => { const it = this.stations[st]; return it && it.kind === 'timer' && this.#timerState(it) === 'ready'; };
    const ing = (id) => INGREDIENTS[id].name.toLowerCase();
    return [
      { title: t('¡Bienvenido a tu cocina!'), text: t('Te enseño a cocinar paso a paso. Tranquilo: en esta práctica <b>no corre el reloj</b> y nadie se va.'), button: t('Empezar'), skip: true },
      { target: cust(0), title: t('Llegó tu primer cliente'), text: t('En su globo ves lo que quiere comer. <b>Tócalo</b> para atenderlo.'), allow: '[data-order="0"]', hand: true, on: (ev, a) => ev === 'select' && a === 0 },
      { target: () => this.el.order, title: t('Su comanda'), text: t('Aquí ves su plato: <b>{dish}</b>. Cada ficha es un ingrediente y cómo se prepara. Ve haciéndolas una por una.', { dish: t(this.orders[0].recipe.name) }), button: t('Entendido') },
      { target: jar('harina_maiz'), title: t('Saca de la despensa'), text: t('Toca la <b>{ing}</b>. Va sola al {station} para freírse.', { ing: ing('harina_maiz'), station: fry }), allow: '[data-ing="harina_maiz"]', hand: true, on: (ev, a) => ev === 'ingredient' && a === 'harina_maiz' },
      { target: station('sarten'), title: t('Se está cocinando'), text: t('Mira el anillo: se va llenando. Cuando se ponga <b>verde</b>, está listo. Espera un momento…'), tick: () => ready('sarten') },
      { target: station('sarten'), title: t('¡Listo!'), text: t('<b>Tócalo</b> para sacarlo al plato. Si lo sacas enseguida sale <b>¡Perfecto!</b> y cobras más.'), allow: '[data-station="sarten"]', hand: true, on: (ev) => ev === 'deliver' },
      { target: jar('queso'), title: t('Directo al plato'), text: t('El <b>{ing}</b> no se cocina: va crudo. Tócalo y cae directo en el plato.', { ing: ing('queso') }), allow: '[data-ing="queso"]', hand: true, on: (ev, a) => ev === 'served' && a === 0 },
      { target: () => this.el.coins, title: t('¡Servido!'), text: t('Con el plato completo se sirve solo y <b>cobras</b>. Si sirves seguido sube el <b>combo</b> y cada plato paga más.'), button: t('Siguiente'), delay: 900 },
      { enter: () => { this.orders[1].arriveAt = this.t; }, target: cust(1), title: t('Otro cliente'), text: t('Quiere <b>{dish}</b>. Tócalo para ver su comanda.', { dish: t(this.orders[1].recipe.name) }), allow: '[data-order="1"]', hand: true, on: (ev, a) => ev === 'select' && a === 1 },
      { target: jar('harina'), title: t('Dos cosas a la vez'), text: t('Empieza por lo que tarda: toca la <b>{ing}</b> para que se fría mientras haces lo demás.', { ing: ing('harina') }), allow: '[data-ing="harina"]', hand: true, on: (ev, a) => ev === 'ingredient' && a === 'harina' },
      { target: jar('queso'), title: t('Mientras se fríe…'), text: t('Este <b>{ing}</b> se corta. Tócalo para ponerlo en la tabla.', { ing: ing('queso') }), allow: '[data-ing="queso"]', hand: true, on: (ev, a) => ev === 'ingredient' && a === 'queso' },
      { target: station('tabla'), title: t('Corta, corta, corta'), text: t('Toca la <b>tabla</b> varias veces seguidas hasta terminar de cortar.'), allow: '[data-station="tabla"]', hand: true, on: (ev, a) => ev === 'deliver' && a === 'tabla' },
      { target: station('sarten'), title: t('Recógelo a tiempo'), text: t('Cuando el anillo del {station} esté <b>verde</b>, tócalo para terminar el plato. En un servicio de verdad, si tardas mucho <b>se quema</b>.', { station: fry }), allow: '[data-station="sarten"]', hand: true, on: (ev, a) => ev === 'served' && a === 1 },
      { enter: () => { this.fires.sarten = { taps: FIRE_TAPS }; this.sig.stations.sarten = ''; sfx.burn(); }, delay: 900, target: station('sarten'), title: t('¡Fuego!'), text: t('A veces se prende un fogón y no se puede usar. <b>Tócalo varias veces</b> para apagarlo.'), allow: '[data-station="sarten"]', hand: true, on: (ev) => ev === 'fireOut' },
      { target: () => this.el.root.querySelector('.lives'), title: t('Paciencia y vidas'), text: t('En un servicio de verdad, el anillo de cada cliente es su <b>paciencia</b>. Si se acaba, se va enojado y pierdes una vida. Sin vidas, cierran la cocina.'), button: t('Siguiente') },
      { target: () => this.el.timer, title: t('El reloj'), text: t('Cada servicio dura un minuto y medio. Atiende a todos los que puedas; al final pagas los gastos del local con lo que ganaste.'), button: t('Siguiente') },
      { target: () => this.el.root.querySelector('.shelf__head'), title: t('Tu despensa'), text: t('El número de cada frasco es lo que te queda. Si algo se agota, tócalo y llega un <b>pedido urgente</b> al doble de precio. Compra más en el mercado.'), button: t('Siguiente') },
      { title: t('¡Ya sabes cocinar!'), text: t('Ahora te muestro tu restaurante. Después abres tu primer servicio de verdad.'), button: t('Vamos'), done: true }
    ];
  }

  #guideAllows(el) {
    const a = this.guide.allow;
    return Boolean(a && el?.closest?.(a));
  }

  #guideNext() {
    const g = this.guide;
    g.steps ??= this.#guideSteps();
    g.coach ??= new Coach(this.el.root);
    g.step += 1;
    const s = g.steps[g.step];
    if (!s) return;
    g.allow = null;
    s.enter?.();
    const show = () => {
      if (!this.guide || g.steps[g.step] !== s) return;
      g.allow = s.allow ?? null;
      g.coach.show({
        target: s.target ?? null, title: s.title, text: s.text, hand: s.hand,
        step: g.step + 1, total: g.steps.length,
        button: s.button, onButton: () => { sfx.tap(); s.done ? this.#guideFinish() : this.#guideNext(); },
        skip: s.skip ? { label: t('Saltar tutorial'), onClick: () => { sfx.tap(); this.#guideFinish(); } } : null
      });
    };
    if (s.delay) setTimeout(show, s.delay); else show();
  }

  #guideEvent(ev, arg) {
    const g = this.guide;
    const s = g?.steps?.[g.step];
    if (s?.on?.(ev, arg)) this.#guideNext();
  }

  #guideTick() {
    const g = this.guide;
    const s = g.steps?.[g.step];
    if (s?.tick?.()) this.#guideNext();
  }

  #guideFinish() {
    if (!this.guide || this.guide.finished) return;
    this.guide.finished = true;
    this.guide.coach?.destroy();
    this.running = false;
    cancelAnimationFrame(this.raf);
    music.stop();
    this.onFinish({ practice: true });
  }

  // ── Introducción y cuenta atrás ─────────────────────────
  // Antes del servicio: tutorial ilustrado (la primera vez) y el parte del día.
  #intro() {
    if (this.guide) { this.start(); this.#guideNext(); return; }
    if (this.firstTime) this.#tutorial(() => this.#briefing());
    else this.#briefing();
  }

  #tutorial(done) {
    const recipe = this.orders[0]?.recipe ?? RECIPE_BY_ID[this.config.menu[0]];
    const ing = recipe.components[0].ingredient;
    const timed = recipe.components.find((c) => PROCESSES[c.process].kind !== 'raw') ?? recipe.components[0];
    const second = recipe.components[1]?.ingredient ?? ing;
    const face = (look, mood, vip = false) => customerSvg(look, mood, '', vip);
    const slides = [
      {
        icon: 'hand',
        title: 'Elige a un cliente',
        text: 'Toca a un cliente para ver su comanda. El <b>anillo de color es su paciencia</b>: si se vacía, se va enojado, pierdes el combo y una vida.',
        art: `<div class="tuto-art tuto-art--customer">
          <div class="customer is-selected" style="animation:none">
            <span class="bubble"><span class="bubble__dish">${recipe.components.slice(0, 3).map((c) => ingredientSvg(c.ingredient, { title: '' })).join('')}</span><span class="bubble__name">${escapeHtml(recipe.name)}</span></span>
            <span class="avatar tuto-drain"><span class="avatar__face">${face(1, 'happy')}</span></span>
          </div>
          <div class="customer" style="animation:none;opacity:.75"><span class="avatar" style="--p:90"><span class="avatar__face">${face(5, 'happy')}</span></span></div>
          <span class="tuto-hand tuto-hand--tap" aria-hidden="true">${icon('hand')}</span>
        </div>`
      },
      {
        icon: 'market',
        title: 'Saca de la despensa',
        text: 'Los frascos que <b>brillan</b> son lo que pide. El número es cuánto te queda; si se agota, tócalo para un <b>pedido urgente</b> al doble de precio.',
        art: `<div class="tuto-art tuto-art--jars">
          <span class="jar is-needed" data-level="ok" style="--lvl:.8;--jar:68px"><span class="jar__glass">${ingredientSvg(ing, { title: '' })}</span><span class="jar__qty">7</span></span>
          <span class="tuto-fly" aria-hidden="true">${ingredientSvg(ing, { title: '' })}</span>
          <span class="tuto-plate"></span>
          <span class="jar is-want" data-level="out" style="--lvl:0;--jar:54px"><span class="jar__glass">${ingredientSvg(second, { title: '' })}</span><span class="jar__qty">0</span></span>
          <span class="tuto-hand tuto-hand--jar" aria-hidden="true">${icon('hand')}</span>
        </div>`
      },
      {
        icon: 'fire',
        title: 'Cocina en los fogones',
        text: '<b>Cortar y batir:</b> toca el fogón varias veces. <b>Freír, hornear y hervir</b> se cocinan solos; la carne hay que voltearla. Recógelo con el anillo verde para un <b>¡Perfecto!</b>',
        art: `<div class="tuto-art tuto-art--stations">
          <span class="station is-working" style="--p:.5"><span class="station__ring"><span class="station__disc">${STATION_ART.tabla}<span class="station__slot">${ingredientSvg(ing, { className: 'station__item', title: '' })}</span></span></span><span class="station__status">¡Corta!</span></span>
          <span class="station is-ready" style="--p:1"><span class="station__ring"><span class="station__disc">${STATION_ART[PROCESSES[timed.process].station ?? 'sarten']}<span class="station__slot">${ingredientSvg(timed.ingredient, { className: 'station__item', title: '' })}</span></span></span><span class="station__status">¡Perfecto!</span></span>
          <span class="station is-fire" style="--p:.3"><span class="station__ring"><span class="station__disc">${STATION_ART.sarten}<span class="station__slot"><span class="flames"><i></i><i></i><i></i></span></span></span></span><span class="station__status">¡Apaga!</span></span>
        </div>`
      },
      {
        icon: 'sparkle',
        title: 'Sirve y cobra',
        text: 'Con el plato completo se <b>sirve solo</b>. Sirve seguido para subir el <b>combo</b> hasta ×1.5. Los críticos con boina pagan el doble.',
        art: `<div class="tuto-art tuto-art--serve">
          <span class="tuto-serve-plate"><span class="tuto-serve-items">${recipe.components.slice(0, 3).map((c) => ingredientSvg(c.ingredient, { title: '' })).join('')}</span></span>
          <span class="avatar" style="--p:100;width:70px;height:70px"><span class="avatar__face" style="width:60px;height:60px">${face(2, 'happy', true)}</span></span>
          <span class="tuto-coin tuto-coin--pop">${coinSvg()}<b>+${recipe.price}</b></span>
          <span class="combo is-on tuto-combo">${icon('fire')}<b>×1.3</b></span>
        </div>`
      },
      {
        icon: 'heart',
        title: 'Cuidado: puedes perder',
        text: `Tienes <b>${SERVICE_LIVES} vidas</b>: cada cliente que se va enojado quita una (un crítico, dos). Sin vidas, <b>cierran la cocina</b>. Y al cerrar pagas los gastos: si vendes menos, <b>pierdes dinero</b>.`,
        art: `<div class="tuto-art tuto-art--lose">
          <span class="avatar tuto-drain tuto-drain--fast"><span class="avatar__face tuto-swap"><span class="tuto-swap__a">${face(4, 'worried')}</span><span class="tuto-swap__b">${face(4, 'angry')}</span></span></span>
          <span class="tuto-lives"><span class="life">${icon('heart')}</span><span class="life">${icon('heart')}</span><span class="life is-lost is-breaking">${icon('heart')}</span></span>
          <span class="tuto-coin tuto-coin--bad">${coinSvg()}<b>−${fmt(this.config.upkeep ?? 0)}</b></span>
        </div>`
      }
    ];
    let idx = 0;
    let dir = 'next';
    const ov = document.createElement('div');
    ov.className = 'overlay overlay--tuto';
    const go = (to) => {
      if (to < 0 || to >= slides.length) return;
      dir = to > idx ? 'next' : 'prev';
      idx = to;
      sfx.tap();
      draw();
    };
    const draw = () => {
      const s = slides[idx];
      const last = idx === slides.length - 1;
      ov.innerHTML = `
        <div class="tuto" role="dialog" aria-label="Cómo se juega">
          <div class="tuto__top">
            <div class="tuto__bar" aria-label="Paso ${idx + 1} de ${slides.length}">${slides.map((_, k) => `<i class="${k < idx ? 'is-done' : k === idx ? 'is-on' : ''}"></i>`).join('')}</div>
            <button class="card-x" data-act="close" aria-label="Cerrar">${icon('close')}</button>
          </div>
          <div class="tuto__stage tuto__stage--${dir}" style="--theme:${this.restaurant.theme.primary}">
            ${awningSvg(this.restaurant.theme)}<span class="tuto__counter" aria-hidden="true"></span>
            ${s.art}
          </div>
          <div class="tuto__head"><span class="tuto__icon">${icon(s.icon)}</span><div><small>PASO ${idx + 1} DE ${slides.length}</small><h2>${s.title}</h2></div></div>
          <p>${s.text}</p>
          <div class="tuto__actions">
            ${idx === 0 ? `<button class="btn btn--ghost btn--sm" data-act="skip">Saltar</button>` : `<button class="btn btn--ghost btn--sm" data-act="prev" aria-label="Atrás">${icon('back')}</button>`}
            <button class="btn btn--gold" data-act="next">${last ? '¡A cocinar!' : 'Siguiente'} ${icon(last ? 'fire' : 'arrow')}</button>
          </div>
        </div>`;
      ov.querySelector('[data-act="next"]').addEventListener('click', () => {
        if (!last) go(idx + 1); else { sfx.tap(); ov.remove(); done(); }
      });
      ov.querySelector('[data-act="prev"]')?.addEventListener('click', () => go(idx - 1));
      ov.querySelector('[data-act="skip"]')?.addEventListener('click', () => { ov.remove(); done(); });
      ov.querySelector('[data-act="close"]').addEventListener('click', () => { sfx.tap(); ov.remove(); done(); });
    };
    // Deslizar el dedo para cambiar de paso.
    let startX = null;
    ov.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    ov.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    });
    draw();
    this.el.root.appendChild(ov);
  }

  // Parte del día: qué trae este servicio, con una línea de tiempo del servicio.
  #briefing() {
    const ov = document.createElement('div');
    ov.className = 'overlay overlay--brief';
    const dur = this.config.durationMs;
    const pct = (ms) => `${((ms / dur) * 100).toFixed(1)}%`;
    const units = Object.values(this.stock).reduce((a, n) => a + n, 0);
    const vips = this.orders.filter((o) => o.vip);
    // Cuánto cuesta abrir hoy y cuántos grupos vienen.
    const groupCount = new Set(this.orders.filter((o) => o.group != null).map((o) => o.group)).size;
    const cost = (this.config.upkeep ?? 0) + (this.config.salary ?? 0);
    const costText = this.helper ? `${fmt(this.config.upkeep ?? 0)} del local + ${fmt(this.config.salary ?? 0)} del sueldo de ${this.helper.name}` : 'gastos del local';
    ov.innerHTML = `
      <div class="brief">
        <button class="card-x" data-act="close" aria-label="Volver sin empezar">${icon('close')}</button>
        <div class="brief__kicker">PARTE DEL DÍA</div>
        <h2>${escapeHtml(this.restaurant.name)}</h2>
        <div class="bubbles">
          <div><b>${this.orders.length}</b><span>clientes</span></div>
          <div><b>${vips.length}</b><span>críticos</span></div>
          <div><b>${this.events.length}</b><span>incendios</span></div>
          <div><b>${units}</b><span>en despensa</span></div>
        </div>
        <div class="timeline" aria-label="Línea de tiempo del servicio">
          <span class="timeline__rush" style="left:${pct(this.rush.from)};width:${pct(this.rush.to - this.rush.from)}"></span>
          ${this.events.map((e) => `<span class="timeline__mark timeline__mark--fire" style="left:${pct(e.at)}" title="Fuego">${icon('fire')}</span>`).join('')}
          ${vips.map((o) => `<span class="timeline__mark timeline__mark--vip" style="left:${pct(o.arriveAt)}" title="Crítico">${icon('crown')}</span>`).join('')}
          <span class="timeline__label" style="left:0">0:00</span><span class="timeline__label" style="right:0">${clockText(dur)}</span>
        </div>
        <div class="brief__legend"><span><i class="lg-rush"></i>Hora pico</span><span><i class="lg-fire"></i>Fuego</span><span><i class="lg-vip"></i>Crítico</span></div>
        ${this.helper ? `<div class="brief__helper"><span class="helper-chip__face">${staffSvg(this.helper)}</span><span><b>${escapeHtml(this.helper.name)}</b> te ayuda hoy en ${this.#helperPlaces()} (${rankName(this.helper, this.helper.rank).toLowerCase()})</span></div>` : ''}
        <ul class="brief__rules">
          <li>${icon('heart')}<span><b>${SERVICE_LIVES} vidas.</b> Cada cliente que se va enojado quita una (un crítico, dos). Sin vidas, cierran la cocina.</span></li>
          ${groupCount ? `<li>${icon('people')}<span><b>${groupCount} ${groupCount > 1 ? 'grupos' : 'grupo'} de amigos.</b> Llegan juntos; si les sirves a todos con menos de ${GROUP_WINDOW_MS / 1000} s de diferencia, cada uno paga +${Math.round(GROUP_BONUS * 100)} %.</span></li>` : ''}
          ${this.stationKeys.includes('parrilla') ? `<li>${processSvg('asar')}<span><b>Parrilla.</b> Lo que asas se voltea cuando lo pide; recógelo antes de que se queme.</span></li>` : ''}
          <li>${coinSvg()}<span><b>Al cerrar pagas ${fmt(cost)}</b> (${costText}). Si vendes menos, pierdes la diferencia.</span></li>
        </ul>
        <button class="btn btn--gold btn--xl btn--shine" data-act="go">${icon('fire')} ¡A cocinar!</button>
        <button class="btn btn--ghost btn--sm" data-act="howto">Cómo se juega</button>
      </div>`;
    ov.querySelector('[data-act="go"]').addEventListener('click', () => { ov.remove(); this.#countdown(); });
    // La X vuelve al inicio sin empezar: no se gasta nada de la despensa.
    ov.querySelector('[data-act="close"]').addEventListener('click', () => { sfx.tap(); this.destroy(); this.onQuit(); });
    ov.querySelector('[data-act="howto"]').addEventListener('click', () => { ov.remove(); this.#tutorial(() => this.#briefing()); });
    this.el.root.appendChild(ov);
  }

  #countdown() {
    const ov = document.createElement('div');
    ov.className = 'overlay overlay--count';
    this.el.root.appendChild(ov);
    let n = 3;
    const step = () => {
      if (n === 0) {
        ov.innerHTML = `<div class="countdown">¡Ya!</div>`;
        sfx.count(true);
        setTimeout(() => { ov.remove(); this.start(); }, 550);
        return;
      }
      ov.innerHTML = `<div class="countdown">${n}</div>`;
      sfx.count(false);
      n--;
      setTimeout(step, 750);
    };
    step();
  }

  start() {
    this.running = true;
    music.start(this.restaurant.id);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    music.pause();
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `
      <h2>Pausa</h2>
      <p>Los clientes esperan. Si sales, este servicio no cuenta, pero los ingredientes que ya usaste se quedan en tu despensa.</p>
      ${prefTilesHtml('pref-tiles--dark')}
      <button class="btn btn--gold btn--xl" data-act="resume">Continuar</button>
      <button class="btn btn--ghost btn--sm" data-act="howto">Cómo se juega</button>
      <button class="btn btn--ghost" data-act="quit">Salir del servicio</button>`;
    bindPrefTiles(ov);
    ov.querySelector('[data-act="resume"]').addEventListener('click', () => {
      ov.remove(); this.paused = false; this.last = performance.now(); music.resume();
    });
    ov.querySelector('[data-act="quit"]').addEventListener('click', () => { this.destroy(); this.onQuit(); });
    ov.querySelector('[data-act="howto"]').addEventListener('click', () => { ov.style.display = 'none'; this.#tutorial(() => { ov.style.display = ''; }); });
    this.el.root.appendChild(ov);
  }

  // ── Bucle ───────────────────────────────────────────────
  frame(now) {
    if (!this.running) return;
    const dt = Math.min(100, now - this.last);
    this.last = now;
    if (!this.paused) {
      this.t += dt;
      this.#update();
      this.#paint();
      if (this.guide) this.#guideTick();
    }
    if (this.closed || this.t >= this.config.durationMs) return this.#finish();
    this.raf = requestAnimationFrame(this.frame);
  }

  #addWaste(ing, n = 1) {
    this.waste[ing] = (this.waste[ing] ?? 0) + n;
  }

  #update() {
    const t = this.t;
    let changed = false;
    for (const o of this.orders) {
      if (o.status === 'waiting' && o.arriveAt <= t) {
        o.status = 'seated';
        changed = true;
        if (o.vip) this.#ribbon('¡Crítico gastronómico!', 'Paga el doble pero tiene poca paciencia');
        if (o.group === o.id) {
          sfx.group();
          if (!this.groupSeen) this.#ribbon('¡Llegó un grupo!', `Sírvelos casi a la vez: +${Math.round(GROUP_BONUS * 100)}% a cada uno`, 'group');
          this.groupSeen = true;
        }
      } else if (o.status === 'seated' && t > o.arriveAt + o.patienceMs) {
        o.status = 'left';
        changed = true;
        if (this.combo >= 3) this.#comboLost();
        this.combo = 0;
        this.#comboUi();
        sfx.angry();
        this.#loseLife(o.vip ? 2 : 1);
        // Lo que ya estaba en su plato se desperdicia.
        o.recipe.components.forEach((c, i) => { if (o.filled[i]) this.#addWaste(c.ingredient); });
        const el = this.custEls.get(o.id);
        if (el) floatText(el, '¡Me voy!', 'bad');
      }
    }
    for (const st of this.stationKeys) {
      const item = this.stations[st];
      if (item && this.orders[item.orderId].status === 'left') {
        this.stations[st] = null;
        this.#addWaste(item.ingredient);
        floatText(this.el.stations[st], 'Se fue', 'bad');
      }
    }
    // Eventos de fuego.
    for (const ev of this.events) {
      if (ev.done || t < ev.at) continue;
      ev.done = true;
      const keys = this.stationKeys.filter((k) => this.#type(k) === ev.station);
      const st = keys.find((k) => this.stations[k]) ?? keys[0];
      const item = this.stations[st];
      if (item) {
        this.stations[st] = null;
        this.orders[item.orderId].busy[item.compIndex] = false;
        this.#addWaste(item.ingredient);
        this.sig.order = '';
      }
      this.fires[st] = { taps: FIRE_TAPS };
      this.sig.stations[st] = '';
      sfx.burn();
      this.#ribbon(`¡Fuego en ${ev.station === 'sarten' ? 'la sartén' : 'el horno'}!`, 'Tócalo rápido para apagarlo', 'fire');
    }
    // Pedidos urgentes que llegan.
    if (this.deliveries.length) {
      const arrived = this.deliveries.filter((d) => d.at <= t);
      if (arrived.length) {
        this.deliveries = this.deliveries.filter((d) => d.at > t);
        for (const d of arrived) {
          this.stock[d.ing] = (this.stock[d.ing] ?? 0) + d.n;
          const jar = this.el.pantry.find((b) => b.dataset.ing === d.ing);
          if (jar) floatText(jar, `+${d.n} llegó`, 'good');
        }
        sfx.ready();
        this.#renderStock();
      }
    }
    this.#helperWork();
    // Hora pico.
    if (this.rushState === 'before' && t >= this.rush.from) {
      this.rushState = 'on';
      this.#ribbon('¡Hora pico!', 'Llegan clientes sin parar');
      this.rushGlow = document.createElement('div');
      this.rushGlow.className = 'rush-glow';
      this.el.root.appendChild(this.rushGlow);
      music.setRush(true);
    } else if (this.rushState === 'on' && t >= this.rush.to) {
      this.rushState = 'after';
      this.rushGlow?.remove();
      music.setRush(false);
    }
    for (const st of this.stationKeys) {
      const item = this.stations[st];
      if (!item || item.kind !== 'timer') continue;
      const state = this.#timerState(item);
      if (state !== item.lastState) {
        if (state === 'flip') { sfx.tap(); floatText(this.el.stations[st], '¡Voltéalo!', ''); }
        if (state === 'ready' && item.flip && !item.flip.done) {
          // Sin voltear: se pega de un lado y se quema el doble de rápido.
          item.burnAt = item.readyAt + (item.burnAt - item.readyAt) / 2;
          floatText(this.el.stations[st], 'Se pegó de un lado', 'bad');
        }
        if (state === 'ready') sfx.ready();
        if (state === 'burnt') {
          sfx.burn();
          this.orders[item.orderId].busy[item.compIndex] = false;
          floatText(this.el.stations[st], '¡Quemado!', 'bad');
          this.sig.order = '';
        }
        item.lastState = state;
      }
    }
    if (changed) {
      const visible = this.#visible();
      if (this.selected === null || !visible.some((o) => o.id === this.selected)) {
        this.selected = visible[0]?.id ?? null;
      }
      this.#renderCustomers();
    }
  }

  // Dónde trabaja hoy, en palabras: «la tabla», «las dos sartenes», «las dos tablas y el bol»…
  #helperPlaces() {
    const keys = this.helper.stations.filter((k) => this.stationKeys.includes(k));
    if (!keys.length) return 'la barra';
    const types = [...new Set(keys.map((k) => this.#type(k)))];
    return types.map((t) => {
      const n = keys.filter((k) => this.#type(k) === t).length;
      const name = this.#stName(t).toLowerCase();
      const fem = name === 'sartén' || name.endsWith('a');
      const plural = name === 'sartén' ? 'sartenes' : /[aeiou]$/.test(name) ? `${name}s` : `${name}es`;
      if (n > 1) return `${fem ? 'las dos' : 'los dos'} ${plural}`;
      return `${fem ? 'la' : 'el'} ${name}`;
    }).join(' y ');
  }

  // El ayudante ocupa los fogones de su rango (en novato y hábil, el primero de su tipo).
  #helperAt(st) {
    return Boolean(this.helper?.stations.includes(st));
  }

  #stName(type) {
    return this.restaurant.stationNames?.[type] ?? STATIONS[type].name;
  }

  // El asistente trabaja como si tocara él: mismas reglas que el jugador.
  #helperWork() {
    const h = this.helper;
    if (!h) return;
    const lv = h.levels[h.rank];
    let task = '';
    if (!h.paused) {
      for (const st of this.stationKeys) {
        if (!this.#helperAt(st) || this.fires[st]) continue;
        const item = this.stations[st];
        if (!item) continue;
        if (item.kind === 'tap' && lv.tapMs) {
          task ||= `corta ${INGREDIENTS[item.ingredient].name.toLowerCase()}`;
          if (this.t - Math.max(item.lastTapAt ?? 0, item.startedAt) >= lv.tapMs) { this.helperStats.cuts += 1; this.#onStation(st, this.el.stations[st]); }
        } else if (item.kind === 'timer' && lv.reactMs) {
          const state = this.#timerState(item);
          if (state === 'flip' && this.t - item.flip.at >= lv.reactMs * 0.6) { task = `voltea ${INGREDIENTS[item.ingredient].name.toLowerCase()}`; this.helperStats.flips += 1; this.#onStation(st, this.el.stations[st]); }
          else if ((state === 'ready' || state === 'burning') && this.t - item.readyAt >= lv.reactMs) { task = `saca ${INGREDIENTS[item.ingredient].name.toLowerCase()}`; this.helperStats.saves += 1; this.#onStation(st, this.el.stations[st]); }
          else if (state === 'burnt') this.#onStation(st, this.el.stations[st]);
          else task ||= `vigila ${this.#stName(this.#type(st)).toLowerCase()}`;
        }
      }
    }
    if (task !== h.task) { h.task = task; this.#helperUi(); }
  }

  #helperUi(force = false) {
    const h = this.helper;
    const el = this.el.helper;
    if (!h || !el) return;
    const rank = rankName(h, h.rank).toLowerCase();
    let text;
    if (h.paused) text = `${h.name} en pausa · toca`;
    else if (h.task) text = `${h.name} ${h.task}`;
    else if (!h.stations.length) text = `${h.name} atiende la barra`;
    else text = `${h.name} ${h.fem ? 'lista' : 'listo'} · ${rank}`;
    if (!force && el.dataset.text === text) return;
    el.dataset.text = text;
    el.querySelector('.helper-chip__text').textContent = text;
    el.classList.toggle('is-paused', h.paused);
    el.classList.toggle('is-busy', Boolean(h.task) && !h.paused);
  }

  // Avisos grandes en fila: nunca se enciman dos a la vez.
  #ribbon(title, sub, variant = '') {
    this.ribbonQueue ??= [];
    this.ribbonQueue.push({ title, sub, variant });
    if (!this.ribbonBusy) this.#nextRibbon();
  }

  #nextRibbon() {
    const next = this.ribbonQueue.shift();
    if (!next || !this.el) { this.ribbonBusy = false; return; }
    this.ribbonBusy = true;
    this.ribbonEl?.remove();
    const r = document.createElement('div');
    this.ribbonEl = r;
    r.className = `ribbon ${next.variant ? `ribbon--${next.variant}` : ''}`;
    r.innerHTML = `${escapeHtml(next.title)}${next.sub ? `<small>${escapeHtml(next.sub)}</small>` : ''}`;
    this.el.root.appendChild(r);
    setTimeout(() => r.remove(), 2300);
    // Si hay otro esperando, el actual se acorta un poco.
    setTimeout(() => this.#nextRibbon(), this.ribbonQueue.length ? 1500 : 2300);
  }

  #visible() {
    return this.orders.filter((o) => o.status === 'seated').slice(0, this.stats.slots);
  }

  #queueCount() {
    return Math.max(0, this.orders.filter((o) => o.status === 'seated').length - this.stats.slots);
  }

  #timerState(item) {
    if (item.flip && !item.flip.done && this.t >= item.flip.at && this.t < item.readyAt) return 'flip';
    if (this.t < item.readyAt) return 'cooking';
    if (item.burnAt === Infinity || this.t < item.burnAt) {
      if (item.burnAt !== Infinity && this.t > item.readyAt + (item.burnAt - item.readyAt) * 0.55) return 'burning';
      return 'ready';
    }
    return 'burnt';
  }

  // ── Pintado por fotograma ───────────────────────────────
  #paint() {
    const left = Math.max(0, this.config.durationMs - this.t);
    const secs = Math.ceil(left / 1000);
    const clock = this.guide ? '∞' : clockText(left);
    if (this.el.clock.textContent !== clock) this.el.clock.textContent = clock;
    this.el.ring.style.setProperty('--p', this.guide ? '100' : ((left / this.config.durationMs) * 100).toFixed(1));
    this.el.timer.classList.toggle('is-low', !this.guide && secs <= 15);

    for (const o of this.#visible()) {
      const el = this.custEls.get(o.id);
      if (!el) continue;
      const frac = Math.max(0, 1 - (this.t - o.arriveAt) / o.patienceMs);
      el.querySelector('.avatar').style.setProperty('--p', (frac * 100).toFixed(1));
      const mood = frac > 0.5 ? 'happy' : frac > 0.25 ? 'worried' : 'angry';
      if (el.dataset.mood !== mood) {
        el.dataset.mood = mood;
        el.classList.toggle('is-worried', mood === 'worried');
        el.classList.toggle('is-angry', mood === 'angry');
        el.querySelector('.avatar__face').innerHTML = customerSvg(o.look, mood, '', o.vip);
      }
    }

    for (const st of this.stationKeys) {
      this.#renderStation(st);
      const item = this.stations[st];
      const el = this.el.stations[st];
      if (this.fires[st]) {
        el.style.setProperty('--p', (1 - this.fires[st].taps / FIRE_TAPS).toFixed(3));
      } else if (item?.kind === 'timer') {
        const state = this.#timerState(item);
        let p;
        if (state === 'cooking' || state === 'flip') p = (this.t - item.startedAt) / (item.readyAt - item.startedAt);
        else if (state === 'burnt' || item.burnAt === Infinity) p = 1;
        else p = 1 - (this.t - item.readyAt) / (item.burnAt - item.readyAt);
        el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
      } else if (item?.kind === 'tap') {
        el.style.setProperty('--p', (item.taps / item.need).toFixed(3));
      } else {
        el.style.setProperty('--p', '0');
      }
    }
    this.#renderOrder();
    this.#renderPantry();
  }

  // ── Clientes ────────────────────────────────────────────
  #renderCustomers() {
    const box = this.el.customers;
    if (!box?.isConnected) return;
    const visible = this.#visible();
    const ids = new Set(visible.map((o) => o.id));
    // Posiciones de antes, para que los que se quedan se deslicen a su nuevo lugar.
    const before = new Map([...this.custEls].map(([id, el]) => [id, el.getBoundingClientRect()]));
    for (const [id, el] of this.custEls) {
      if (ids.has(id)) continue;
      // El que se va sigue ocupando su silla hasta terminar de despedirse: nadie se le encima.
      const o = this.orders[id];
      this.custEls.delete(id);
      this.leaving.set(id, el);
      el.classList.remove('is-selected', 'is-waiting-friend');
      el.setAttribute('aria-hidden', 'true');
      if (o.status === 'served') {
        const bubble = el.querySelector('.bubble');
        if (bubble) bubble.innerHTML = `<span class="bubble__thanks">${THANKS[(o.id * 7) % THANKS.length]}</span>`;
        const face = el.querySelector('.avatar__face');
        if (face) face.innerHTML = customerSvg(o.look, 'happy', '', o.vip);
        el.classList.add('is-served');
        // Espera a que le llegue el plato y dé un par de bocados.
        setTimeout(() => this.#goodbye(id, el, true), o.stayMs ?? 900);
      } else {
        this.#goodbye(id, el, false);
      }
    }
    box.querySelectorAll('.seat-empty, .queue-badge').forEach((n) => n.remove());
    // Sólo se sientan los que caben: las sillas de los que se despiden siguen ocupadas.
    const room = this.stats.slots - this.leaving.size;
    for (const o of visible) {
      if (this.custEls.has(o.id) || this.custEls.size >= room) continue;
      const el = document.createElement('button');
      el.className = `customer ${o.vip ? 'is-vip' : ''} ${o.group != null ? 'is-group' : ''}`;
      el.dataset.order = o.id;
      // Cada cliente parpadea y se mueve a su propio ritmo.
      el.style.setProperty('--d', `${-((o.id * 0.77) % 3).toFixed(2)}s`);
      if (o.group != null) el.style.setProperty('--group-hue', String((o.group * 67) % 360));
      el.dataset.mood = 'happy';
      el.setAttribute('aria-label', `${o.vip ? 'Crítico gastronómico' : 'Cliente'} pide ${o.recipe.name}`);
      el.innerHTML = `
        <span class="bubble">
          <span class="bubble__dish">${o.recipe.components.slice(0, 4).map((c) => ingredientSvg(c.ingredient, { title: '' })).join('')}</span>
          <span class="bubble__name">${escapeHtml(o.recipe.name)}</span>
        </span>
        <span class="avatar" style="--p:100"><span class="avatar__face">${customerSvg(o.look, 'happy', '', o.vip)}</span>${o.vip ? '<span class="vip-tag">VIP</span>' : ''}${o.group != null ? `<span class="group-tag" title="Vienen juntos">${icon('people')}</span>` : ''}</span>`;
      el.addEventListener('animationend', (e) => { if (e.animationName === 'customer-in') el.style.animation = 'none'; });
      box.appendChild(el);
      this.custEls.set(o.id, el);
      sfx.arrive();
    }
    for (let i = this.custEls.size + this.leaving.size; i < this.stats.slots; i++) {
      const s = document.createElement('div');
      s.className = 'seat-empty';
      s.innerHTML = '<i></i><span>Libre</span>';
      box.appendChild(s);
    }
    const q = this.#queueCount() + visible.filter((o) => !this.custEls.has(o.id)).length;
    if (q > 0) {
      const b = document.createElement('div');
      b.className = 'queue-badge';
      b.textContent = `+${q} en fila`;
      box.appendChild(b);
    }
    // Los que se quedan se deslizan desde su lugar anterior (sin saltos).
    for (const [id, el] of this.custEls) {
      const r0 = before.get(id);
      if (!r0) continue;
      const r1 = el.getBoundingClientRect();
      const dx = r0.left - r1.left, dy = r0.top - r1.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.3,1)' });
      }
    }
    if (this.selected !== null && !this.custEls.has(this.selected)) {
      this.selected = visible.find((o) => this.custEls.has(o.id))?.id ?? null;
    }
    for (const [id, el] of this.custEls) {
      el.classList.toggle('is-selected', id === this.selected);
      el.setAttribute('aria-pressed', String(id === this.selected));
    }
  }

  // Despedida en su propia silla: el contento salta y baja tras la barra; el enojado
  // sacude la cabeza y se va. Al terminar, la silla queda libre y los demás se acomodan.
  #goodbye(id, el, happy) {
    if (!el.isConnected) { this.leaving.delete(id); return; }
    const anim = happy
      ? el.animate([
        { transform: 'translateY(0) scale(1)', opacity: 1 },
        { transform: 'translateY(-12px) scale(1.06)', opacity: 1, offset: 0.3, easing: 'cubic-bezier(.5,0,.75,0)' },
        { transform: 'translateY(46px) scale(.72)', opacity: 0 }
      ], { duration: 420, fill: 'forwards' })
      : el.animate([
        { transform: 'translateX(0)', opacity: 1, filter: 'grayscale(0)' },
        { transform: 'translateX(-6px) rotate(-4deg)', offset: 0.12 },
        { transform: 'translateX(6px) rotate(4deg)', offset: 0.24 },
        { transform: 'translateX(0)', opacity: 1, offset: 0.36 },
        { transform: 'translateY(46px) scale(.8)', opacity: 0, filter: 'grayscale(1)' }
      ], { duration: 640, easing: 'ease-in', fill: 'forwards' });
    const done = () => {
      if (!this.leaving.has(id)) return;
      this.leaving.delete(id);
      el.remove();
      this.#renderCustomers();
    };
    anim.onfinish = done;
    setTimeout(done, 900);
  }

  #select(id) {
    const o = this.orders[id];
    if (!o || o.status !== 'seated') return;
    this.selected = id;
    sfx.tap();
    for (const [cid, el] of this.custEls) {
      el.classList.toggle('is-selected', cid === id);
      el.setAttribute('aria-pressed', String(cid === id));
    }
    this.#guideEvent('select', id);
  }

  #stackSvg(o, i, ingId) {
    const key = `${o.id}:${i}`;
    const svg = ingredientSvg(ingId, { title: '' });
    if (this.onPlate.has(key)) return svg.replace('<svg class="', '<svg class="is-still ');
    this.onPlate.add(key);
    const wait = Math.max(0, Math.round((this.landAt.get(key) ?? 0) - performance.now()));
    return svg.replace('<svg ', `<svg style="--land:${wait}ms" `);
  }

  // ── Comanda del pedido seleccionado ─────────────────────
  #renderOrder() {
    // Un plato recién completado se queda en la comanda hasta que despega hacia su cliente.
    const held = this.ticketHold != null ? this.orders[this.ticketHold] : null;
    const o = held ?? (this.selected !== null ? this.orders[this.selected] : null);
    const stockSig = o ? o.recipe.components.map((c) => (this.stock[c.ingredient] ?? 0) > 0 ? 1 : 0).join('') : '';
    const sig = o ? `${held ? 'h' : ''}${o.id}|${o.filled.join()}|${o.busy.join()}|${stockSig}` : `none|${this.t < 2000}`;
    if (sig === this.sig.order) return;
    this.sig.order = sig;
    const el = this.el.order;
    if (!o) {
      el.className = 'ticket order order--empty';
      el.innerHTML = `<span>${this.t < 2000 ? 'Abriendo el restaurante…' : 'Esperando clientes…'}</span>`;
      return;
    }
    el.className = 'ticket order';
    const next = o.recipe.components.findIndex((c, i) => !o.filled[i] && !o.busy[i]);
    let hint = o.filled.every(Boolean) ? '¡Listo! Va para la mesa' : 'Recoge lo que está en los fogones';
    if (next >= 0) {
      const c = o.recipe.components[next];
      hint = (this.stock[c.ingredient] ?? 0) <= 0
        ? `Sin ${INGREDIENTS[c.ingredient].name}: no podrás servirlo`
        : `Siguiente: ${INGREDIENTS[c.ingredient].name} · ${PROCESSES[c.process].verb}`;
    }
    el.innerHTML = `
      <div class="order__plate"><div class="plate__dish"></div>
        <div class="order__stack">${o.recipe.components.map((c, i) => o.filled[i] ? this.#stackSvg(o, i, c.ingredient) : '').join('')}</div>
      </div>
      <div>
        <div class="order__title">${escapeHtml(o.recipe.name)}${o.vip ? ` <span class="tag tag--deal" style="padding:2px 8px;font-size:11px">${icon('crown', 'style="width:12px;height:12px"')} ×2</span>` : ''}</div>
        <div class="order__hint">${hint}</div>
        <div class="order__comps" data-count="${o.recipe.components.length}">${o.recipe.components.map((c, i) => {
          const out = !o.filled[i] && !o.busy[i] && (this.stock[c.ingredient] ?? 0) <= 0;
          return `<span class="need ${o.filled[i] ? 'is-done' : o.busy[i] ? 'is-busy' : out ? 'is-out' : ''}">${ingredientSvg(c.ingredient)}${processSvg(c.process)}</span>`;
        }).join('')}
        </div>
      </div>`;
  }

  #renderPantry() {
    const o = this.selected !== null ? this.orders[this.selected] : null;
    const needed = new Set();
    const wanted = new Set();
    if (o) o.recipe.components.forEach((c, i) => {
      if (o.filled[i] || o.busy[i]) return;
      if ((this.stock[c.ingredient] ?? 0) > 0) needed.add(c.ingredient); else wanted.add(c.ingredient);
    });
    const sig = o ? `${[...needed].join()}|${[...wanted].join()}` : '-';
    if (sig === this.sig.pantry) return;
    this.sig.pantry = sig;
    let first = null;
    for (const b of this.el.pantry) {
      const n = needed.has(b.dataset.ing);
      const w = wanted.has(b.dataset.ing);
      b.classList.toggle('is-needed', n);
      b.classList.toggle('is-want', w);
      b.classList.toggle('is-dim', Boolean(o) && !n && !w);
      if (n && !first) first = b;
    }
    // En pantallas pequeñas la repisa se desplaza: muestra lo que hace falta.
    first?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  #renderStock() {
    let total = 0;
    for (const b of this.el.pantry) {
      const ing = b.dataset.ing;
      const n = this.stock[ing] ?? 0;
      const pending = this.deliveries.filter((d) => d.ing === ing).reduce((a, d) => a + d.n, 0);
      total += n;
      b.querySelector('.jar__qty').textContent = n;
      // Anillo de nivel: lleno con 8 o más unidades.
      b.style.setProperty('--lvl', Math.min(1, n / 8).toFixed(3));
      b.dataset.level = n <= 0 ? 'out' : n <= 2 ? 'low' : n <= 4 ? 'mid' : 'ok';
      b.classList.toggle('is-out', n <= 0 && !pending);
      b.classList.toggle('is-coming', pending > 0);
      const eta = b.querySelector('.jar__eta');
      eta.hidden = !pending;
      eta.textContent = pending ? `+${pending}` : '';
      b.setAttribute('aria-label', `${INGREDIENTS[ing].name}: quedan ${n}${pending ? `, llegan ${pending}` : ''}${n <= 0 && !pending ? '. Toca para pedido urgente' : ''}`);
    }
    const left = EMERGENCY_MAX_UNITS - this.emergencyUnits;
    this.el.shelfCount.textContent = `Despensa · ${total}`;
    this.el.urgent.textContent = left > 0 ? `¿Se agotó? Tócalo: urgente ×2 (${left})` : 'Sin pedidos urgentes';
    this.sig.pantry = '';
    this.sig.order = '';
  }

  // ── Fogones ─────────────────────────────────────────────
  #type(key) { return key.split('#')[0]; }

  // Reparte los tipos de fogón en filas equilibradas de hasta 5 fogones,
  // sin separar nunca un par (p. ej. las dos ollas) ni cambiar el orden.
  #stationRows() {
    if (this._rows) return this._rows;
    const groups = STATION_IDS.map((type) => ({ type, n: this.stationKeys.filter((k) => this.#type(k) === type).length })).filter((g) => g.n > 0);
    const total = groups.reduce((a, g) => a + g.n, 0);
    // Hasta 6 fogones por fila: con parrilla y equipo extra siguen bastando dos filas.
    const rowsNeeded = Math.ceil(total / 6);
    const target = Math.ceil(total / rowsNeeded);
    const rows = [[]];
    let used = 0;
    for (const g of groups) {
      if (used + g.n > target && rows[rows.length - 1].length && rows.length < rowsNeeded) { rows.push([]); used = 0; }
      rows[rows.length - 1].push(g.type);
      used += g.n;
    }
    this._rows = rows;
    return rows;
  }

  // Un solo tamaño para todos los fogones: el que permita que quepa la fila más llena.
  // Un par ocupa 2 fogones + 16 px (separación y borde); entre grupos hay 6 px.
  #ringSize() {
    const count = (type) => this.stationKeys.filter((k) => this.#type(k) === type).length;
    const fits = this.#stationRows().map((row) => {
      const n = row.reduce((a, t) => a + count(t), 0);
      const pairs = row.filter((t) => count(t) > 1).length;
      const overhead = 16 * pairs + 6 * (row.length - 1) + 6;
      return `calc((100cqi - ${overhead}px) / ${n})`;
    });
    return `min(var(--ring-max), ${fits.join(', ')})`;
  }

  #stationGroup(type) {
    const keys = this.stationKeys.filter((k) => this.#type(k) === type);
    return `<div class="st-group" data-count="${keys.length}">
      <div class="st-group__row">${keys.map((k, i) => `
        <button class="station" data-station="${k}" aria-label="${this.#stName(type)}${keys.length > 1 ? ` ${i + 1}` : ''}">
          <span class="station__ring"><span class="station__disc">${STATION_ART[type]}<span class="station__slot"></span></span></span>${this.helper?.stations.includes(k) ? `<span class="helper-badge">${staffSvg(this.helper)}</span>` : ''}
          <span class="station__status">Libre</span>
        </button>`).join('')}
      </div>
      <span class="station__name">${this.#stName(type)}</span>
    </div>`;
  }

  #renderStation(st) {
    const item = this.stations[st];
    const fire = this.fires[st];
    const el = this.el.stations[st];
    const state = fire ? 'fire' : !item ? 'idle' : item.kind === 'tap' ? 'working' : this.#timerState(item);
    const sig = fire ? `fire|${fire.taps}` : item ? `${item.id}|${state}|${item.taps ?? ''}` : 'idle';
    if (this.sig.stations[st] === sig) return;
    this.sig.stations[st] = sig;
    el.classList.remove('is-working', 'is-ready', 'is-burning', 'is-burnt', 'is-fire', 'is-flip');
    el.dataset.type = this.#type(st);
    const slot = el.querySelector('.station__slot');
    const status = el.querySelector('.station__status');
    if (fire) {
      el.classList.add('is-fire');
      slot.dataset.item = '';
      slot.innerHTML = '<span class="flames"><i></i><i></i><i></i></span>';
      status.textContent = `¡Apaga! ×${fire.taps}`;
      el.setAttribute('aria-label', `${this.#stName(this.#type(st))}: en llamas, toca ${fire.taps} veces`);
      return;
    }
    if (!item) {
      slot.dataset.item = '';
      slot.innerHTML = '';
      status.textContent = 'Libre';
      el.style.removeProperty('--glow');
      el.setAttribute('aria-label', `${this.#stName(this.#type(st))}: libre`);
      return;
    }
    if (slot.dataset.item !== String(item.id)) {
      slot.dataset.item = item.id;
      const wait = Math.max(0, Math.round((this.landAt.get(`st:${item.id}`) ?? 0) - performance.now()));
      this.landAt.delete(`st:${item.id}`);
      slot.innerHTML = ingredientSvg(item.ingredient, { className: 'station__item', title: '' }).replace('<svg ', `<svg style="--land:${wait}ms" `);
    }
    slot.querySelectorAll('.fx-steam,.fx-sizzle,.fx-smoke,.fx-bubbles,.fx-heat,.station__taps').forEach((n) => n.remove());
    let label;
    if (item.kind === 'tap') {
      el.classList.add('is-working');
      if (!slot.querySelector('.station__tool')) slot.insertAdjacentHTML('beforeend', `<span class="station__tool">${TOOL_ART[this.#type(st)] ?? ''}</span>`);
      status.textContent = this.#type(st) === 'tabla' ? '¡Corta!' : '¡Bate!';
      slot.insertAdjacentHTML('beforeend', `<span class="station__taps">${Array.from({ length: item.need }, (_, i) => `<i class="${i < item.taps ? 'is-on' : ''}"></i>`).join('')}</span>`);
      label = `${this.#stName(this.#type(st))}: toca ${item.need - item.taps} veces más`;
    } else {
      const type = this.#type(st);
      const fx = state === 'burning' || state === 'burnt' ? 'smoke' : type === 'sarten' || type === 'parrilla' ? 'sizzle' : type === 'olla' ? 'bubbles' : type === 'horno' ? 'heat' : 'steam';
      slot.insertAdjacentHTML('beforeend', `<span class="fx-${fx}">${'<i></i>'.repeat(fx === 'sizzle' || fx === 'bubbles' ? 5 : 3)}</span>`);
      if (this.#type(st) === 'horno') el.style.setProperty('--glow', state === 'cooking' ? '.6' : '.3');
      const text = { cooking: PROCESSES[item.process].verb + '…', flip: '¡Voltea!', ready: '¡Listo!', burning: '¡Se quema!', burnt: 'Tirar' }[state];
      status.textContent = text;
      el.classList.remove('is-flip');
      if (state === 'flip') el.classList.add('is-flip');
      else if (state !== 'cooking') el.classList.add(`is-${state}`);
      if (item.flip?.done) slot.querySelector('.station__item')?.classList.add('is-flipped');
      label = `${this.#stName(this.#type(st))}: ${text}`;
    }
    el.setAttribute('aria-label', label);
  }

  // ── Acciones del jugador ────────────────────────────────
  #onIngredient(ingId, btn) {
    if (!this.running || this.paused) return;
    if ((this.stock[ingId] ?? 0) <= 0) return this.#orderUrgent(ingId, btn);
    const o = this.selected !== null ? this.orders[this.selected] : null;
    if (!o) { floatText(btn, 'Elige un cliente', 'bad'); sfx.error(); return; }
    const idx = o.recipe.components.findIndex((c, i) => c.ingredient === ingId && !o.filled[i] && !o.busy[i]);
    if (idx < 0) {
      const inRecipe = o.recipe.components.some((c) => c.ingredient === ingId);
      floatText(btn, inRecipe ? 'Ya lo tienes' : 'No lo pide', 'bad');
      shake(btn);
      sfx.error();
      return;
    }
    const comp = o.recipe.components[idx];
    const proc = PROCESSES[comp.process];
    if (WASH_INGREDIENTS.has(ingId)) burst(btn, 'water');
    if (proc.kind === 'raw') {
      this.#take(ingId);
      o.filled[idx] = true;
      this.#toPlate(o, idx, btn, ingId);
      this.#checkComplete(o);
      this.#guideEvent('ingredient', ingId);
      return;
    }
    const keys = this.stationKeys.filter((k) => this.#type(k) === proc.station);
    const st = keys.find((k) => !this.stations[k] && !this.fires[k]);
    if (!st) {
      const first = this.el.stations[keys[0]];
      const allFire = keys.every((k) => this.fires[k]);
      keys.forEach((k) => shake(this.el.stations[k]));
      floatText(first, allFire ? '¡Hay fuego!' : keys.length > 1 ? 'Todas ocupadas' : 'Ocupado', 'bad');
      sfx.error();
      return;
    }
    this.#take(ingId);
    const base = { id: ++this.itemSeq, orderId: o.id, compIndex: idx, ingredient: ingId, process: comp.process, startedAt: this.t };
    if (proc.kind === 'tap') {
      this.stations[st] = { ...base, kind: 'tap', need: this.stats.taps[comp.process], taps: 0, lastTapAt: -Infinity };
    } else {
      const readyAt = this.t + this.stats.seconds[comp.process] * 1000;
      const burnSec = this.stats.burnSeconds[comp.process];
      const flip = (comp.process === 'freir' && FLIP_INGREDIENTS.has(ingId)) || comp.process === 'asar'
        ? { at: this.t + (readyAt - this.t) * 0.45, done: false, good: false } : null;
      this.stations[st] = { ...base, kind: 'timer', readyAt, burnAt: burnSec ? readyAt + burnSec * 1000 : Infinity, lastState: 'cooking', flip };
      if (proc.station === 'sarten') sfx.sizzle();
    }
    o.busy[idx] = true;
    sfx.place();
    const fly = flyIcon(btn, this.el.stations[st], ingredientSvg(ingId, { title: '' }));
    this.landAt.set(`st:${base.id}`, performance.now() + fly);
    this.#guideEvent('ingredient', ingId);
  }

  // Pedido urgente: 2 unidades al doble de precio; llegan en 3 segundos.
  #orderUrgent(ingId, btn) {
    if (this.deliveries.some((d) => d.ing === ingId)) { floatText(btn, 'Ya viene en camino', ''); return; }
    const n = Math.min(2, EMERGENCY_MAX_UNITS - this.emergencyUnits);
    const price = this.config.emergencyPrices?.[ingId];
    if (n <= 0 || !price) { floatText(btn, 'Agotado', 'bad'); shake(btn); sfx.error(); return; }
    this.emergency[ingId] = (this.emergency[ingId] ?? 0) + n;
    this.emergencyUnits += n;
    this.deliveries.push({ ing: ingId, n, at: this.t + EMERGENCY_DELAY_MS });
    this.coins -= price * n;
    this.el.coinNum.textContent = fmt(this.coins);
    floatText(btn, `Urgente −${price * n}`, 'bad');
    sfx.place();
    this.#renderStock();
  }

  #take(ingId) {
    this.stock[ingId] = (this.stock[ingId] ?? 0) - 1;
    this.#renderStock();
  }

  #onStation(st, el) {
    if (!this.running || this.paused) return;
    const fire = this.fires[st];
    if (fire) {
      fire.taps -= 1;
      sfx.whisk();
      if (fire.taps <= 0) {
        delete this.fires[st];
        this.firesOut += 1;
        floatText(el, '¡Apagado!', 'good');
        sfx.ready();
        this.#guideEvent('fireOut', st);
      }
      this.sig.stations[st] = '';
      return;
    }
    const item = this.stations[st];
    if (!item) { floatText(el, STATIONS[this.#type(st)].hint, ''); return; }
    if (item.kind === 'tap') {
      // Toques más rápidos que un humano no cuentan (igual que valida el servidor).
      if (this.t - item.lastTapAt < MIN_TAP_MS) return;
      item.lastTapAt = this.t;
      item.taps += 1;
      this.#type(st) === 'tabla' ? sfx.chop() : sfx.whisk();
      el.classList.remove('is-chop'); void el.offsetWidth; el.classList.add('is-chop');
      burst(el, this.#type(st) === 'tabla' ? 'bits' : 'drops', INGREDIENTS[item.ingredient].color);
      if (item.taps >= item.need) {
        const perfect = this.t - item.startedAt <= item.need * TAP_PERFECT_MS_PER_TAP;
        this.#deliver(st, item, perfect);
      }
      return;
    }
    const state = this.#timerState(item);
    if (state === 'flip') {
      item.flip.done = true;
      item.flip.good = this.t - item.flip.at <= 1500;
      sfx.sizzle();
      el.classList.remove('is-flipping'); void el.offsetWidth; el.classList.add('is-flipping');
      floatText(el, item.flip.good ? '¡Buen volteo!' : 'Volteado', item.flip.good ? 'good' : '');
      this.sig.stations[st] = '';
      return;
    }
    if (state === 'cooking') { floatText(el, item.flip && !item.flip.done ? 'Espera para voltear' : 'Aún no', ''); return; }
    if (state === 'burnt') {
      this.stations[st] = null;
      this.#addWaste(item.ingredient);
      floatText(el, 'A la basura', 'bad');
      sfx.tap();
      return;
    }
    const flippedOk = !item.flip || item.flip.good;
    this.#deliver(st, item, flippedOk && this.t - item.readyAt <= PERFECT_WINDOW_MS);
  }

  #deliver(st, item, perfect) {
    this.stations[st] = null;
    const o = this.orders[item.orderId];
    if (o.status !== 'seated') { this.#addWaste(item.ingredient); floatText(this.el.stations[st], 'Se fue', 'bad'); return; }
    o.filled[item.compIndex] = true;
    o.busy[item.compIndex] = false;
    if (perfect) {
      o.perfects += 1;
      floatText(this.el.stations[st], '¡Perfecto!', 'good');
    }
    this.#toPlate(o, item.compIndex, this.el.stations[st], item.ingredient);
    this.#checkComplete(o);
    this.#guideEvent('deliver', st);
  }

  // El ingrediente vuela en arco al plato de la comanda (o al cliente, si no es el
  // pedido a la vista); al aterrizar, el plato rebota y el ingrediente cae encima.
  #toPlate(o, idx, from, ingId) {
    // Si ya va otro ingrediente al plato siguiente, el plato terminado despega ya.
    if (this.ticketHold != null && this.ticketHold !== o.id) this.orders[this.ticketHold].launchPlate?.();
    sfx.plate();
    const onTicket = o.id === this.selected;
    const target = onTicket ? this.el.order.querySelector('.order__plate') : this.custEls.get(o.id);
    const dur = flyIcon(from, target ?? this.el.order, ingredientSvg(ingId, { title: '' }), () => {
      if (!onTicket) return;
      const plate = this.el.order.querySelector('.order__plate');
      if (!plate) return;
      plate.classList.remove('is-land'); void plate.offsetWidth; plate.classList.add('is-land');
    });
    this.landAt.set(`${o.id}:${idx}`, performance.now() + dur);
    o.landsAt = performance.now() + dur;
    o.lastFromTicket = onTicket;
  }

  #checkComplete(o) {
    if (!o.filled.every(Boolean)) return;
    o.status = 'served';
    const servedAt = Math.round(this.t);
    this.serves.push({ orderId: o.id, recipeId: o.recipeId, servedAt, perfects: o.perfects });
    this.combo += 1;
    o.servedAt = servedAt;
    // Grupo: si su amigo comió hace poco, los dos cobran el bono.
    // Grupo: si todos sus amigos ya comieron hace poco, todos cobran el bono.
    const mates = o.group != null ? this.orders.filter((x) => x.group === o.group && x.id !== o.id) : [];
    const times = [servedAt, ...mates.map((m) => m.servedAt)];
    const together = mates.length > 0 && mates.every((m) => m.servedAt != null) && Math.max(...times) - Math.min(...times) <= GROUP_WINDOW_MS;
    // Estimación en vivo con la misma fórmula que usa el servidor.
    const { earned, mult } = plateEarnings(o, o.recipe, servedAt, o.perfects, this.combo, this.stats, together);
    const partnerBonus = together ? mates.reduce((a, m) => a + Math.round(m.recipe.price * GROUP_BONUS * mult), 0) : 0;
    const el = this.custEls.get(o.id);
    const wait = Math.max(0, (o.landsAt ?? 0) - performance.now());
    // Si el último ingrediente fue directo al cliente, no hace falta que vuele el plato.
    if (o.lastFromTicket) {
      // El plato espera en la comanda a que aterrice el último ingrediente, rebota y despega.
      this.ticketHold = o.id;
      o.launchPlate = () => {
        if (o.plateGone) return;
        o.plateGone = true;
        this.#serveFx(o, el, earned + partnerBonus, true);
        if (this.ticketHold === o.id) { this.ticketHold = null; this.sig.order = ''; }
      };
      o.stayMs = wait + PLATE_PAUSE_MS + 470 + 380;
      setTimeout(o.launchPlate, wait + PLATE_PAUSE_MS);
    } else {
      o.stayMs = wait + 380;
      setTimeout(() => this.#serveFx(o, el, earned + partnerBonus, false), wait);
    }
    if (together) {
      sfx.together();
      if (el) setTimeout(() => floatText(el, '¡Comieron juntos!', 'good'), 450);
    } else {
      for (const m of mates) {
        if (m.status !== 'seated') continue;
        const pel = this.custEls.get(m.id);
        if (pel) { pel.classList.add('is-waiting-friend'); floatText(pel, '¡Ahora yo!', ''); }
      }
    }
    this.#comboUi(true);
    const visible = this.#visible();
    if (this.selected === o.id) this.selected = visible[0]?.id ?? null;
    this.#renderCustomers();
    this.#guideEvent('served', o.id);
  }

  // Animación al servir: el plato vuela al cliente y las monedas suben al contador.
  #serveFx(o, el, amount, fromTicket = true) {
    if (!this.el.root?.isConnected) return;
    const from = fromTicket ? this.el.order.querySelector('.order__plate') ?? this.el.order : null;
    const dish = o.recipe.components.slice(0, 3).map((c) => ingredientSvg(c.ingredient, { title: '' })).join('');
    sfx.serve();
    flyPlate(from, el ?? this.el.customers, dish, () => {
      if (el) {
        el.classList.add('is-eating');
        floatText(el, `+${amount}`, 'gold big');
        for (let i = 0; i < 3; i++) {
          setTimeout(() => { flyIcon(el, this.el.coins, coinSvg()); }, 90 * i);
        }
      }
      setTimeout(() => {
        sfx.coin();
        this.coins += amount;
        this.el.coinNum.textContent = fmt(this.coins);
        this.el.coins.classList.remove('is-bump'); void this.el.coins.offsetWidth; this.el.coins.classList.add('is-bump');
      }, 420);
    });
  }

  #comboUi(bump = false) {
    const c = this.el.combo;
    const step = Math.min(this.combo - 1, MAX_COMBO_STEPS);
    c.classList.toggle('is-on', this.combo >= 2);
    c.classList.toggle('is-max', step >= MAX_COMBO_STEPS);
    this.el.root.classList.toggle('is-hot', step >= MAX_COMBO_STEPS);
    if (this.combo >= 2) {
      c.classList.remove('is-broken');
      c.style.setProperty('--heat', String(step / MAX_COMBO_STEPS));
      c.innerHTML = `${icon('fire')}<b>×${(1 + 0.1 * step).toFixed(1)}</b><span class="combo__pips">${Array.from({ length: MAX_COMBO_STEPS }, (_, i) => `<i class="${i < step ? 'is-on' : ''}"></i>`).join('')}</span>`;
      if (bump) {
        c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump');
        if (step === MAX_COMBO_STEPS && this.combo === MAX_COMBO_STEPS + 1) {
          this.#ribbon('¡En llamas!', 'Combo máximo ×1.5', 'fire');
          sfx.comboMax();
        }
      }
    }
  }

  #loseLife(n) {
    if (this.closed) return;
    this.lives = Math.max(0, this.lives - n);
    this.el.lives.forEach((el, i) => {
      const lost = i >= this.lives;
      if (lost && !el.classList.contains('is-lost')) { el.classList.add('is-lost', 'is-breaking'); setTimeout(() => el.classList.remove('is-breaking'), 600); }
    });
    vibrate([60, 40, 60]);
    this.host.querySelector('.lives')?.setAttribute('aria-label', `${this.lives} vidas`);
    if (this.lives <= 0) this.closed = true;
    else if (this.lives === 1) this.#ribbon('¡Última vida!', 'Si se va otro cliente, cierran la cocina', 'fire');
  }

  #comboLost() {
    const c = this.el.combo;
    floatText(c, 'Combo perdido', 'bad');
    sfx.comboLost();
    c.classList.remove('is-broken'); void c.offsetWidth; c.classList.add('is-broken');
  }

  #finish() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.rushGlow?.remove();
    // Lo que quedó a medio preparar también se pierde.
    for (const st of this.stationKeys) if (this.stations[st]) this.#addWaste(this.stations[st].ingredient);
    for (const o of this.orders) {
      if (o.status !== 'seated') continue;
      o.recipe.components.forEach((c, i) => { if (o.filled[i]) this.#addWaste(c.ingredient); });
    }
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = this.closed
      ? `<div class="countdown countdown--closed" style="font-size:52px">¡Cerraron la cocina!</div><p>Se fueron demasiados clientes enojados. Igual pagas los gastos del local.</p>`
      : `<div class="countdown" style="font-size:72px">¡Tiempo!</div><p>Cerrando caja…</p>`;
    this.el.root.appendChild(ov);
    if (this.closed) sfx.burn(); else sfx.count(true);
    music.stop();
    this.el.root.classList.remove('is-hot');
    setTimeout(() => this.onFinish({ serves: this.serves, waste: this.waste, emergency: this.emergency, firesOut: this.firesOut, estimate: this.coins, helperStats: this.helperStats }), 1100);
  }
}

function clockText(ms) {
  const secs = Math.ceil(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

// Ingredientes que hay que voltear en la sartén a mitad de cocción.
// Toldo del local para el tutorial: barra, rayas con volumen, faldón de ondas y sombra.
function awningSvg(theme) {
  const p = theme.primary, d = theme.deep, light = '#FFF8EE';
  const n = 12, w = 30;
  const stripes = Array.from({ length: n }, (_, i) => `<rect x="${i * w}" y="8" width="${w}" height="26" fill="${i % 2 ? light : p}"/>`).join('');
  const scallops = Array.from({ length: n }, (_, i) => `<path d="M${i * w} 33h${w}v1a${w / 2} ${w / 2 - 3} 0 0 1-${w} 0z" fill="${i % 2 ? light : p}" stroke="${d}" stroke-width="1.4" stroke-opacity=".35"/>`).join('');
  return `<svg class="tuto__awning" viewBox="0 0 360 58" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="aw-fold" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
      <pattern id="aw-folds" width="30" height="58" patternUnits="userSpaceOnUse"><rect width="30" height="58" fill="url(#aw-fold)"/></pattern>
      <linearGradient id="aw-shadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    </defs>
    <rect y="40" width="360" height="18" fill="url(#aw-shadow)"/>
    ${stripes}${scallops}
    <rect y="8" width="360" height="38" fill="url(#aw-folds)" opacity=".8"/>
    <rect y="0" width="360" height="9" rx="2" fill="${d}"/>
    <rect y="2" width="360" height="2" fill="#fff" opacity=".25"/>
  </svg>`;
}

// Pausa entre que el último ingrediente cae en el plato y el plato sale hacia el cliente.
const PLATE_PAUSE_MS = 160;
const THANKS = ['¡Delicioso!', '¡Gracias!', '¡Qué rico!', '¡10 de 10!', '¡Vuelvo mañana!', '¡Exquisito!'];

const FLIP_INGREDIENTS = new Set(['carne_res', 'pollo', 'cerdo', 'pescado', 'salmon', 'atun', 'camaron', 'huevo', 'tortilla']);
// Verduras y frutas que se lavan antes de usarse (salpicadura de agua).
const WASH_INGREDIENTS = new Set(['lechuga', 'tomate', 'cilantro', 'albahaca', 'fresa', 'pepino', 'limon', 'aguacate', 'chile', 'aji', 'papa', 'camote', 'cebolla', 'champinon', 'pina']);

// Partículas breves: trocitos al cortar, gotas al batir, agua al lavar.
function burst(el, kind, color = '#7FC4F0') {
  const r = el.getBoundingClientRect();
  const box = document.createElement('div');
  box.className = `burst burst--${kind}`;
  box.style.left = `${r.left + r.width / 2}px`;
  box.style.top = `${r.top + r.height * 0.4}px`;
  const n = kind === 'water' ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
    const dist = 18 + Math.random() * 16;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist - 10}px`);
    if (kind !== 'water') p.style.background = color;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 650);
}

function shake(el) {
  el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake');
}
