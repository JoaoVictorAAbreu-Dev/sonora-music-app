import { inject } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';

export function testConfig(overrides: Record<string, string> = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: inject('databaseUrl'),
    CORS_ORIGINS: 'https://app.example.test',
    APP_VERSION: 'test',
    ...overrides,
  });
}

export async function setupApp(overrides: Record<string, string> = {}) {
  const config = testConfig(overrides);
  const { db, pool } = createDb(config.DATABASE_URL);
  await runMigrations(db);
  const app = await buildApp(config, db);
  return {
    app,
    db,
    pool,
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
}
