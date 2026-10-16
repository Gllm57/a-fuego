// API v1. Cada ruta declara su esquema: Fastify rechaza cualquier cuerpo que no encaje.

import { RESTAURANTS, RECIPES, UPGRADES, INGREDIENTS, PROCESSES, STATIONS } from '../../../shared/index.js';
import { verifyToken } from '../auth.js';
import { unauthorized } from '../errors.js';

const id = { type: 'string', minLength: 1, maxLength: 64, pattern: '^[a-z0-9_\\-]+$' };
const uuid = { type: 'string', format: 'uuid' };
const username = { type: 'string', minLength: 3, maxLength: 24, pattern: '^[A-Za-z0-9_.\\-]+$' };
const password = { type: 'string', minLength: 8, maxLength: 128 };

export default async function api(app, { service, config }) {
  // Autenticación: Authorization: Bearer <token>
  app.decorateRequest('playerId', null);
  const auth = async (req) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token && verifyToken(config.authSecret, token);
    if (!payload) throw unauthorized();
    req.playerId = service.authenticate(payload);
  };

  app.get('/catalog', {
    schema: { tags: ['catálogo'] }
  }, async (req, reply) => {
    reply.header('cache-control', 'public, max-age=300');
    return { restaurants: RESTAURANTS, recipes: RECIPES, upgrades: UPGRADES, ingredients: INGREDIENTS, processes: PROCESSES, stations: STATIONS };
  });

  app.post('/auth/guest', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async () => service.createGuest());

  app.post('/auth/register', {
    preHandler: auth,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object', additionalProperties: false, required: ['username', 'password'],
        properties: { username, password, displayName: { type: 'string', minLength: 2, maxLength: 24 } }
      }
    }
  }, async (req) => service.register(req.playerId, req.body.username, req.body.password, req.body.displayName));

  app.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: { type: 'object', additionalProperties: false, required: ['username', 'password'], properties: { username, password } }
    }
  }, async (req) => service.login(req.body.username, req.body.password));

  app.get('/me', { preHandler: auth }, async (req) => service.profile(req.playerId));

  app.get('/me/ledger', {
    preHandler: auth,
    schema: { querystring: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 } } } }
  }, async (req) => ({ entries: service.ledger(req.playerId, req.query.limit) }));

  app.post('/shop/purchase', {
    preHandler: auth,
    schema: {
      headers: { type: 'object', properties: { 'idempotency-key': { type: 'string', minLength: 8, maxLength: 80 } } },
      body: {
        type: 'object', additionalProperties: false, required: ['kind', 'id'],
        properties: { kind: { type: 'string', enum: ['restaurant', 'recipe', 'upgrade'] }, id }
      }
    }
  }, async (req) => service.purchase(req.playerId, req.body.kind, req.body.id, req.headers['idempotency-key']));

  app.get('/me/runs', { preHandler: auth }, async (req) => ({ entries: service.history(req.playerId) }));

  app.get('/market', { preHandler: auth }, async (req) => service.market(req.playerId));

  app.post('/market/buy', {
    preHandler: auth,
    schema: {
      headers: { type: 'object', properties: { 'idempotency-key': { type: 'string', minLength: 8, maxLength: 80 } } },
      body: {
        type: 'object', additionalProperties: false, required: ['items'],
        properties: {
          items: {
            type: 'object', minProperties: 1, maxProperties: 40,
            propertyNames: { pattern: '^[a-z_]{2,20}$' },
            additionalProperties: { type: 'integer', minimum: 1, maximum: 99 }
          }
        }
      }
    }
  }, async (req) => service.marketBuy(req.playerId, req.body.items, req.headers['idempotency-key']));

  app.post('/market/basket', { preHandler: auth }, async (req) => service.claimBasket(req.playerId));

  app.post('/runs', {
    preHandler: auth,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object', additionalProperties: false,
        properties: { restaurantId: id, mode: { type: 'string', enum: ['normal', 'daily'], default: 'normal' } }
      }
    }
  }, async (req, reply) => {
    reply.code(201);
    return service.startRun(req.playerId, req.body);
  });

  app.post('/runs/:runId/complete', {
    preHandler: auth,
    schema: {
      params: { type: 'object', required: ['runId'], properties: { runId: uuid } },
      body: {
        type: 'object', additionalProperties: false, required: ['serves'],
        properties: {
          serves: {
            type: 'array', maxItems: 100,
            items: {
              type: 'object', additionalProperties: false, required: ['orderId', 'recipeId', 'servedAt'],
              properties: {
                orderId: { type: 'integer', minimum: 0, maximum: 1000 },
                recipeId: id,
                servedAt: { type: 'integer', minimum: 0, maximum: 3_600_000 },
                perfects: { type: 'integer', minimum: 0, maximum: 10, default: 0 }
              }
            }
          },
          emergency: {
            type: 'object', maxProperties: 40,
            propertyNames: { pattern: '^[a-z_]{2,20}$' },
            additionalProperties: { type: 'integer', minimum: 0, maximum: 99 }
          },
          waste: {
            type: 'object', maxProperties: 40,
            propertyNames: { pattern: '^[a-z_]{2,20}$' },
            additionalProperties: { type: 'integer', minimum: 0, maximum: 999 }
          },
          firesOut: { type: 'integer', minimum: 0, maximum: 20 }
        }
      }
    }
  }, async (req) => service.completeRun(req.playerId, req.params.runId, req.body));

  app.post('/runs/:runId/abandon', {
    preHandler: auth,
    schema: { params: { type: 'object', required: ['runId'], properties: { runId: uuid } } }
  }, async (req) => service.abandonRun(req.playerId, req.params.runId));

  app.get('/leaderboard/:restaurantId', {
    preHandler: auth,
    schema: { params: { type: 'object', required: ['restaurantId'], properties: { restaurantId: id } } }
  }, async (req) => service.leaderboard(req.params.restaurantId, req.playerId));
}
