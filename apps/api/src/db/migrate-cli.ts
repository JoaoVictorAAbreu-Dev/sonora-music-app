import { loadConfig } from '../config';
import { createDb } from './client';
import { runMigrations } from './migrate';

const config = loadConfig();
const { db, pool } = createDb(config.DATABASE_URL);
try {
  await runMigrations(db);
  console.log('migrations applied');
} finally {
  await pool.end();
}
