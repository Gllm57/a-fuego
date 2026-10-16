// Capa de datos. Con servidor usa la API REST; sin servidor (p. ej. abriendo
// el cliente como página estática) usa el mismo motor de /shared en el navegador.

import {
  newPlayerState, RETIRED_UPGRADES, retiredRefund, retiredDecorRefund, emptyStats, STARTER_RESTAURANT, sanitizeStaff, decorOf, evaluateDecorBuy, applyDecorBuy, evaluateDecorEquip, applyDecorEquip, DECOR, evaluateHire, applyHire, addStaffExp, addRunToStats, pendingAchievements, evaluatePurchase, applyGrants, empireProgress, nextGoal, levelFromXp, levelProgress,
  dailyChallenge, todayUTC, buildRunConfig, RunStartError, scoreRun, RunValidationError,
  marketIngredients, marketPrices, evaluateMarketBuy, applyInventory, dailyBasket, storageCapacity, inventoryCount,
  BULK_QTY, BULK_DISCOUNT, inventoryDelta, UPGRADES, RESTAURANTS, RECIPES, STAFF, xpForLevel
} from './shared/index.js';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}

const TOKEN_KEY = 'afuego.token';
// Modo prueba (artefacto): monedas infinitas y todo desbloqueado, guardado aparte.
export const SANDBOX = typeof __AFUEGO_SANDBOX__ !== 'undefined' && __AFUEGO_SANDBOX__ === true;
const LOCAL_KEY = SANDBOX ? 'afuego.sandbox.v1' : 'afuego.local.v1';
const SANDBOX_COINS = 9_999_999;

// Estado de prueba: el final del juego, con todo comprado y la cevichería abierta.
function sandboxState() {
  const base = newPlayerState();
  const upgrades = Object.fromEntries(UPGRADES.map((u) => [u.id, u.costs.length]));
  return {
    ...base,
    coins: SANDBOX_COINS,
    xp: xpForLevel(24),
    restaurants: RESTAURANTS.map((r) => r.id),
    recipes: RECIPES.map((r) => r.id),
    upgrades,
    inventory: {},
    staff: { hired: 'rosa', owned: STAFF.map((m) => m.id), exp: { pepe: 0, rosa: 5, luis: 15 } },
    decor: { owned: DECOR.map((x) => x.id), equipped: { toldo: 'toldo_local', pared: 'pared_lisa', luces: 'luces_colgantes', barra: 'barra_roble', deco: [] } }
  };
}

// Rellena la despensa con lo que pide el menú de un restaurante (10 de cada uno).
function sandboxRefill(state, restaurantId) {
  const inventory = { ...state.inventory };
  for (const r of RECIPES.filter((x) => x.restaurant === restaurantId)) {
    for (const c of r.components) inventory[c.ingredient] = Math.max(inventory[c.ingredient] ?? 0, 10);
  }
  return { ...state, coins: SANDBOX_COINS, inventory };
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* modo privado */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* modo privado */ } }
};

export async function createApi() {
  // La microapp estática (npm run build:static) no tiene servidor: modo local directo.
  if (typeof __AFUEGO_STATIC__ !== 'undefined') return new LocalApi();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('/health', { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok && (await res.json()).ok) return new HttpApi();
  } catch { /* sin servidor */ }
  return new LocalApi();
}

// ── Servidor ─────────────────────────────────────────────────
class HttpApi {
  mode = 'online';
  token = store.get(TOKEN_KEY);

