import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  apiErrorSchema,
  authResponseSchema,
  favoriteIdsResponseSchema,
  favoritesResponseSchema,
  playlistDetailResponseSchema,
  playlistResponseSchema,
  playlistsResponseSchema,
} from '@sonora/shared';
import { FAKE_CLIENT_ID, fakeJamendo } from './fake-jamendo';
import { goodPassword, setupApp, uniqueEmail } from './helpers';

type Ctx = Awaited<ReturnType<typeof setupApp>>;
type H = Record<string, string>;
const jamendo = fakeJamendo();
const code = (res: { json(): unknown }) => apiErrorSchema.parse(res.json()).error.code;

let ctx: Ctx;
beforeAll(async () => {
  ctx = await setupApp(
    { JAMENDO_CLIENT_ID: FAKE_CLIENT_ID, AUTH_RATE_LIMIT_PER_IP: '10000' },
    { jamendoFetch: jamendo.fetchImpl },
  );
});
afterAll(() => ctx.close());

async function user() {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email: uniqueEmail(), password: goodPassword, acceptTerms: true },
  });
  const body = authResponseSchema.parse(res.json());
  return { authorization: `Bearer ${body.tokens.accessToken}` };
}

const req = (
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  headers: H,
  payload?: Record<string, unknown>,
) => ctx.app.inject({ method, url, headers, ...(payload === undefined ? {} : { payload }) });

describe('favorites', () => {
  it('adds idempotently, lists newest first with tracks, and removes', async () => {
    const h = await user();
    expect((await req('PUT', '/v1/favorites/11', h)).statusCode).toBe(204);
    expect((await req('PUT', '/v1/favorites/11', h)).statusCode).toBe(204);
    await ctx.db.execute(sql`update favorites set created_at = now() - interval '1 minute'`);
    await req('PUT', '/v1/favorites/12', h);

    const list = favoritesResponseSchema.parse((await req('GET', '/v1/favorites', h)).json());
    expect(list.total).toBe(2);
    expect(list.entries.map((e) => e.trackId)).toEqual(['12', '11']);
    expect(list.entries[0]!.track?.title).toBe('Synthetic Track 12');
    expect(
      favoriteIdsResponseSchema.parse((await req('GET', '/v1/favorites/ids', h)).json()).ids,
    ).toEqual(['12', '11']);

    expect((await req('DELETE', '/v1/favorites/11', h)).statusCode).toBe(204);
    expect((await req('DELETE', '/v1/favorites/11', h)).statusCode).toBe(204);
    const after = favoritesResponseSchema.parse((await req('GET', '/v1/favorites', h)).json());
    expect(after.entries.map((e) => e.trackId)).toEqual(['12']);
  });

  it('paginates and isolates users', async () => {
    const h = await user();
    for (const id of ['1', '2', '3']) await req('PUT', `/v1/favorites/${id}`, h);
    const page = favoritesResponseSchema.parse(
      (await req('GET', '/v1/favorites?limit=2', h)).json(),
    );
    expect(page.entries).toHaveLength(2);
    expect(page.nextBefore).not.toBeNull();
    const other = await user();
    expect(
      favoritesResponseSchema.parse((await req('GET', '/v1/favorites', other)).json()).total,
    ).toBe(0);
    expect(code(await req('PUT', '/v1/favorites/abc', h))).toBe('VALIDATION_ERROR');
  });
});

