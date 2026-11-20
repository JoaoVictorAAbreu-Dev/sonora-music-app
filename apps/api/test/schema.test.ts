import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApp } from './helpers';

describe('first migration', () => {
  let ctx: Awaited<ReturnType<typeof setupApp>>;
  beforeAll(async () => {
    ctx = await setupApp();
  });
  afterAll(() => ctx.close());

  it('creates every table of the data model', async () => {
    const r = await ctx.db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`,
    );
    expect(r.rows.map((x) => x.table_name)).toEqual([
      'auth_identities',
      'favorites',
      'password_reset_tokens',
      'play_history',
      'playlist_tracks',
      'playlists',
      'refresh_tokens',
      'track_cache',
      'users',
    ]);
  });

  it('indexes the lookups', async () => {
    const r = await ctx.db.execute<{ indexname: string }>(
      sql`select indexname from pg_indexes where schemaname = 'public'`,
    );
    const names = r.rows.map((x) => x.indexname);
    for (const idx of [
      'users_email_uq',
      'auth_identities_provider_user_uq',
      'auth_identities_user_idx',
      'refresh_tokens_hash_uq',
      'password_reset_tokens_hash_uq',
      'refresh_tokens_family_idx',
      'refresh_tokens_user_idx',
      'favorites_user_created_idx',
      'playlists_user_updated_idx',
      'playlist_tracks_playlist_position_idx',
      'play_history_user_played_idx',
      'track_cache_fetched_idx',
    ])
      expect(names).toContain(idx);
  });

  it('stores emails lowercase and unique', async () => {
    await expect(
      ctx.db.execute(sql`insert into users (email) values ('Ana@Example.com')`),
    ).rejects.toMatchObject({ cause: { constraint: 'users_email_lowercase_ck' } });
    await ctx.db.execute(sql`insert into users (email) values ('ana@example.com')`);
    await expect(
      ctx.db.execute(sql`insert into users (email) values ('ana@example.com')`),
    ).rejects.toMatchObject({ cause: { constraint: 'users_email_uq' } });
  });

  it('cascades user deletion', async () => {
    const u = await ctx.db.execute<{ id: string }>(
      sql`insert into users (email) values ('del@example.com') returning id`,
    );
    const id = u.rows[0]!.id;
    await ctx.db.execute(
      sql`insert into favorites (user_id, jamendo_track_id) values (${id}, '1')`,
    );
    await ctx.db.execute(sql`delete from users where id = ${id}`);
    const f = await ctx.db.execute(sql`select 1 from favorites where user_id = ${id}`);
    expect(f.rows).toHaveLength(0);
  });
});