  async #req(method, path, body, headers = {}) {
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(`/api/v1${path}`, {
          method,
          headers: {
            ...(body ? { 'content-type': 'application/json' } : {}),
            ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined
        });
        if (res.status < 500 && res.status !== 429) break;
      } catch (err) {
        if (attempt === 2) throw new ApiError(0, 'red', 'Sin conexión con la cocina central');
      }
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error?.code ?? 'error', data.error?.message ?? 'Error', data.error?.details);
    return data;
  }

  #session(data) {
    this.token = data.token;
    store.set(TOKEN_KEY, data.token);
    return data.profile;
  }

  async init() {
    if (this.token) {
      try { return await this.#req('GET', '/me'); }
      catch (err) { if (err.status !== 401) throw err; }
    }
    return this.#session(await this.#req('POST', '/auth/guest'));
  }

  purchase(kind, id) {
    const key = `${kind}:${id}:${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    return this.#req('POST', '/shop/purchase', { kind, id }, { 'idempotency-key': key });
  }
  startRun(restaurantId, mode) { return this.#req('POST', '/runs', { restaurantId, mode }); }
  hireStaff(id) { return this.#req('POST', '/staff/hire', { id }); }
  buyDecor(id) { return this.#req('POST', '/decor/buy', { id }); }
  equipDecor(id) { return this.#req('POST', '/decor/equip', { id }); }
  // Reintenta el envío: el servidor es idempotente para la misma partida.
  completeRun(runId, serves, waste = {}, emergency = {}, firesOut = 0) { return this.#req('POST', `/runs/${runId}/complete`, { serves, waste, emergency, firesOut }); }
  market() { return this.#req('GET', '/market'); }
  marketBuy(items) {
    const key = `mercado:${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    return this.#req('POST', '/market/buy', { items }, { 'idempotency-key': key });
  }
  claimBasket() { return this.#req('POST', '/market/basket'); }
  history() { return this.#req('GET', '/me/runs'); }
  abandonRun(runId) { return this.#req('POST', `/runs/${runId}/abandon`).catch(() => null); }
  leaderboard(restaurantId) { return this.#req('GET', `/leaderboard/${restaurantId}`); }
  ledger() { return this.#req('GET', '/me/ledger?limit=40'); }
  async register(username, password) { return this.#session(await this.#req('POST', '/auth/register', { username, password })); }
  async login(username, password) { return this.#session(await this.#req('POST', '/auth/login', { username, password })); }
  async logout() { store.del(TOKEN_KEY); this.token = null; return this.init(); }
}

// ── Sin servidor: mismo motor, guardado en el dispositivo ────
class LocalApi {
  mode = 'local';
  data = null;
  runs = new Map();

  #load() {
    try {
      const raw = store.get(LOCAL_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // Partidas guardadas antes del mercado: se completan los campos nuevos.
        const base = newPlayerState();
        const legacy = !Array.isArray(data.state.achievements);
        data.state = { ...base, ...data.state, inventory: data.state.inventory ?? base.inventory };
        data.history ??= [];
        data.ledger ??= [];
        // Partidas guardadas antes de los logros: se reconstruyen los contadores con el diario.
        data.state.stats = { ...emptyStats(), ...data.state.stats };
        data.state.staff = { hired: null, owned: [], exp: {}, ...data.state.staff };
        data.state.decor = decorOf(data.state);
        // La arepera se agregó como primer local: quien ya jugaba la recibe gratis.
        if (!data.state.restaurants.includes(STARTER_RESTAURANT)) {
          data.state.restaurants = [STARTER_RESTAURANT, ...data.state.restaurants];
          for (const r of base.recipes) if (!data.state.recipes.includes(r)) data.state.recipes = [...data.state.recipes, r];
        }
        if (legacy) {
          for (const h of data.history) {
            data.state.stats.runs += 1;
            data.state.stats.served += h.served ?? 0;
            data.state.stats.vipServed += h.vipServed ?? 0;
            if (h.stars >= 3) data.state.stats.threeStars += 1;
          }
        }
        // Modo prueba: todo lo que se agregue al juego (locales, recetas, mejoras) queda abierto.
        if (SANDBOX) {
          const full = sandboxState();
          data.state.restaurants = full.restaurants;
          data.state.recipes = full.recipes;
          data.state.upgrades = { ...full.upgrades, ...data.state.upgrades, ...full.upgrades };
          data.state.xp = Math.max(data.state.xp ?? 0, full.xp);
          data.state.decor = { ...data.state.decor, owned: full.decor.owned };
        }
        // Un ayudante contratado antes de abrir su restaurante (versión anterior) deja de trabajar.
        data.state = sanitizeStaff(data.state);
        const decorRefund = retiredDecorRefund(data.state.decor);
        if (data.state.decor) data.state.decor = decorOf(data.state);
        if (decorRefund > 0 && !SANDBOX) {
          data.state.coins += decorRefund;
          data.ledger.unshift({ delta: decorRefund, reason: 'reembolso_decoracion', t: Date.now(), balanceAfter: data.state.coins });
        }
        for (const id of Object.keys(RETIRED_UPGRADES)) {
          const amount = retiredRefund(id, data.state.upgrades?.[id] ?? 0);
          if (data.state.upgrades) delete data.state.upgrades[id];
          if (amount > 0) {
            data.state.coins += amount;
            data.ledger.unshift({ delta: amount, reason: 'reembolso_mejora', t: Date.now(), balanceAfter: data.state.coins });
          }
        }
        return data;
      }
    } catch { /* datos corruptos: empezar de nuevo */ }
    if (SANDBOX) return { state: sandboxRefill(sandboxState(), 'cevicheria'), name: 'Chef de prueba', bests: {}, history: [], ledger: [] };
    const state = newPlayerState();
    return { state, name: 'Chef Invitado', bests: {}, history: [], ledger: [{ delta: state.coins, reason: 'bono_bienvenida', t: Date.now() }] };
  }
  #save() {
    // Monedas infinitas en el modo prueba: siempre vuelve a llenarse la caja.
    if (SANDBOX) this.data.state.coins = SANDBOX_COINS;
    store.set(LOCAL_KEY, JSON.stringify(this.data));
  }
  #log(delta, reason) {
    this.data.ledger.unshift({ delta, reason, t: Date.now(), balanceAfter: this.data.state.coins });
    this.data.ledger = this.data.ledger.slice(0, 60);
  }
  #profile() {
    const s = this.data.state;
    return {
      player: { id: 'local', displayName: this.data.name, registered: false },
      state: structuredClone(s),
      level: levelProgress(s.xp),
      empire: empireProgress(s),
      nextGoal: nextGoal(s),
      daily: dailyChallenge(todayUTC(), s)
    };
  }

  async init() { this.data = this.#load(); this.#save(); return this.#profile(); }

  async purchase(kind, id) {
    const d = evaluatePurchase(this.data.state, kind, id);
    if (!d.ok) throw new ApiError(409, d.reason, PURCHASE_MSG[d.reason] ?? 'Compra inválida', d);
    this.data.state = applyGrants(this.data.state, d.price, d.grants);
    this.#log(-d.price, `compra_${kind}`);
    this.#save();
    return { purchased: { kind, id, price: d.price }, profile: this.#profile() };
  }

  async buyDecor(id) {
    const d = evaluateDecorBuy(this.data.state, id);
    if (!d.ok) throw new ApiError(409, d.reason, PURCHASE_MSG[d.reason] ?? 'No se pudo comprar', d);
    this.data.state = applyDecorBuy(this.data.state, id, d.price);
    if (d.price > 0) this.#log(-d.price, 'decoracion');
    this.#save();
    return { profile: this.#profile() };
  }

  async equipDecor(id) {
    const d = evaluateDecorEquip(this.data.state, id);
    if (!d.ok) throw new ApiError(409, d.reason, PURCHASE_MSG[d.reason] ?? 'No se pudo poner', d);
    this.data.state = applyDecorEquip(this.data.state, id);
    this.#save();
    return { profile: this.#profile() };
  }

  async hireStaff(id) {
    const d = evaluateHire(this.data.state, id);
    if (!d.ok) throw new ApiError(409, d.reason, PURCHASE_MSG[d.reason] ?? 'No se pudo contratar', d);
    this.data.state = applyHire(this.data.state, id, d.price);
    if (d.price > 0) this.#log(-d.price, 'contrato');
    this.#save();
    return { profile: this.#profile() };
  }

  async startRun(restaurantId, mode) {
    if (SANDBOX) this.data.state = sandboxRefill(this.data.state, restaurantId);
    try {
      const config = buildRunConfig(this.data.state, { restaurantId, mode, randomSeed: crypto.randomUUID?.() ?? String(Math.random()), day: todayUTC() });
      const runId = `local-${Date.now()}`;
      this.runs.set(runId, { config, startedAt: Date.now() });
      return { runId, config, serverTime: Date.now() };
    } catch (err) {
      if (err instanceof RunStartError) throw new ApiError(400, err.reason, err.message);
      throw err;
    }
  }

  async completeRun(runId, serves, waste = {}, emergency = {}, firesOut = 0) {
    const run = this.runs.get(runId);
    if (!run) throw new ApiError(404, 'no_encontrado', 'Partida no encontrada');
    if (run.response) return run.response;
    let result;
    try { result = scoreRun(run.config, { serves, waste, emergency, firesOut }); }
    catch (err) {
      if (err instanceof RunValidationError) throw new ApiError(422, 'partida_rechazada', 'La partida no pasó la validación', { reason: err.reason });
      throw err;
    }
    this.data.state = applyInventory(this.data.state, inventoryDelta(result));
    const s = this.data.state;
    const levelBefore = levelFromXp(s.xp);
    // Pérdidas: se paga lo que alcance; la caja nunca queda en negativo.
    const delta = result.coins >= 0 ? result.coins : -Math.min(-result.coins, s.coins);
    s.coins += delta; s.xp += result.xp;
    if (delta !== 0) this.#log(delta, delta > 0 ? 'servicio' : 'perdida');
    let dailyBonus = 0;
    if (run.config.mode === 'daily') {
      const ch = dailyChallenge(run.config.day, s);
      if (!ch.claimed && result.stars >= ch.minStars && run.config.day === todayUTC()) {
        dailyBonus = ch.reward; s.coins += dailyBonus; s.dailyClaimed = run.config.day;
        this.#log(dailyBonus, 'reto_diario');
      }
    }
    s.stats = addRunToStats(s.stats, result);
    s.staff = addStaffExp(s.staff ?? { hired: null, exp: {} }, run.config.staff?.id);
    const unlocked = pendingAchievements(s);
    for (const x of unlocked) {
      s.coins += x.reward;
      s.achievements = [...s.achievements, x.id];
      this.#log(x.reward, 'logro');
    }
    const rid = run.config.restaurantId;
    this.data.bests[rid] = Math.max(this.data.bests[rid] ?? 0, result.score);
    this.data.history.unshift({
      id: runId, restaurantId: rid, mode: run.config.mode, finishedAt: Date.now(), stars: result.stars,
      gross: result.gross, upkeep: result.upkeep, salary: result.salary ?? 0, net: result.coins, emergencyCost: result.emergencyCost, served: result.served, totalOrders: result.totalOrders,
      ingredientCost: result.ingredientCost, vipServed: result.vipServed
    });
    this.data.history = this.data.history.slice(0, 30);
    this.#save();
    const profile = this.#profile();
    run.response = { result, rewards: { coins: result.coins, dailyBonus, xp: result.xp, achievements: unlocked.map(({ id, name, reward }) => ({ id, name, reward })) }, levelUp: profile.level.level > levelBefore ? profile.level.level : null, profile };
    return run.response;
  }

  async abandonRun(runId) { this.runs.delete(runId); return { abandoned: true }; }

  #market() {
    const s = this.data.state;
    const day = todayUTC();
    const prices = marketPrices(day, marketIngredients(s));
    return {
      day,
      items: marketIngredients(s).map((id) => ({ id, ...prices[id] })),
      inventory: { ...s.inventory },
      used: inventoryCount(s.inventory),
      capacity: storageCapacity(s.upgrades),
      bulk: { qty: BULK_QTY, discount: BULK_DISCOUNT },
      basket: dailyBasket(day, s)
    };
  }
  async market() { return this.#market(); }

  async marketBuy(items) {
    const d = evaluateMarketBuy(this.data.state, items, todayUTC());
    if (!d.ok) throw new ApiError(409, d.reason, PURCHASE_MSG[d.reason] ?? 'Compra inválida', d);
    this.data.state = applyInventory(this.data.state, d.delta, d.price);
    this.#log(-d.price, 'mercado');
    this.#save();
    return { spent: d.price, profile: this.#profile(), market: this.#market() };
  }

  async claimBasket() {
    const b = dailyBasket(todayUTC(), this.data.state);
    if (b.claimed) throw new ApiError(409, 'ya_reclamada', 'Ya recogiste la canasta de hoy');
    if (Object.keys(b.items).length === 0) throw new ApiError(409, 'despensa_llena', 'No cabe nada más en tu despensa');
    this.data.state = applyInventory(this.data.state, b.items);
    this.data.state.basketClaimed = b.day;
    this.#save();
    return { items: b.items, profile: this.#profile(), market: this.#market() };
  }

  async history() { return { entries: this.data.history }; }

  async leaderboard(restaurantId) {
    const best = this.data.bests[restaurantId];
    return { restaurantId, local: true, entries: best ? [{ rank: 1, name: this.data.name, score: best, me: true }] : [] };
  }

  async ledger() {
    return { entries: this.data.ledger.map((e, i) => ({ id: i, delta: e.delta, reason: e.reason, createdAt: e.t })) };
  }

  async reset() { store.del(LOCAL_KEY); return this.init(); }
}

const PURCHASE_MSG = {
  no_existe: 'Ese artículo no existe', ya_comprado: 'Ya lo tienes', nivel_insuficiente: 'Necesitas más nivel de chef',
  sin_dinero: 'No tienes suficientes monedas', restaurante_cerrado: 'Primero abre ese restaurante', nivel_maximo: 'Ya está al nivel máximo',
  despensa_llena: 'No cabe en tu despensa: mejora el refrigerador', recetas_pendientes: 'Primero aprende todas las recetas del restaurante anterior', logro_pendiente: 'Se gana con un logro', no_comprado: 'Primero cómpralo', personal_bloqueado: 'Este ayudante se desbloquea con un restaurante más avanzado', carrito_vacio: 'El carrito está vacío',
  no_disponible: 'Ese ingrediente no se vende para tus recetas', cantidad_invalida: 'Cantidad inválida'
};
