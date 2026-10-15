import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`${name} debe ser un entero`);
  return n;
}

export function loadConfig(overrides = {}) {
  const env = process.env.NODE_ENV ?? 'development';
  let secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (env === 'production') throw new Error('AUTH_SECRET es obligatorio en producción');
    secret = randomBytes(32).toString('hex');
  }
  if (secret.length < 32) throw new Error('AUTH_SECRET debe tener al menos 32 caracteres');
  return {
    env,
    host: process.env.HOST ?? '0.0.0.0',
    port: int('PORT', 3000),
    dbPath: process.env.DB_PATH ?? path.join(root, 'data', 'a-fuego.db'),
    authSecret: secret,
    tokenTtlSec: int('TOKEN_TTL_SEC', 60 * 60 * 24 * 30),
    rateLimitPerMin: int('RATE_LIMIT_PER_MIN', 120),
    // Margen para la latencia de red al enviar el resultado de una partida.
    runClockSkewMs: int('RUN_CLOCK_SKEW_MS', 2000),
    // Una partida no enviada en este tiempo caduca.
    runExpiryMs: int('RUN_EXPIRY_MS', 15 * 60 * 1000),
    // Tras este número de partidas rechazadas, la cuenta queda bloqueada para revisión.
    maxCheatStrikes: int('MAX_CHEAT_STRIKES', 5),
    clientDir: path.join(root, 'client'),
    sharedDir: path.join(root, 'shared'),
    logLevel: process.env.LOG_LEVEL ?? (env === 'test' ? 'silent' : 'info'),
    ...overrides
  };
}
