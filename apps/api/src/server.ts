import { buildApp } from './app';
import { loadConfig } from './config';
import { pruneCatalogCache } from './catalog/cache';
import { createDb } from './db/client';

const config = loadConfig();
const { db, pool } = createDb(config.DATABASE_URL);
const app = await buildApp(config, db);

// Drop week-old catalog cache entries now and then (one process per VM).
const prune = () =>
  pruneCatalogCache(db)
    .then((n) => n && app.log.info({ removed: n }, 'catalog cache pruned'))
    .catch((err: unknown) => app.log.warn({ err }, 'catalog cache prune failed'));
void prune();
setInterval(() => void prune(), 6 * 3600_000).unref();

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: config.HOST, port: config.PORT });
