import type { FastifyInstance } from 'fastify';
import { desc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import {
  albumDetailSchema,
  albumSchema,
  artistDetailSchema,
  artistSchema,
  catalogIdSchema,
  homeResponseSchema,
  searchQuerySchema,
  searchResponseSchema,
  trackSchema,
  type HomeResponse,
  type SearchResponse,
} from '@sonora/shared';
import type { AttemptLimiter } from '../auth/attempt-limiter';
import { currentUserId, requireAuth } from '../auth/guard';
import type { AccessTokenIssuer } from '../auth/tokens';
import { cacheKey, cached } from '../catalog/cache';
import type { JamendoClient } from '../catalog/jamendo';
import type { Db } from '../db/client';
import { playHistory } from '../db/schema';
import { AppError, parse } from '../errors';

export interface CatalogDeps {
  db: Db;
  accessTokens: AccessTokenIssuer;
  jamendo: JamendoClient;
  userLimiter: AttemptLimiter;
}

const idParams = z.object({ id: catalogIdSchema });
const HOME_SECTION_SIZE = 10;
const ARTIST_TOP_TRACKS = 10;
const ARTIST_ALBUMS = 20;

const notFound = (what: string) => new AppError('NOT_FOUND', `${what} not found`);

export async function catalogRoutes(app: FastifyInstance, deps: CatalogDeps) {
  const { db, jamendo } = deps;
  app.addHook('preHandler', requireAuth(deps.accessTokens));
  app.addHook('preHandler', async (req, reply) => {
    const retryAfter = deps.userLimiter.hit(currentUserId(req));
    if (retryAfter) {
      reply.header('retry-after', retryAfter);
      throw new AppError('RATE_LIMITED', 'Too many requests');
    }
  });

  const getTrack = (id: string) =>
    cached(db, 'track', cacheKey('track', id), trackSchema.nullable(), () => jamendo.track(id));

  app.get('/search', async (req) => {
    const q = parse(searchQuerySchema, req.query);
    const want = (t: string) => q.type === 'all' || q.type === t;
    const res: SearchResponse = await cached(
      db,
      'search',
      cacheKey('search', q),
      searchResponseSchema,
      async () => {
        const [tracks, albums, artists] = await Promise.all([
          want('tracks') ? jamendo.searchTracks(q.q, q.limit, q.offset) : [],
          want('albums') ? jamendo.searchAlbums(q.q, q.limit, q.offset) : [],
          want('artists') ? jamendo.searchArtists(q.q, q.limit, q.offset) : [],
        ]);
        return { query: q.q, type: q.type, tracks, albums, artists };
      },
    );
    return res;
  });

  app.get('/tracks/:id', async (req) => {
    const { id } = parse(idParams, req.params);
    const track = await getTrack(id);
    if (!track) throw notFound('Track');
    return { track };
  });

  // Redirects to the audio file. The Jamendo URL carries the client id, so it is never put in a
  // JSON body or cached on the device: the player follows this redirect at play time.
  app.get('/tracks/:id/stream', async (req, reply) => {
    const { id } = parse(idParams, req.params);
    const url = await cached(db, 'stream', cacheKey('stream', id), z.url().nullable(), () =>
      jamendo.streamUrl(id),
    );
    if (!url) throw notFound('Track');
    return reply.header('cache-control', 'no-store').redirect(url, 302);
  });

  app.get('/albums/:id', async (req) => {
    const { id } = parse(idParams, req.params);
    const album = await cached(
      db,
      'album',
      cacheKey('album', id),
      albumDetailSchema.nullable(),
      () => jamendo.album(id),
    );
    if (!album) throw notFound('Album');
    return { album };
  });

  app.get('/artists/:id', async (req) => {
    const { id } = parse(idParams, req.params);
    const artist = await cached(
      db,
      'artist',
      cacheKey('artist', id),
      artistDetailSchema.nullable(),
      async () => {
        const base = await jamendo.artist(id);
        if (!base) return null;
        const [topTracks, albums] = await Promise.all([
          jamendo.artistTopTracks(id, ARTIST_TOP_TRACKS),
          jamendo.artistAlbums(id, ARTIST_ALBUMS),
        ]);
        return { ...artistSchema.parse(base), topTracks, albums };
      },
    );
    if (!artist) throw notFound('Artist');
    return { artist };
  });

  app.get('/home', async (req) => {
    const userId = currentUserId(req);
    const shared = await cached(
      db,
      'home',
      cacheKey('home', 'global'),
      homeResponseSchema.pick({ madeForYou: true, popular: true }),
      async () => {
        const [madeForYou, popular] = await Promise.all([
          jamendo.popularAlbums(HOME_SECTION_SIZE),
          jamendo.popularTracks(HOME_SECTION_SIZE),
        ]);
        return { madeForYou: z.array(albumSchema).parse(madeForYou), popular };
      },
    );
    const res: HomeResponse = { continueListening: await recentTracks(userId), ...shared };
    return res;
  });

  /** Distinct most recently played tracks; unavailable ones are skipped, not fatal. */
  async function recentTracks(userId: string) {
    const recent = await db
      .select({ id: playHistory.jamendoTrackId, last: max(playHistory.playedAt) })
      .from(playHistory)
      .where(eq(playHistory.userId, userId))
      .groupBy(playHistory.jamendoTrackId)
      .orderBy(desc(max(playHistory.playedAt)))
      .limit(HOME_SECTION_SIZE);
    const settled = await Promise.allSettled(recent.map((r) => getTrack(r.id)));
    return settled.flatMap((s) => (s.status === 'fulfilled' && s.value ? [s.value] : []));
  }
}
