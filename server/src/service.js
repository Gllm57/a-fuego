// Lógica de aplicación: une las reglas puras de /shared con la base de datos.
// Toda operación que mueve dinero ocurre dentro de una transacción.

import { randomUUID } from 'node:crypto';
import {
  RESTAURANT_BY_ID, RESTAURANTS,
  newPlayerState, evaluatePurchase, empireProgress, nextGoal, levelFromXp, levelProgress,
  dailyChallenge, todayUTC, buildRunConfig, RunStartError, scoreRun, RunValidationError
} from '../../shared/index.js';
import { AppError, badRequest, conflict, forbidden, notFound, unauthorized } from './errors.js';
import { hashPassword, verifyPassword, signToken } from './auth.js';

const PURCHASE_ERRORS = {
  no_existe: [404, 'Ese artículo no existe'],
  ya_comprado: [409, 'Ya lo tienes'],
  nivel_insuficiente: [403, 'Necesitas más nivel de chef'],
  sin_dinero: [409, 'No tienes suficientes monedas'],
  restaurante_cerrado: [403, 'Primero abre ese restaurante'],
  nivel_maximo: [409, 'Ya está al nivel máximo'],
  tipo_invalido: [400, 'Tipo de compra inválido']
};

const GUEST_NAMES = ['Chef Pimienta', 'Chef Canela', 'Chef Albahaca', 'Chef Azafrán', 'Chef Comino', 'Chef Romero', 'Chef Vainilla', 'Chef Paprika'];

export class GameService {
  constructor({ db, config, now = () => Date.now() }) {
    this.db = db;
    this.config = config;
    this.now = now;
  }

  // ── Cuentas ───────────────────────────────────────────────
  createGuest() {
    const id = randomUUID();
    const t = this.now();
    const start = newPlayerState();
    const name = `${GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)]} ${Math.floor(1000 + Math.random() * 9000)}`;
    this.db.tx(() => {
      this.db.run('INSERT INTO players (id, display_name, coins, xp, created_at, updated_at) VALUES (?, ?, 0, 0, ?, ?)', id, name, t, t);
      this.#credit(id, start.coins, 'bono_bienvenida', null);
      for (const r of start.restaurants) this.#grant(id, 'restaurant', r, 1);
      for (const r of start.recipes) this.#grant(id, 'recipe', r, 1);
    });
    return { token: this.issueToken(id), profile: this.profile(id) };
  }

