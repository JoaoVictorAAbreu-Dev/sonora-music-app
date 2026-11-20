import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authResponseSchema } from '@sonora/shared';
import { goodPassword, setupApp, uniqueEmail } from './helpers';

describe('DELETE /v1/me', () => {
  let ctx: Awaited<ReturnType<typeof setupApp>>;
  beforeAll(async () => {
    ctx = await setupApp({ AUTH_RATE_LIMIT_PER_IP: '10000' });
  });
  afterAll(() => ctx.close());

  it('deletes the account, its data and its sessions', async () => {
    const email = uniqueEmail();
    const reg = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: goodPassword, acceptTerms: true },
    });
    const { user, tokens } = authResponseSchema.parse(reg.json());
    const auth = { authorization: `Bearer ${tokens.accessToken}` };
    await ctx.app.inject({ method: 'PUT', url: '/v1/favorites/5', headers: auth });
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/playlists',
      headers: auth,
      payload: { name: 'x' },
    });
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/history',
      headers: auth,
      payload: { trackId: '5' },
    });

    const del = await ctx.app.inject({ method: 'DELETE', url: '/v1/me', headers: auth });
    expect(del.statusCode).toBe(204);

    for (const table of ['users', 'favorites', 'playlists', 'play_history', 'refresh_tokens']) {
      const col = table === 'users' ? 'id' : 'user_id';
      const r = await ctx.db.execute(
        sql.raw(`select count(*)::int as n from ${table} where ${col} = '${user.id}'`),
      );
      expect((r.rows[0] as { n: number }).n, table).toBe(0);
    }
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: auth })).statusCode).toBe(
      401,
    );
    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(refresh.statusCode).toBe(401);
    // The email can be used again.
    const again = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: goodPassword, acceptTerms: true },
    });
    expect(again.statusCode).toBe(201);
  });

  it('requires authentication', async () => {
    expect((await ctx.app.inject({ method: 'DELETE', url: '/v1/me' })).statusCode).toBe(401);
  });
});
