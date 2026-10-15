import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const config = loadConfig();
const app = await buildApp(config);

const shutdown = async (signal) => {
  app.log.info({ signal }, 'cerrando servidor');
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, 'error al cerrar');
    process.exit(1);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error({ err }, 'no se pudo iniciar');
  process.exit(1);
}
