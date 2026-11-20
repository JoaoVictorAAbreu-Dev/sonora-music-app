import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  albumResponseSchema,
  apiErrorSchema,
  artistResponseSchema,
  authResponseSchema,
  homeResponseSchema,
  searchResponseSchema,
  trackResponseSchema,
} from '@sonora/shared';
import { CACHE_MAX_AGE_MS, pruneCatalogCache } from '../src/catalog/cache';
import { trackCache } from '../src/db/schema';
import { FAKE_CLIENT_ID, fakeJamendo } from './fake-jamendo';
import { goodPassword, setupApp, uniqueEmail } from './helpers';

type Ctx = Awaited<ReturnType<typeof setupApp>>;
const jamendo = fakeJamendo();
const errorCode = (res: { json(): unknown }) => apiErrorSchema.parse(res.json()).error.code;

async function signUp(ctx: Ctx) {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email: uniqueEmail(), password: goodPassword, acceptTerms: true },
  });
  const body = authResponseSchema.parse(res.json());
  return { userId: body.user.id, auth: { authorization: `Bearer ${body.tokens.accessToken}` } };
}

describe('catalog', () => {
  let ctx: Ctx;
  let auth: Record<string, string>;
  let userId: string;
  const lines: string[] = [];
  const get = (url: string, headers = auth) => ctx.app.inject({ method: 'GET', url, headers });

  beforeAll(async () => {
    ctx = await setupApp(
      {
        JAMENDO_CLIENT_ID: FAKE_CLIENT_ID,
        JAMENDO_BASE_URL: 'https://jamendo.example.test/v3.0',
        JAMENDO_TIMEOUT_MS: '500',
        LOG_LEVEL: 'info',
        AUTH_RATE_LIMIT_PER_IP: '10000',
        CATALOG_RATE_LIMIT_PER_USER: '10000',
      },
      { jamendoFetch: jamendo.fetchImpl, logStream: { write: (m) => lines.push(m) } },
    );
    ({ auth, userId } = await signUp(ctx));
  });
  afterAll(() => ctx.close());
  beforeEach(async () => {
    jamendo.reset();
    await ctx.db.delete(trackCache);
  });

  it('requires a signed-in user', async () => {
    const res = await get('/v1/search?q=x', {});
    expect(res.statusCode).toBe(401);
    expect(jamendo.calls).toHaveLength(0);
  });

  describe('GET /v1/search', () => {
    it('searches tracks, albums and artists through Jamendo', async () => {
      const res = await get('/v1/search?q=lo-fi');
      expect(res.statusCode).toBe(200);
      const body = searchResponseSchema.parse(res.json());
      expect(body.tracks.map((t) => t.id)).toEqual(['1', '2']); // malformed item skipped
      expect(body.tracks[0]).toMatchObject({
        title: 'Synthetic Track 1',
        artist: { id: '900', name: 'Fixture Artist' },
        album: { id: '500', title: 'Fixture Album' },
        streamPath: '/v1/tracks/1/stream',
      });
      expect(body.albums).toHaveLength(2);
      expect(body.artists).toHaveLength(1);
      expect(jamendo.calls.map((u) => u.pathname)).toEqual(
        expect.arrayContaining(['/v3.0/tracks/', '/v3.0/albums/', '/v3.0/artists/']),
      );
      expect(jamendo.calls.every((u) => u.searchParams.get('client_id') === FAKE_CLIENT_ID)).toBe(
        true,
      );
      expect(res.body).not.toContain(FAKE_CLIENT_ID);
    });

    it('only queries the requested type', async () => {
      const res = await get('/v1/search?q=lo-fi&type=albums&limit=5');
      const body = searchResponseSchema.parse(res.json());
      expect(body.tracks).toEqual([]);
      expect(jamendo.calls.map((u) => u.pathname)).toEqual(['/v3.0/albums/']);
      expect(jamendo.calls[0]!.searchParams.get('limit')).toBe('5');
    });

    it('serves repeated searches from the cache', async () => {
      await get('/v1/search?q=ambient');
      const upstream = jamendo.calls.length;
      const again = await get('/v1/search?q=ambient');
      expect(again.statusCode).toBe(200);
      expect(jamendo.calls).toHaveLength(upstream);
      await get('/v1/search?q=jazz');
      expect(jamendo.calls.length).toBeGreaterThan(upstream);
    });

    it.each([
      ['/v1/search', 'missing q'],
      ['/v1/search?q=%20%20', 'blank q'],
      ['/v1/search?q=x&limit=99', 'limit too high'],
      ['/v1/search?q=x&type=podcasts', 'unknown type'],
    ])('rejects %s (%s)', async (url) => {
      const res = await get(url);
      expect(res.statusCode).toBe(400);
      expect(errorCode(res)).toBe('VALIDATION_ERROR');
      expect(jamendo.calls).toHaveLength(0);
    });
  });

  describe('details', () => {
    it('returns a track, 404 for unknown ids and 400 for malformed ids', async () => {
      const ok = await get('/v1/tracks/42');
      expect(trackResponseSchema.parse(ok.json()).track.title).toBe('Synthetic Track 42');
      expect((await get('/v1/tracks/404')).statusCode).toBe(404);
      expect(errorCode(await get('/v1/tracks/abc'))).toBe('VALIDATION_ERROR');
    });

    it('redirects the stream without exposing it in JSON', async () => {
      const res = await get('/v1/tracks/7/stream');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(
        `https://audio.example.test/stream?trackid=7&from=app-${FAKE_CLIENT_ID}`,
      );
      expect(res.headers['cache-control']).toBe('no-store');
      expect((await get('/v1/tracks/404/stream')).statusCode).toBe(404);
    });

    it('returns an album with its tracks', async () => {
      const res = await get('/v1/albums/500');
      const { album } = albumResponseSchema.parse(res.json());
      expect(album).toMatchObject({ title: 'Fixture Album 500', releaseDate: '2024-05-01' });
      expect(album.tracks.map((t) => [t.id, t.album?.id, t.artist.name])).toEqual([
        ['30', '500', 'Fixture Artist'],
        ['31', '500', 'Fixture Artist'],
      ]);
      expect((await get('/v1/albums/404')).statusCode).toBe(404);
    });

    it('returns an artist with top tracks and albums', async () => {
      const res = await get('/v1/artists/900');
      const { artist } = artistResponseSchema.parse(res.json());
      expect(artist.imageUrl).toBeNull(); // empty image string from Jamendo → null
      expect(artist.topTracks.length).toBeGreaterThan(0);
      expect(artist.albums.length).toBeGreaterThan(0);
      expect((await get('/v1/artists/404')).statusCode).toBe(404);
    });
  });

  describe('GET /v1/home', () => {
    it('combines popular sections with the user history', async () => {
      await ctx.db
        .execute(sql`insert into play_history (user_id, jamendo_track_id, played_at) values
        (${userId}, '21', now() - interval '2 hours'),
        (${userId}, '22', now() - interval '1 hour'),
        (${userId}, '21', now())`);
      const res = await get('/v1/home');
      const home = homeResponseSchema.parse(res.json());
      expect(home.continueListening.map((t) => t.id)).toEqual(['21', '22']); // distinct, newest first
      expect(home.popular.map((t) => t.id)).toEqual(['10', '11', '12']);
      expect(home.madeForYou).toHaveLength(2);
    });

    it('does not show other users history', async () => {
      const other = await signUp(ctx);
      const home = homeResponseSchema.parse((await get('/v1/home', other.auth)).json());
      expect(home.continueListening).toEqual([]);
    });
  });

  describe('upstream failures', () => {
    it.each(['network', 'http500', 'failed', 'hang'] as const)(
      'answers 502 UPSTREAM_UNAVAILABLE on %s',
      async (mode) => {
        jamendo.setMode(mode);
        const res = await get('/v1/tracks/5');
        expect(res.statusCode).toBe(502);
        expect(errorCode(res)).toBe('UPSTREAM_UNAVAILABLE');
      },
    );

    it('serves a stale cached copy while Jamendo is down', async () => {
      await get('/v1/tracks/8');
      await ctx.db.update(trackCache).set({ fetchedAt: sql`now() - interval '2 days'` });
      jamendo.setMode('network');
      const res = await get('/v1/tracks/8');
      expect(res.statusCode).toBe(200);
      expect(trackResponseSchema.parse(res.json()).track.id).toBe('8');
    });

    it('refreshes stale entries when Jamendo is up', async () => {
      await get('/v1/tracks/9');
      await ctx.db.update(trackCache).set({ fetchedAt: sql`now() - interval '2 days'` });
      const before = jamendo.calls.length;
      await get('/v1/tracks/9');
      expect(jamendo.calls.length).toBe(before + 1);
    });
  });

  it('never logs the Jamendo client id', async () => {
    jamendo.setMode('network');
    await get('/v1/tracks/3');
    jamendo.reset();
    await get('/v1/tracks/3/stream');
    expect(lines.join('\n')).not.toContain(FAKE_CLIENT_ID);
  });

  it('prunes entries older than the maximum age', async () => {
    await get('/v1/tracks/1');
    await get('/v1/tracks/2');
    await ctx.db
      .update(trackCache)
      .set({ fetchedAt: new Date(Date.now() - CACHE_MAX_AGE_MS - 1000) })
      .where(sql`key like 'track:1'`);
    expect(await pruneCatalogCache(ctx.db)).toBe(1);
    const keys = (await ctx.db.select().from(trackCache)).map((r) => r.key);
    expect(keys).toEqual(['track:2']);
  });
});

