// Motor de la cocina. Corre a 60 fps con requestAnimationFrame y registra
// qué pedidos se sirvieron, cuándo y qué se desperdició; el servidor valida y paga.

import {
  RECIPE_BY_ID, PROCESSES, STATIONS, STATION_IDS, INGREDIENTS, ordersForConfig, plateEarnings,
  rushWindow, generateEvents, PERFECT_WINDOW_MS, MAX_COMBO_STEPS, MIN_TAP_MS, FIRE_TAPS,
  EMERGENCY_MAX_UNITS, EMERGENCY_DELAY_MS
} from './shared/index.js';
import { ingredientSvg, processSvg, customerSvg, STATION_ART, coinSvg, icon } from './art.js';
import { sfx } from './audio.js';
import { floatText, flyIcon, escapeHtml, fmt } from './ui.js';

const TAP_PERFECT_MS_PER_TAP = 380;

export class Kitchen {
  constructor(host, { config, restaurant, firstTime, onFinish, onQuit }) {
    this.host = host;
    this.config = config;
    this.restaurant = restaurant;
    this.firstTime = firstTime;
    this.onFinish = onFinish;
    this.onQuit = onQuit;
    this.stats = config.stats;
    this.orders = ordersForConfig(config).map((o) => {
      const recipe = RECIPE_BY_ID[o.recipeId];
      return { ...o, recipe, status: 'waiting', filled: recipe.components.map(() => false), busy: recipe.components.map(() => false), perfects: 0 };
    });
    this.stations = Object.fromEntries(STATION_IDS.map((s) => [s, null]));
    this.fires = {};
    this.events = generateEvents({ seed: config.seed, durationMs: config.durationMs, tier: config.tier ?? 0 }).map((e) => ({ ...e, done: false }));
    this.rush = rushWindow(config.seed, config.durationMs);
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
    this.itemSeq = 0;
    this.custEls = new Map();
    this.sig = { order: '', stations: {}, pantry: '' };
    this.pantryIds = [...new Set(config.menu.flatMap((id) => RECIPE_BY_ID[id].components.map((c) => c.ingredient)))];
    this.frame = this.frame.bind(this);
  }

