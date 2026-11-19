import { inject } from 'vitest';
import { buildApp, type BuildOptions } from '../src/app';
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
    // Test-only value, not a real secret.
    JWT_SECRET: 'test-secret-test-secret-test-secret-0123',
    ...overrides,
  });
}

export async function setupApp(overrides: Record<string, string> = {}, options: BuildOptions = {}) {
  const config = testConfig(overrides);
  const { db, pool } = createDb(config.DATABASE_URL);
  await runMigrations(db);
  const app = await buildApp(config, db, options);
  return {
    app,
    db,
    pool,
    config,
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
}

let counter = 0;
/** A unique email per call so tests never collide on the shared database. */
export function uniqueEmail(prefix = 'user'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

export const goodPassword = 'violet-harbor-lantern-42';
