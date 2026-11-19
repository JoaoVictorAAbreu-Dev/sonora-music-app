import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Db } from './client';

/** Resolves ./drizzle both from sources (src/db) and from the bundle (dist). */
export function migrationsFolder(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return here.endsWith(path.join('src', 'db'))
    ? path.resolve(here, '../../drizzle')
    : path.resolve(here, '../drizzle');
}

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: migrationsFolder() });
}
