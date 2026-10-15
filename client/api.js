// Capa de datos. Con servidor usa la API REST; sin servidor (p. ej. abriendo
// el cliente como página estática) usa el mismo motor de /shared en el navegador.

import {
  newPlayerState, evaluatePurchase, applyGrants, empireProgress, nextGoal, levelFromXp, levelProgress,
  dailyChallenge, todayUTC, buildRunConfig, RunStartError, scoreRun, RunValidationError
} from './shared/index.js';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}

const TOKEN_KEY = 'afuego.token';
const LOCAL_KEY = 'afuego.local.v1';

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
  // Reintenta el envío: el servidor es idempotente para la misma partida.
  completeRun(runId, serves) { return this.#req('POST', `/runs/${runId}/complete`, { serves }); }
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
      if (raw) return JSON.parse(raw);
    } catch { /* datos corruptos: empezar de nuevo */ }
    return { state: newPlayerState(), name: 'Chef Invitado', bests: {}, ledger: [{ delta: 150, reason: 'bono_bienvenida', t: Date.now() }] };
  }
  #save() { store.set(LOCAL_KEY, JSON.stringify(this.data)); }
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

  async startRun(restaurantId, mode) {
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

  async completeRun(runId, serves) {
    const run = this.runs.get(runId);
    if (!run) throw new ApiError(404, 'no_encontrado', 'Partida no encontrada');
    if (run.response) return run.response;
    let result;
    try { result = scoreRun(run.config, { serves }); }
    catch (err) {
      if (err instanceof RunValidationError) throw new ApiError(422, 'partida_rechazada', 'La partida no pasó la validación', { reason: err.reason });
      throw err;
    }
    const s = this.data.state;
    const levelBefore = levelFromXp(s.xp);
    s.coins += result.coins; s.xp += result.xp;
    this.#log(result.coins, 'servicio');
    let dailyBonus = 0;
    if (run.config.mode === 'daily') {
      const ch = dailyChallenge(run.config.day, s);
      if (!ch.claimed && result.stars >= ch.minStars && run.config.day === todayUTC()) {
        dailyBonus = ch.reward; s.coins += dailyBonus; s.dailyClaimed = run.config.day;
        this.#log(dailyBonus, 'reto_diario');
      }
    }
    const rid = run.config.restaurantId;
    this.data.bests[rid] = Math.max(this.data.bests[rid] ?? 0, result.score);
    this.#save();
    const profile = this.#profile();
    run.response = { result, rewards: { coins: result.coins, dailyBonus, xp: result.xp }, levelUp: profile.level.level > levelBefore ? profile.level.level : null, profile };
    return run.response;
  }

  async abandonRun(runId) { this.runs.delete(runId); return { abandoned: true }; }

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
  sin_dinero: 'No tienes suficientes monedas', restaurante_cerrado: 'Primero abre ese restaurante', nivel_maximo: 'Ya está al nivel máximo'
};
