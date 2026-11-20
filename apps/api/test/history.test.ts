import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiErrorSchema, authResponseSchema, historyResponseSchema } from '@sonora/shared';
import { FAKE_CLIENT_ID, fakeJamendo } from './fake-jamendo';
import { goodPassword, setupApp, uniqueEmail } from './helpers';

type Ctx = Awaited<ReturnType<typeof setupApp>>;
const jamendo = fakeJamendo();

async function signUp(ctx: Ctx) {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email: uniqueEmail(), password: goodPassword, acceptTerms: true },
  });
  const body = authResponseSchema.parse(res.json());
  return { userId: body.user.id, headers: { authorization: `Bearer ${body.tokens.accessToken}` } };
}

describe('history', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await setupApp(
      { JAMENDO_CLIENT_ID: FAKE_CLIENT_ID, AUTH_RATE_LIMIT_PER_IP: '10000' },
      { jamendoFetch: jamendo.fetchImpl },
    );
  });
  afterAll(() => ctx.close());

  const play = (headers: Record<string, string>, trackId: unknown) =>
    ctx.app.inject({ method: 'POST', url: '/v1/history', headers, payload: { trackId } });
  const list = (headers: Record<string, string>, qs = '') =>
    ctx.app.inject({ method: 'GET', url: `/v1/history${qs}`, headers });

  it('records plays and lists them newest first with track details', async () => {
    const { headers } = await signUp(ctx);
    expect((await play(headers, '11')).statusCode).toBe(204);
    expect((await play(headers, '12')).statusCode).toBe(204);
    const body = historyResponseSchema.parse((await list(headers)).json());
    expect(body.entries.map((e) => e.trackId)).toEqual(['12', '11']);
    expect(body.entries[0]!.track?.title).toBe('Synthetic Track 12');
    expect(body.nextBefore).toBeNull();
  });

  it('counts a quick repeat of the same track once', async () => {
    const { headers } = await signUp(ctx);
    await play(headers, '20');
    await play(headers, '20');
    const body = historyResponseSchema.parse((await list(headers)).json());
    expect(body.entries).toHaveLength(1);
  });

  it('paginates with a before cursor', async () => {
    const { headers, userId } = await signUp(ctx);
    await ctx.db.execute(sql`insert into play_history (user_id, jamendo_track_id, played_at) values
      (${userId}, '31', now() - interval '3 hours'),
      (${userId}, '32', now() - interval '2 hours'),
      (${userId}, '33', now() - interval '1 hour')`);
    const first = historyResponseSchema.parse((await list(headers, '?limit=2')).json());
    expect(first.entries.map((e) => e.trackId)).toEqual(['33', '32']);
    expect(first.nextBefore).not.toBeNull();
    const second = historyResponseSchema.parse(
      (await list(headers, `?limit=2&before=${encodeURIComponent(first.nextBefore!)}`)).json(),
    );
    expect(second.entries.map((e) => e.trackId)).toEqual(['31']);
    expect(second.nextBefore).toBeNull();
  });

  it('keeps entries whose track is unavailable, with track null', async () => {
    const { headers } = await signUp(ctx);
    await play(headers, '404');
    const body = historyResponseSchema.parse((await list(headers)).json());
    expect(body.entries[0]).toMatchObject({ trackId: '404', track: null });
  });

  it('isolates users and validates input', async () => {
    const a = await signUp(ctx);
    const b = await signUp(ctx);
    await play(a.headers, '40');
    expect(historyResponseSchema.parse((await list(b.headers)).json()).entries).toEqual([]);
    const bad = await play(a.headers, 'abc');
    expect(apiErrorSchema.parse(bad.json()).error.code).toBe('VALIDATION_ERROR');
    expect((await list(a.headers, '?limit=500')).statusCode).toBe(400);
    expect((await list({})).statusCode).toBe(401);
  });
});