  async register(playerId, username, password, displayName) {
    const player = this.#player(playerId);
    if (player.username) throw conflict('ya_registrado', 'Esta cuenta ya tiene usuario');
    const hash = await hashPassword(password);
    try {
      this.db.tx(() => {
        this.db.run(
          'UPDATE players SET username = ?, password_hash = ?, display_name = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?',
          username, hash, displayName ?? username, this.now(), playerId
        );
      });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) throw conflict('usuario_ocupado', 'Ese nombre de usuario ya existe');
      throw err;
    }
    return { token: this.issueToken(playerId), profile: this.profile(playerId) };
  }

  async login(username, password) {
    const row = this.db.get('SELECT id, password_hash, banned FROM players WHERE username = ?', username);
    // Se verifica igualmente un hash ficticio para no filtrar qué usuarios existen por tiempo de respuesta.
    const ok = await verifyPassword(password, row?.password_hash ?? 'scrypt$00$00');
    if (!row || !ok) throw new AppError(401, 'credenciales', 'Usuario o contraseña incorrectos');
    if (row.banned) throw forbidden('cuenta_bloqueada', 'Cuenta bloqueada');
    return { token: this.issueToken(row.id), profile: this.profile(row.id) };
  }

  issueToken(playerId) {
    const { token_version } = this.#player(playerId);
    const exp = Math.floor(this.now() / 1000) + this.config.tokenTtlSec;
    return signToken(this.config.authSecret, { sub: playerId, ver: token_version, exp });
  }

  // Comprueba que el token sigue vigente (no revocado ni cuenta bloqueada).
  authenticate(payload) {
    const row = this.db.get('SELECT token_version, banned FROM players WHERE id = ?', payload.sub);
    if (!row || row.token_version !== payload.ver) throw unauthorized();
    if (row.banned) throw forbidden('cuenta_bloqueada', 'Cuenta bloqueada por actividad sospechosa');
    return payload.sub;
  }

  // ── Estado ────────────────────────────────────────────────
  state(playerId) {
    const p = this.#player(playerId);
    const unlocks = this.db.all('SELECT kind, item_id, level FROM unlocks WHERE player_id = ?', playerId);
    const order = new Map(RESTAURANTS.map((r, i) => [r.id, i]));
    return {
      coins: p.coins,
      xp: p.xp,
      restaurants: unlocks.filter((u) => u.kind === 'restaurant').map((u) => u.item_id).sort((a, b) => order.get(a) - order.get(b)),
      recipes: unlocks.filter((u) => u.kind === 'recipe').map((u) => u.item_id),
      upgrades: Object.fromEntries(unlocks.filter((u) => u.kind === 'upgrade').map((u) => [u.item_id, u.level])),
      dailyClaimed: p.daily_claimed
    };
  }

  profile(playerId) {
    const p = this.#player(playerId);
    const state = this.state(playerId);
    return {
      player: { id: p.id, displayName: p.display_name, registered: Boolean(p.username) },
      state,
      level: levelProgress(state.xp),
      empire: empireProgress(state),
      nextGoal: nextGoal(state),
      daily: dailyChallenge(todayUTC(new Date(this.now())), state)
    };
  }

  ledger(playerId, limit = 50) {
    return this.db.all(
      'SELECT id, delta, balance_after AS balanceAfter, reason, ref, created_at AS createdAt FROM ledger WHERE player_id = ? ORDER BY id DESC LIMIT ?',
      playerId, limit
    );
  }

  // ── Tienda ────────────────────────────────────────────────
  purchase(playerId, kind, itemId, idempotencyKey) {
    return this.db.tx(() => {
      if (idempotencyKey) {
        const prev = this.db.get('SELECT response FROM idempotency WHERE player_id = ? AND key = ?', playerId, idempotencyKey);
        if (prev) return JSON.parse(prev.response);
      }
      const state = this.state(playerId);
      const decision = evaluatePurchase(state, kind, itemId);
      if (!decision.ok) {
        const [status, msg] = PURCHASE_ERRORS[decision.reason] ?? [400, 'Compra inválida'];
        throw new AppError(status, decision.reason, msg, { price: decision.price, reqLevel: decision.reqLevel });
      }
      if (decision.price > 0) this.#debit(playerId, decision.price, `compra_${kind}`, itemId);
      for (const g of decision.grants) this.#grant(playerId, g.kind, g.id, g.level ?? 1);
      const response = { purchased: { kind, id: itemId, price: decision.price }, profile: this.profile(playerId) };
      if (idempotencyKey) {
        this.db.run('INSERT INTO idempotency (player_id, key, response, created_at) VALUES (?, ?, ?, ?)', playerId, idempotencyKey, JSON.stringify(response), this.now());
      }
      return response;
    });
  }

  // ── Partidas ──────────────────────────────────────────────
  startRun(playerId, { restaurantId, mode = 'normal' }) {
    return this.db.tx(() => {
      const state = this.state(playerId);
      const now = this.now();
      let config;
      try {
        config = buildRunConfig(state, { restaurantId, mode, randomSeed: randomUUID(), day: todayUTC(new Date(now)) });
      } catch (err) {
        if (err instanceof RunStartError) throw badRequest(err.reason, err.message);
        throw err;
      }
      // Sólo una partida activa por jugador.
      this.db.run("UPDATE runs SET status = 'abandoned', finished_at = ? WHERE player_id = ? AND status = 'active'", now, playerId);
      const id = randomUUID();
      this.db.run(
        "INSERT INTO runs (id, player_id, restaurant_id, mode, config_json, status, started_at) VALUES (?, ?, ?, ?, ?, 'active', ?)",
        id, playerId, config.restaurantId, config.mode, JSON.stringify(config), now
      );
      return { runId: id, config, serverTime: now };
    });
  }

  completeRun(playerId, runId, submission) {
    const outcome = this.db.tx(() => {
      const run = this.db.get('SELECT * FROM runs WHERE id = ? AND player_id = ?', runId, playerId);
      if (!run) throw notFound('Partida no encontrada');
      if (run.status === 'completed') return { replay: true, response: JSON.parse(run.result_json) };
      if (run.status !== 'active') throw conflict('partida_cerrada', `La partida está ${run.status}`);

      const config = JSON.parse(run.config_json);
      const now = this.now();
      const elapsed = now - run.started_at;
      if (elapsed > config.durationMs + this.config.runExpiryMs) {
        this.db.run("UPDATE runs SET status = 'expired', finished_at = ? WHERE id = ?", now, runId);
        return { error: conflict('partida_caducada', 'La partida caducó') };
      }

      let result;
      try {
        const maxServed = submission.serves.reduce((m, s) => Math.max(m, Number(s.servedAt) || 0), 0);
        // El cliente no puede declarar platos servidos "en el futuro" del reloj del servidor.
        if (maxServed > elapsed + this.config.runClockSkewMs) throw new RunValidationError('reloj', { maxServed, elapsed });
        result = scoreRun(config, submission);
      } catch (err) {
        if (!(err instanceof RunValidationError)) throw err;
        this.db.run("UPDATE runs SET status = 'rejected', finished_at = ?, reject_reason = ? WHERE id = ?", now, err.reason, runId);
        const p = this.db.get('UPDATE players SET cheat_strikes = cheat_strikes + 1, updated_at = ? WHERE id = ? RETURNING cheat_strikes', now, playerId);
        if (p.cheat_strikes >= this.config.maxCheatStrikes) this.db.run('UPDATE players SET banned = 1 WHERE id = ?', playerId);
        return { error: new AppError(422, 'partida_rechazada', 'La partida no pasó la validación', { reason: err.reason }) };
      }

      const before = this.state(playerId);
      const levelBefore = levelFromXp(before.xp);
      if (result.coins > 0) this.#credit(playerId, result.coins, 'servicio', runId);
      this.db.run('UPDATE players SET xp = xp + ?, updated_at = ? WHERE id = ?', result.xp, now, playerId);

      let dailyBonus = 0;
      if (config.mode === 'daily' && config.day === todayUTC(new Date(now))) {
        const challenge = dailyChallenge(config.day, before);
        if (!challenge.claimed && result.stars >= challenge.minStars) {
          dailyBonus = challenge.reward;
          this.#credit(playerId, dailyBonus, 'reto_diario', config.day);
          this.db.run('UPDATE players SET daily_claimed = ? WHERE id = ?', config.day, playerId);
        }
      }

      const after = this.profile(playerId);
      const response = {
        result,
        rewards: { coins: result.coins, dailyBonus, xp: result.xp },
        levelUp: after.level.level > levelBefore ? after.level.level : null,
        profile: after
      };
      this.db.run(
        "UPDATE runs SET status = 'completed', finished_at = ?, score = ?, stars = ?, coins = ?, xp = ?, result_json = ? WHERE id = ?",
        now, result.score, result.stars, result.coins + dailyBonus, result.xp, JSON.stringify(response), runId
      );
      return { response };
    });
    if (outcome.error) throw outcome.error;
    return outcome.response;
  }

  abandonRun(playerId, runId) {
    const r = this.db.run("UPDATE runs SET status = 'abandoned', finished_at = ? WHERE id = ? AND player_id = ? AND status = 'active'", this.now(), runId, playerId);
    return { abandoned: r.changes > 0 };
  }

  // ── Ranking semanal ───────────────────────────────────────
  leaderboard(restaurantId, playerId) {
    if (!RESTAURANT_BY_ID[restaurantId]) throw notFound('Restaurante desconocido');
    const since = weekStart(this.now());
    const rows = this.db.all(
      `SELECT p.id, p.display_name AS name, MAX(r.score) AS score
         FROM runs r JOIN players p ON p.id = r.player_id
        WHERE r.restaurant_id = ? AND r.status = 'completed' AND r.finished_at >= ? AND p.banned = 0
        GROUP BY r.player_id
        ORDER BY score DESC, MIN(r.finished_at) ASC
        LIMIT 20`,
      restaurantId, since
    );
    return {
      restaurantId,
      weekStart: since,
      entries: rows.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, me: r.id === playerId }))
    };
  }

  // ── Internos ──────────────────────────────────────────────
  #player(id) {
    const p = this.db.get('SELECT * FROM players WHERE id = ?', id);
    if (!p) throw unauthorized();
    return p;
  }

  #credit(playerId, amount, reason, ref) {
    this.#move(playerId, Math.abs(amount), reason, ref);
  }

  #debit(playerId, amount, reason, ref) {
    this.#move(playerId, -Math.abs(amount), reason, ref);
  }

  #move(playerId, delta, reason, ref) {
    if (!Number.isSafeInteger(delta)) throw new Error('Monto inválido');
    const row = this.db.get('UPDATE players SET coins = coins + ?, updated_at = ? WHERE id = ? AND coins + ? >= 0 RETURNING coins', delta, this.now(), playerId, delta);
    if (!row) throw conflict('sin_dinero', 'No tienes suficientes monedas');
    this.db.run('INSERT INTO ledger (player_id, delta, balance_after, reason, ref, created_at) VALUES (?, ?, ?, ?, ?, ?)', playerId, delta, row.coins, reason, ref, this.now());
  }

  #grant(playerId, kind, itemId, level) {
    this.db.run(
      `INSERT INTO unlocks (player_id, kind, item_id, level, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (player_id, kind, item_id) DO UPDATE SET level = MAX(level, excluded.level)`,
      playerId, kind, itemId, level, this.now()
    );
  }
}

export function weekStart(ms) {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7; // lunes = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}