describe('catalog configuration and limits', () => {
  it('answers 502 when no Jamendo client id is configured', async () => {
    const ctx = await setupApp({ JAMENDO_CLIENT_ID: '', AUTH_RATE_LIMIT_PER_IP: '10000' });
    try {
      const { auth } = await signUp(ctx);
      const res = await ctx.app.inject({ method: 'GET', url: '/v1/search?q=x', headers: auth });
      expect(res.statusCode).toBe(502);
      expect(errorCode(res)).toBe('UPSTREAM_UNAVAILABLE');
    } finally {
      await ctx.close();
    }
  });

  it('limits requests per user', async () => {
    const fake = fakeJamendo();
    const ctx = await setupApp(
      {
        JAMENDO_CLIENT_ID: FAKE_CLIENT_ID,
        CATALOG_RATE_LIMIT_PER_USER: '2',
        AUTH_RATE_LIMIT_PER_IP: '10000',
      },
      { jamendoFetch: fake.fetchImpl },
    );
    try {
      const { auth } = await signUp(ctx);
      const codes = [];
      for (let i = 0; i < 3; i++) {
        codes.push(
          (await ctx.app.inject({ method: 'GET', url: `/v1/tracks/${60 + i}`, headers: auth }))
            .statusCode,
        );
      }
      expect(codes).toEqual([200, 200, 429]);
    } finally {
      await ctx.close();
    }
  });
});