  // ── Montaje ─────────────────────────────────────────────
  mount() {
    this.host.innerHTML = `
      <div class="game" role="application" aria-label="Cocina">
        <div class="game__inner">
          <div class="wall">
            <div class="hud">
              <button class="round-btn" data-act="pause" aria-label="Pausa">${icon('pause')}</button>
              <div class="timer">
                <span class="ring timer__ring"><span class="ring__inner timer__clock">2:00</span></span>
                <span style="min-width:0"><span class="timer__name" style="display:block">${escapeHtml(this.restaurant.name)}</span><span class="timer__sub">Gastos del local: ${fmt(this.config.upkeep ?? 0)}</span></span>
              </div>
              <span class="hud__coins">${coinSvg()}<span class="hud__num">0</span></span>
            </div>
          </div>
          <div class="bar">
            <div class="lamps" aria-hidden="true"><span class="lamp"><i></i><b></b></span><span class="lamp"><i></i><b></b></span><span class="lamp"><i></i><b></b></span></div>
            <div class="bar__counter"></div>
            <div class="customers" style="--slots:${this.stats.slots}"></div>
          </div>
          <div class="order-wrap"><div class="ticket order"></div><div class="combo" aria-live="polite"></div></div>
          <div class="counter">${STATION_IDS.map((s) => this.#stationShell(s)).join('')}</div>
          <div class="shelf" style="--jar:${this.pantryIds.length <= 5 ? 76 : this.pantryIds.length <= 10 ? 62 : 54}px">
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
      order: this.host.querySelector('.order'),
      stations: Object.fromEntries(STATION_IDS.map((s) => [s, this.host.querySelector(`[data-station="${s}"]`)])),
      pantry: [...this.host.querySelectorAll('.jar')],
      shelfCount: this.host.querySelector('.shelf__count'),
      urgent: this.host.querySelector('.shelf__urgent')
    };
    this.#bind();
    this.#renderCustomers();
    this.#renderOrder();
    this.#renderStock();
    STATION_IDS.forEach((s) => this.#renderStation(s));
    this.#intro();
  }

  #bind() {
    const root = this.el.root;
    root.addEventListener('pointerdown', (e) => {
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
      if (!target) return;
      e.preventDefault();
      if (target.dataset.ing) this.#onIngredient(target.dataset.ing, target);
      else if (target.dataset.station) this.#onStation(target.dataset.station, target);
      else this.#select(Number(target.dataset.order));
    });
    root.querySelector('[data-act="pause"]').addEventListener('click', () => this.pause());
    this.onVisibility = () => { if (document.hidden && this.running) this.pause(); };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.host.innerHTML = '';
  }

  // ── Introducción y cuenta atrás ─────────────────────────
  #intro() {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    const units = Object.values(this.stock).reduce((a, n) => a + n, 0);
    if (this.firstTime) {
      ov.innerHTML = `
        <h2>Cómo se juega</h2>
        <div class="howto">
          <div><b>1</b>Toca a un cliente para ver su comanda</div>
          <div><b>2</b>Toca los frascos resaltados de la despensa</div>
          <div><b>3</b>Toca los fogones para cortar, batir o recoger</div>
          <div><b>4</b>Si hay fuego, tócalo rápido para apagarlo</div>
        </div>
        <p>Cocinas con lo que compraste en el mercado (${units} ingredientes). Si algo se agota, toca su frasco: pedido urgente al doble de precio. Los críticos con boina pagan el doble.</p>
        <button class="btn btn--gold btn--xl" data-act="go">¡A cocinar!</button>`;
      ov.querySelector('[data-act="go"]').addEventListener('click', () => { ov.remove(); this.#countdown(); });
      this.el.root.appendChild(ov);
    } else {
      this.#countdown();
    }
  }

  #countdown() {
    const ov = document.createElement('div');
    ov.className = 'overlay';
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
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `
      <h2>Pausa</h2>
      <p>Los clientes esperan. Si sales, este servicio no cuenta, pero los ingredientes que ya usaste se quedan en tu despensa.</p>
      <button class="btn btn--gold btn--xl" data-act="resume">Continuar</button>
      <button class="btn btn--ghost" data-act="quit">Salir del servicio</button>`;
    ov.querySelector('[data-act="resume"]').addEventListener('click', () => {
      ov.remove(); this.paused = false; this.last = performance.now();
    });
    ov.querySelector('[data-act="quit"]').addEventListener('click', () => { this.destroy(); this.onQuit(); });
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
    }
    if (this.t >= this.config.durationMs) return this.#finish();
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
      } else if (o.status === 'seated' && t > o.arriveAt + o.patienceMs) {
        o.status = 'left';
        changed = true;
        this.combo = 0;
        this.#comboUi();
        sfx.angry();
        // Lo que ya estaba en su plato se desperdicia.
        o.recipe.components.forEach((c, i) => { if (o.filled[i]) this.#addWaste(c.ingredient); });
        const el = this.custEls.get(o.id);
        if (el) floatText(el, '¡Me voy!', 'bad');
      }
    }
    for (const st of STATION_IDS) {
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
      const st = ev.station;
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
      this.#ribbon(`¡Fuego en ${st === 'sarten' ? 'la sartén' : 'el horno'}!`, 'Tócalo rápido para apagarlo', 'fire');
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
    // Hora pico.
    if (this.rushState === 'before' && t >= this.rush.from) {
      this.rushState = 'on';
      this.#ribbon('¡Hora pico!', 'Llegan clientes sin parar');
      this.rushGlow = document.createElement('div');
      this.rushGlow.className = 'rush-glow';
      this.el.root.appendChild(this.rushGlow);
    } else if (this.rushState === 'on' && t >= this.rush.to) {
      this.rushState = 'after';
      this.rushGlow?.remove();
    }
    for (const st of STATION_IDS) {
      const item = this.stations[st];
      if (!item || item.kind !== 'timer') continue;
      const state = this.#timerState(item);
      if (state !== item.lastState) {
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

  #ribbon(title, sub, variant = '') {
    const r = document.createElement('div');
    r.className = `ribbon ${variant ? `ribbon--${variant}` : ''}`;
    r.innerHTML = `${escapeHtml(title)}${sub ? `<small>${escapeHtml(sub)}</small>` : ''}`;
    this.el.root.appendChild(r);
    setTimeout(() => r.remove(), 2300);
  }

  #visible() {
    return this.orders.filter((o) => o.status === 'seated').slice(0, this.stats.slots);
  }

  #queueCount() {
    return Math.max(0, this.orders.filter((o) => o.status === 'seated').length - this.stats.slots);
  }

  #timerState(item) {
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
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    if (this.el.clock.textContent !== clock) this.el.clock.textContent = clock;
    this.el.ring.style.setProperty('--p', ((left / this.config.durationMs) * 100).toFixed(1));
    this.el.timer.classList.toggle('is-low', secs <= 15);

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

    for (const st of STATION_IDS) {
      this.#renderStation(st);
      const item = this.stations[st];
      const el = this.el.stations[st];
      if (this.fires[st]) {
        el.style.setProperty('--p', (1 - this.fires[st].taps / FIRE_TAPS).toFixed(3));
      } else if (item?.kind === 'timer') {
        const state = this.#timerState(item);
        let p;
        if (state === 'cooking') p = (this.t - item.startedAt) / (item.readyAt - item.startedAt);
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
    const visible = this.#visible();
    const ids = new Set(visible.map((o) => o.id));
    for (const [id, el] of this.custEls) {
      if (ids.has(id)) continue;
      const o = this.orders[id];
      const r = el.getBoundingClientRect();
      const pr = box.getBoundingClientRect();
      Object.assign(el.style, { position: 'absolute', left: `${r.left - pr.left}px`, top: `${r.top - pr.top}px`, width: `${r.width}px`, zIndex: 2 });
      el.classList.remove('is-selected');
      el.classList.add(o.status === 'served' ? 'is-served' : 'is-leaving');
      setTimeout(() => el.remove(), 800);
      this.custEls.delete(id);
    }
    box.querySelectorAll('.seat-empty, .queue-badge').forEach((n) => n.remove());
    for (const o of visible) {
      if (this.custEls.has(o.id)) continue;
      const el = document.createElement('button');
      el.className = `customer ${o.vip ? 'is-vip' : ''}`;
      el.dataset.order = o.id;
      el.dataset.mood = 'happy';
      el.setAttribute('aria-label', `${o.vip ? 'Crítico gastronómico' : 'Cliente'} pide ${o.recipe.name}`);
      el.innerHTML = `
        <span class="bubble">
          <span class="bubble__dish">${o.recipe.components.slice(0, 4).map((c) => ingredientSvg(c.ingredient, { title: '' })).join('')}</span>
          <span class="bubble__name">${escapeHtml(o.recipe.name)}</span>
        </span>
        <span class="avatar" style="--p:100"><span class="avatar__face">${customerSvg(o.look, 'happy', '', o.vip)}</span>${o.vip ? '<span class="vip-tag">VIP</span>' : ''}</span>`;
      el.addEventListener('animationend', (e) => { if (e.animationName === 'customer-in') el.style.animation = 'none'; });
      box.appendChild(el);
      this.custEls.set(o.id, el);
      sfx.arrive();
    }
    for (let i = visible.length; i < this.stats.slots; i++) {
      const s = document.createElement('div');
      s.className = 'seat-empty';
      s.innerHTML = '<i></i><span>Libre</span>';
      box.appendChild(s);
    }
    const q = this.#queueCount();
    if (q > 0) {
      const b = document.createElement('div');
      b.className = 'queue-badge';
      b.textContent = `+${q} en fila`;
      box.appendChild(b);
    }
    for (const [id, el] of this.custEls) {
      el.classList.toggle('is-selected', id === this.selected);
      el.setAttribute('aria-pressed', String(id === this.selected));
    }
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
  }

  // ── Comanda del pedido seleccionado ─────────────────────
  #renderOrder() {
    const o = this.selected !== null ? this.orders[this.selected] : null;
    const stockSig = o ? o.recipe.components.map((c) => (this.stock[c.ingredient] ?? 0) > 0 ? 1 : 0).join('') : '';
    const sig = o ? `${o.id}|${o.filled.join()}|${o.busy.join()}|${stockSig}` : `none|${this.t < 2000}`;
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
    let hint = 'Recoge lo que está en los fogones';
    if (next >= 0) {
      const c = o.recipe.components[next];
      hint = (this.stock[c.ingredient] ?? 0) <= 0
        ? `Sin ${INGREDIENTS[c.ingredient].name}: no podrás servirlo`
        : `Siguiente: ${INGREDIENTS[c.ingredient].name} · ${PROCESSES[c.process].verb}`;
    }
    el.innerHTML = `
      <div class="order__plate"><div class="plate__dish"></div>
        <div class="order__stack">${o.recipe.components.map((c, i) => o.filled[i] ? ingredientSvg(c.ingredient, { title: '' }) : '').join('')}</div>
      </div>
      <div>
        <div class="order__title">${escapeHtml(o.recipe.name)}${o.vip ? ` <span class="tag tag--deal" style="padding:2px 8px;font-size:11px">${icon('crown', 'style="width:12px;height:12px"')} ×2</span>` : ''}</div>
        <div class="order__hint">${hint}</div>
        <div class="order__comps">${o.recipe.components.map((c, i) => {
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
  #stationShell(st) {
    return `<button class="station" data-station="${st}" aria-label="${STATIONS[st].name}">
      <span class="station__ring"><span class="station__disc">${STATION_ART[st]}<span class="station__slot"></span></span></span>
      <span class="station__name">${STATIONS[st].name}</span>
      <span class="station__status">Libre</span>
    </button>`;
  }

  #renderStation(st) {
    const item = this.stations[st];
    const fire = this.fires[st];
    const el = this.el.stations[st];
    const state = fire ? 'fire' : !item ? 'idle' : item.kind === 'tap' ? 'working' : this.#timerState(item);
    const sig = fire ? `fire|${fire.taps}` : item ? `${item.id}|${state}|${item.taps ?? ''}` : 'idle';
    if (this.sig.stations[st] === sig) return;
    this.sig.stations[st] = sig;
    el.classList.remove('is-working', 'is-ready', 'is-burning', 'is-burnt', 'is-fire');
    const slot = el.querySelector('.station__slot');
    const status = el.querySelector('.station__status');
    if (fire) {
      el.classList.add('is-fire');
      slot.dataset.item = '';
      slot.innerHTML = '<span class="flames"><i></i><i></i><i></i></span>';
      status.textContent = `¡Apaga! ×${fire.taps}`;
      el.setAttribute('aria-label', `${STATIONS[st].name}: en llamas, toca ${fire.taps} veces`);
      return;
    }
    if (!item) {
      slot.dataset.item = '';
      slot.innerHTML = '';
      status.textContent = 'Libre';
      el.style.removeProperty('--glow');
      el.setAttribute('aria-label', `${STATIONS[st].name}: libre`);
      return;
    }
    if (slot.dataset.item !== String(item.id)) {
      slot.dataset.item = item.id;
      slot.innerHTML = ingredientSvg(item.ingredient, { className: 'station__item', title: '' });
    }
    slot.querySelectorAll('.fx-steam,.fx-sizzle,.fx-smoke,.station__taps').forEach((n) => n.remove());
    let label;
    if (item.kind === 'tap') {
      el.classList.add('is-working');
      status.textContent = st === 'tabla' ? '¡Corta!' : '¡Bate!';
      slot.insertAdjacentHTML('beforeend', `<span class="station__taps">${Array.from({ length: item.need }, (_, i) => `<i class="${i < item.taps ? 'is-on' : ''}"></i>`).join('')}</span>`);
      label = `${STATIONS[st].name}: toca ${item.need - item.taps} veces más`;
    } else {
      const fx = state === 'burning' || state === 'burnt' ? 'smoke' : st === 'sarten' ? 'sizzle' : 'steam';
      slot.insertAdjacentHTML('beforeend', `<span class="fx-${fx}">${'<i></i>'.repeat(fx === 'sizzle' ? 4 : 3)}</span>`);
      if (st === 'horno') el.style.setProperty('--glow', state === 'cooking' ? '.6' : '.3');
      const text = { cooking: PROCESSES[item.process].verb + '…', ready: '¡Listo!', burning: '¡Se quema!', burnt: 'Tirar' }[state];
      status.textContent = text;
      if (state !== 'cooking') el.classList.add(`is-${state}`);
      label = `${STATIONS[st].name}: ${text}`;
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
    if (proc.kind === 'raw') {
      this.#take(ingId);
      o.filled[idx] = true;
      sfx.plate();
      flyIcon(btn, this.el.order.querySelector('.order__plate') ?? this.el.order, ingredientSvg(ingId, { title: '' }));
      this.#checkComplete(o);
      return;
    }
    const st = proc.station;
    if (this.fires[st]) { shake(this.el.stations[st]); floatText(this.el.stations[st], '¡Hay fuego!', 'bad'); sfx.error(); return; }
    if (this.stations[st]) {
      shake(this.el.stations[st]);
      floatText(this.el.stations[st], 'Ocupado', 'bad');
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
      this.stations[st] = { ...base, kind: 'timer', readyAt, burnAt: burnSec ? readyAt + burnSec * 1000 : Infinity, lastState: 'cooking' };
      if (st === 'sarten') sfx.sizzle();
    }
    o.busy[idx] = true;
    sfx.place();
    flyIcon(btn, this.el.stations[st], ingredientSvg(ingId, { title: '' }));
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
        floatText(el, '¡Apagado!', 'good');
        sfx.ready();
      }
      this.sig.stations[st] = '';
      return;
    }
    const item = this.stations[st];
    if (!item) { floatText(el, STATIONS[st].hint, ''); return; }
    if (item.kind === 'tap') {
      // Toques más rápidos que un humano no cuentan (igual que valida el servidor).
      if (this.t - item.lastTapAt < MIN_TAP_MS) return;
      item.lastTapAt = this.t;
      item.taps += 1;
      st === 'tabla' ? sfx.chop() : sfx.whisk();
      el.classList.remove('is-chop'); void el.offsetWidth; el.classList.add('is-chop');
      if (item.taps >= item.need) {
        const perfect = this.t - item.startedAt <= item.need * TAP_PERFECT_MS_PER_TAP;
        this.#deliver(st, item, perfect);
      }
      return;
    }
    const state = this.#timerState(item);
    if (state === 'cooking') { floatText(el, 'Aún no', ''); return; }
    if (state === 'burnt') {
      this.stations[st] = null;
      this.#addWaste(item.ingredient);
      floatText(el, 'A la basura', 'bad');
      sfx.tap();
      return;
    }
    this.#deliver(st, item, this.t - item.readyAt <= PERFECT_WINDOW_MS);
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
    sfx.plate();
    const target = o.id === this.selected ? this.el.order.querySelector('.order__plate') : this.custEls.get(o.id);
    flyIcon(this.el.stations[st], target ?? this.el.order, ingredientSvg(item.ingredient, { title: '' }));
    this.#checkComplete(o);
  }

  #checkComplete(o) {
    if (!o.filled.every(Boolean)) return;
    o.status = 'served';
    const servedAt = Math.round(this.t);
    this.serves.push({ orderId: o.id, recipeId: o.recipeId, servedAt, perfects: o.perfects });
    this.combo += 1;
    // Estimación en vivo con la misma fórmula que usa el servidor.
    const { earned } = plateEarnings(o, o.recipe, servedAt, o.perfects, this.combo, this.stats);
    this.coins += earned;
    const el = this.custEls.get(o.id);
    if (el) floatText(el, `+${earned}`, 'gold big');
    sfx.serve();
    setTimeout(() => sfx.coin(), 220);
    this.el.coinNum.textContent = fmt(this.coins);
    this.el.coins.classList.remove('is-bump'); void this.el.coins.offsetWidth; this.el.coins.classList.add('is-bump');
    this.#comboUi(true);
    const visible = this.#visible();
    if (this.selected === o.id) this.selected = visible[0]?.id ?? null;
    this.#renderCustomers();
  }

  #comboUi(bump = false) {
    const c = this.el.combo;
    c.classList.toggle('is-on', this.combo >= 2);
    if (this.combo >= 2) {
      c.textContent = `Combo ×${(1 + 0.1 * Math.min(this.combo - 1, MAX_COMBO_STEPS)).toFixed(1)}`;
      if (bump) { c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); }
    }
  }

  #finish() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.rushGlow?.remove();
    // Lo que quedó a medio preparar también se pierde.
    for (const st of STATION_IDS) if (this.stations[st]) this.#addWaste(this.stations[st].ingredient);
    for (const o of this.orders) {
      if (o.status !== 'seated') continue;
      o.recipe.components.forEach((c, i) => { if (o.filled[i]) this.#addWaste(c.ingredient); });
    }
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="countdown" style="font-size:72px">¡Tiempo!</div><p>Cerrando caja…</p>`;
    this.el.root.appendChild(ov);
    sfx.count(true);
    setTimeout(() => this.onFinish({ serves: this.serves, waste: this.waste, emergency: this.emergency, estimate: this.coins }), 1100);
  }
}

function shake(el) {
  el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake');
}