describe('playlists', () => {
  async function create(h: H, name = 'Foco profundo') {
    const res = await req('POST', '/v1/playlists', h, { name });
    expect(res.statusCode).toBe(201);
    return playlistResponseSchema.parse(res.json()).playlist;
  }
  const detail = async (h: H, id: string) =>
    playlistDetailResponseSchema.parse((await req('GET', `/v1/playlists/${id}`, h)).json());

  it('creates, lists, renames and deletes', async () => {
    const h = await user();
    const p = await create(h, '  Noite de chuva ');
    expect(p).toMatchObject({ name: 'Noite de chuva', trackCount: 0, artworkUrl: null });
    const list = playlistsResponseSchema.parse((await req('GET', '/v1/playlists', h)).json());
    expect(list.playlists.map((x) => x.id)).toEqual([p.id]);

    const renamed = await req('PATCH', `/v1/playlists/${p.id}`, h, { name: 'Estrada' });
    expect(playlistResponseSchema.parse(renamed.json()).playlist.name).toBe('Estrada');
    expect(code(await req('PATCH', `/v1/playlists/${p.id}`, h, {}))).toBe('VALIDATION_ERROR');
    expect(code(await req('POST', '/v1/playlists', h, { name: '   ' }))).toBe('VALIDATION_ERROR');

    expect((await req('DELETE', `/v1/playlists/${p.id}`, h)).statusCode).toBe(204);
    expect((await req('GET', `/v1/playlists/${p.id}`, h)).statusCode).toBe(404);
  });

  it('adds tracks in order, rejects duplicates and shows count and cover', async () => {
    const h = await user();
    const p = await create(h);
    for (const id of ['21', '22', '23']) {
      expect(
        (await req('POST', `/v1/playlists/${p.id}/tracks`, h, { trackId: id })).statusCode,
      ).toBe(201);
    }
    const dup = await req('POST', `/v1/playlists/${p.id}/tracks`, h, { trackId: '22' });
    expect(dup.statusCode).toBe(409);
    expect(code(dup)).toBe('CONFLICT');

    const d = await detail(h, p.id);
    expect(d.entries.map((e) => [e.position, e.trackId])).toEqual([
      [0, '21'],
      [1, '22'],
      [2, '23'],
    ]);
    expect(d.playlist.trackCount).toBe(3);
    expect(d.playlist.artworkUrl).toBe('https://images.example.test/track/21.jpg');
  });

  it('removes an entry and keeps positions contiguous', async () => {
    const h = await user();
    const p = await create(h);
    for (const id of ['31', '32', '33', '34'])
      await req('POST', `/v1/playlists/${p.id}/tracks`, h, { trackId: id });
    const before = await detail(h, p.id);
    const second = before.entries[1]!.entryId;
    expect((await req('DELETE', `/v1/playlists/${p.id}/tracks/${second}`, h)).statusCode).toBe(204);
    const after = await detail(h, p.id);
    expect(after.entries.map((e) => [e.position, e.trackId])).toEqual([
      [0, '31'],
      [1, '33'],
      [2, '34'],
    ]);
  });

  it('reorders with the full list of entry ids', async () => {
    const h = await user();
    const p = await create(h);
    for (const id of ['41', '42', '43'])
      await req('POST', `/v1/playlists/${p.id}/tracks`, h, { trackId: id });
    const ids = (await detail(h, p.id)).entries.map((e) => e.entryId);
    const reversed = [...ids].reverse();
    expect(
      (await req('PUT', `/v1/playlists/${p.id}/order`, h, { entryIds: reversed })).statusCode,
    ).toBe(204);
    expect((await detail(h, p.id)).entries.map((e) => e.trackId)).toEqual(['43', '42', '41']);

    const partial = await req('PUT', `/v1/playlists/${p.id}/order`, h, {
      entryIds: ids.slice(0, 2),
    });
    expect(code(partial)).toBe('VALIDATION_ERROR');
    const repeated = await req('PUT', `/v1/playlists/${p.id}/order`, h, {
      entryIds: [ids[0], ids[0], ids[1]],
    });
    expect(code(repeated)).toBe('VALIDATION_ERROR');
  });

  it("hides other users' playlists behind 404", async () => {
    const owner = await user();
    const other = await user();
    const p = await create(owner);
    expect((await req('GET', `/v1/playlists/${p.id}`, other)).statusCode).toBe(404);
    expect((await req('PATCH', `/v1/playlists/${p.id}`, other, { name: 'x' })).statusCode).toBe(
      404,
    );
    expect(
      (await req('POST', `/v1/playlists/${p.id}/tracks`, other, { trackId: '1' })).statusCode,
    ).toBe(404);
    expect((await req('DELETE', `/v1/playlists/${p.id}`, other)).statusCode).toBe(404);
    expect(
      playlistsResponseSchema.parse((await req('GET', '/v1/playlists', other)).json()).playlists,
    ).toEqual([]);
    expect((await req('GET', '/v1/playlists/not-a-uuid', owner)).statusCode).toBe(400);
  });

  it('enforces the per-user playlist limit', async () => {
    const h = await user();
    // Fill up to the limit directly in the database, then try one more through the API.
    const p = await create(h, 'first');
    const owner = await ctx.db.execute<{ user_id: string }>(
      sql`select user_id from playlists where id = ${p.id}`,
    );
    const uid = owner.rows[0]!.user_id;
    await ctx.db.execute(
      sql`insert into playlists (user_id, name) select ${uid}, 'p' || g from generate_series(2, 200) g`,
    );
    const res = await req('POST', '/v1/playlists', h, { name: 'one too many' });
    expect(res.statusCode).toBe(422);
    expect(code(res)).toBe('LIMIT_REACHED');
  });
});
