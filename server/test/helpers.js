import { loadConfig } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { ordersForConfig, minPrepMs } from '../../shared/index.js';

export async function makeApp(overrides = {}) {
  const clock = { t: Date.UTC(2026, 9, 15, 12, 0, 0) };
  const config = loadConfig({ dbPath: ':memory:', logLevel: 'silent', authSecret: 'x'.repeat(40), ...overrides });
  const app = await buildApp(config, { now: () => clock.t });
  const call = async (method, url, { token, body, headers = {} } = {}) => {
    const res = await app.inject({
      method, url, payload: body,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }
    });
    return { status: res.statusCode, body: res.json() };
  };
  return { app, clock, call };
}

// Un jugador honesto: atiende a los clientes en orden de llegada, con un ritmo humano.
export function honestServes(config, { pace = 2500 } = {}) {
  const serves = [];
  let last = 0;
  for (const o of ordersForConfig(config)) {
    const t = Math.max(o.arriveAt + minPrepMs(config.stats, o.recipeId) + 2000, last + pace);
    if (t > o.arriveAt + o.patienceMs || t > config.durationMs) continue;
    serves.push({ orderId: o.id, recipeId: o.recipeId, servedAt: t, perfects: 1 });
    last = t;
  }
  return serves;
}
