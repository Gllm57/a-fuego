import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { openDatabase } from './db.js';
import { GameService } from './service.js';
import { AppError } from './errors.js';
import api from './routes/api.js';

export async function buildApp(config, { now } = {}) {
  const app = Fastify({
    logger: { level: config.logLevel, redact: ['req.headers.authorization'] },
    trustProxy: true,
    bodyLimit: 64 * 1024,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: 'array', useDefaults: true } }
  });

  const db = openDatabase(config.dbPath);
  const service = new GameService({ db, config, now });
  app.decorate('service', service);
  app.addHook('onClose', async () => db.close());

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"]
      }
    }
  });
  await app.register(rateLimit, { global: true, max: config.rateLimitPerMin, timeWindow: '1 minute' });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.status).send({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err.validation) {
      return reply.code(400).send({ error: { code: 'validacion', message: 'Petición inválida', details: err.validation.map((v) => `${v.instancePath} ${v.message}`) } });
    }
    if (err.statusCode === 429) {
      return reply.code(429).send({ error: { code: 'demasiadas_peticiones', message: 'Demasiadas peticiones, espera un momento' } });
    }
    req.log.error({ err }, 'error no controlado');
    return reply.code(500).send({ error: { code: 'interno', message: 'Error interno' } });
  });

  app.get('/health', { config: { rateLimit: false } }, async () => {
    db.get('SELECT 1');
    return { ok: true };
  });

  await app.register(api, { prefix: '/api/v1', service, config });

  await app.register(fastifyStatic, { root: config.sharedDir, prefix: '/shared/', decorateReply: false });
  await app.register(fastifyStatic, { root: config.clientDir, prefix: '/' });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: { code: 'no_encontrado', message: 'Ruta no encontrada' } });
  });

  return app;
}
