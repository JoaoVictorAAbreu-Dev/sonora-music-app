import { trackSchema, type Track } from '@sonora/shared';
import type { Db } from '../db/client';
import { cacheKey, cached } from './cache';
import type { JamendoClient } from './jamendo';

/** Track lookup through the catalog cache (null when Jamendo does not know the id). */
export function trackLoader(db: Db, jamendo: JamendoClient) {
  return (id: string): Promise<Track | null> =>
    cached(db, 'track', cacheKey('track', id), trackSchema.nullable(), () => jamendo.track(id));
}

/** Resolves many ids; unavailable or failing ones become null instead of failing the request. */
export async function resolveTracks(
  load: (id: string) => Promise<Track | null>,
  ids: string[],
): Promise<Map<string, Track | null>> {
  const unique = [...new Set(ids)];
  const settled = await Promise.allSettled(unique.map((id) => load(id)));
  return new Map(
    unique.map((id, i) => [id, settled[i]?.status === 'fulfilled' ? settled[i].value : null]),
  );
}
