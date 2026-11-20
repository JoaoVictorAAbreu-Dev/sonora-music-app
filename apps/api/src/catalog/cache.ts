import { createHash } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db } from '../db/client';
import { trackCache } from '../db/schema';
import { AppError } from '../errors';

/** Freshness per kind of cached Jamendo response. */
export const cacheTtlMs = {
  track: 24 * 3600_000,
  album: 24 * 3600_000,
  artist: 24 * 3600_000,
  stream: 3600_000,
  search: 10 * 60_000,
  home: 30 * 60_000,
} as const;
export type CacheKind = keyof typeof cacheTtlMs;

/** Entries older than this are deleted by `pruneCatalogCache` (stale copies help during outages). */
export const CACHE_MAX_AGE_MS = 7 * 24 * 3600_000;

/** Stable cache key; variable inputs (like search queries) are hashed. */
export function cacheKey(kind: CacheKind, input: string | Record<string, unknown>): string {
  const raw = typeof input === 'string' ? input : JSON.stringify(input, Object.keys(input).sort());
  return typeof input === 'string' && /^[\w-]{1,40}$/.test(raw)
    ? `${kind}:${raw}`
    : `${kind}:${createHash('sha256').update(raw).digest('hex').slice(0, 32)}`;
}

/**
 * Read-through cache over `track_cache`: fresh hit → cached payload; miss or stale → load and
 * store. If the upstream is unavailable and a stale copy exists, the stale copy is served.
 */
export async function cached<S extends z.ZodType>(
  db: Db,
  kind: CacheKind,
  key: string,
  schema: S,
  load: () => Promise<z.output<S>>,
  now: () => number = Date.now,
): Promise<z.output<S>> {
  const [row] = await db.select().from(trackCache).where(eq(trackCache.key, key));
  // Payloads are wrapped as { v } so "not found" (null) can be cached too.
  const hit = row ? schema.safeParse((row.payload as { v?: unknown } | null)?.v) : undefined;
  const fresh = row && hit?.success && now() - row.fetchedAt.getTime() < cacheTtlMs[kind];
  if (fresh && hit?.success) return hit.data;

  let value: z.output<S>;
  try {
    value = await load();
  } catch (err) {
    if (err instanceof AppError && err.code === 'UPSTREAM_UNAVAILABLE' && hit?.success) {
      return hit.data;
    }
    throw err;
  }
  const fetchedAt = new Date(now());
  const payload = { v: value };
  await db
    .insert(trackCache)
    .values({ key, payload, fetchedAt })
    .onConflictDoUpdate({ target: trackCache.key, set: { payload, fetchedAt } });
  return value;
}

/** Deletes entries older than CACHE_MAX_AGE_MS; returns how many were removed. */
export async function pruneCatalogCache(db: Db, now: () => number = Date.now): Promise<number> {
  const cutoff = new Date(now() - CACHE_MAX_AGE_MS);
  const res = await db.delete(trackCache).where(lt(trackCache.fetchedAt, cutoff));
  return res.rowCount ?? 0;
}
