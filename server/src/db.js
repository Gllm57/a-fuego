// Acceso a SQLite (módulo node:sqlite). WAL + transacciones IMMEDIATE para que
// cada operación de dinero sea atómica y serializada.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS = [
  // 1: esquema inicial
  `
  CREATE TABLE players (
    id             TEXT PRIMARY KEY,
    username       TEXT UNIQUE COLLATE NOCASE,
    password_hash  TEXT,
    display_name   TEXT NOT NULL,
    coins          INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
    xp             INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    token_version  INTEGER NOT NULL DEFAULT 0,
    cheat_strikes  INTEGER NOT NULL DEFAULT 0,
    banned         INTEGER NOT NULL DEFAULT 0,
    daily_claimed  TEXT,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL
  );

  CREATE TABLE unlocks (
    player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('restaurant','recipe','upgrade')),
    item_id    TEXT NOT NULL,
    level      INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (player_id, kind, item_id)
  );

  -- Libro contable inmutable: cada moneda que entra o sale queda registrada.
  CREATE TABLE ledger (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    delta         INTEGER NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    reason        TEXT NOT NULL,
    ref           TEXT,
    created_at    INTEGER NOT NULL
  );
  CREATE INDEX ledger_player ON ledger(player_id, id);

  CREATE TABLE runs (
    id            TEXT PRIMARY KEY,
    player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    restaurant_id TEXT NOT NULL,
    mode          TEXT NOT NULL,
    config_json   TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('active','completed','rejected','expired','abandoned')),
    started_at    INTEGER NOT NULL,
    finished_at   INTEGER,
    score         INTEGER,
    stars         INTEGER,
    coins         INTEGER,
    xp            INTEGER,
    result_json   TEXT,
    reject_reason TEXT
  );
  CREATE INDEX runs_player ON runs(player_id, started_at);
  CREATE INDEX runs_board ON runs(restaurant_id, status, finished_at, score);

  CREATE TABLE idempotency (
    player_id  TEXT NOT NULL,
    key        TEXT NOT NULL,
    response   TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (player_id, key)
  );
  `,
  // 2: despensa (inventario de ingredientes) y canasta diaria
  `
  CREATE TABLE inventory (
    player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    ingredient_id TEXT NOT NULL,
    qty           INTEGER NOT NULL CHECK (qty >= 0),
    PRIMARY KEY (player_id, ingredient_id)
  );
  ALTER TABLE players ADD COLUMN basket_claimed TEXT;
  `,
  // 3: contadores de juego y logros cobrados ({ stats, achievements })
  `
  ALTER TABLE players ADD COLUMN progress_json TEXT NOT NULL DEFAULT '{}';
  `
];

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;');
  migrate(db);
  return wrap(db);
}

function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = db.prepare('SELECT version FROM schema_version').get();
  let version = row ? row.version : 0;
  if (!row) db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  for (; version < MIGRATIONS.length; version++) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(MIGRATIONS[version]);
      db.prepare('UPDATE schema_version SET version = ?').run(version + 1);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

function wrap(db) {
  const cache = new Map();
  const stmt = (sql) => {
    let s = cache.get(sql);
    if (!s) { s = db.prepare(sql); cache.set(sql, s); }
    return s;
  };
  let depth = 0;
  return {
    raw: db,
    get: (sql, ...p) => stmt(sql).get(...p),
    all: (sql, ...p) => stmt(sql).all(...p),
    run: (sql, ...p) => stmt(sql).run(...p),
    // Transacción síncrona: o se aplica todo o nada.
    tx(fn) {
      if (depth > 0) return fn();
      db.exec('BEGIN IMMEDIATE');
      depth++;
      try {
        const out = fn();
        db.exec('COMMIT');
        return out;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      } finally {
        depth--;
      }
    },
    close: () => db.close()
  };
}
