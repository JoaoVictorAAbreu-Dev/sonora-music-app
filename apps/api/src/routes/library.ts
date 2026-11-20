import type { FastifyInstance } from 'fastify';
import { and, asc, count, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  addPlaylistTrackBodySchema,
  catalogIdSchema,
  createPlaylistBodySchema,
  favoritesQuerySchema,
  PLAYLISTS_PER_USER_MAX,
  reorderPlaylistBodySchema,
  TRACKS_PER_PLAYLIST_MAX,
  updatePlaylistBodySchema,
  type FavoritesResponse,
  type PlaylistDetailResponse,
  type PlaylistSummary,
} from '@sonora/shared';
import { currentUserId, requireAuth } from '../auth/guard';
import type { AccessTokenIssuer } from '../auth/tokens';
import type { JamendoClient } from '../catalog/jamendo';
import { resolveTracks, trackLoader } from '../catalog/tracks';
import type { Db } from '../db/client';
import { favorites, playlists, playlistTracks } from '../db/schema';
import { AppError, parse } from '../errors';

const FAVORITE_IDS_MAX = 5000;
const trackParams = z.object({ trackId: catalogIdSchema });
const playlistParams = z.object({ id: z.uuid() });
const entryParams = z.object({ id: z.uuid(), entryId: z.uuid() });

type PlaylistRow = typeof playlists.$inferSelect;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export async function libraryRoutes(
  app: FastifyInstance,
  deps: { db: Db; accessTokens: AccessTokenIssuer; jamendo: JamendoClient },
) {
  const { db } = deps;
  const loadTrack = trackLoader(db, deps.jamendo);
  app.addHook('preHandler', requireAuth(deps.accessTokens));

  // ---- Favorites -----------------------------------------------------------------------------

  app.get('/favorites', async (req) => {
    const userId = currentUserId(req);
    const q = parse(favoritesQuerySchema, req.query);
    const [rows, [{ total } = { total: 0 }]] = await Promise.all([
      db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            q.before ? lt(favorites.createdAt, new Date(q.before)) : undefined,
          ),
        )
        .orderBy(desc(favorites.createdAt))
        .limit(q.limit + 1),
      db.select({ total: count() }).from(favorites).where(eq(favorites.userId, userId)),
    ]);
    const page = rows.slice(0, q.limit);
    const tracks = await resolveTracks(
      loadTrack,
      page.map((r) => r.jamendoTrackId),
    );
    const res: FavoritesResponse = {
      entries: page.map((r) => ({
        trackId: r.jamendoTrackId,
        addedAt: r.createdAt.toISOString(),
        track: tracks.get(r.jamendoTrackId) ?? null,
      })),
      total,
      nextBefore: rows.length > q.limit ? (page.at(-1)?.createdAt.toISOString() ?? null) : null,
    };
    return res;
  });

  app.get('/favorites/ids', async (req) => {
    const rows = await db
      .select({ id: favorites.jamendoTrackId })
      .from(favorites)
      .where(eq(favorites.userId, currentUserId(req)))
      .orderBy(desc(favorites.createdAt))
      .limit(FAVORITE_IDS_MAX);
    return { ids: rows.map((r) => r.id) };
  });

  app.put('/favorites/:trackId', async (req, reply) => {
    const { trackId } = parse(trackParams, req.params);
    await db
      .insert(favorites)
      .values({ userId: currentUserId(req), jamendoTrackId: trackId })
      .onConflictDoNothing();
    return reply.status(204).send();
  });

  app.delete('/favorites/:trackId', async (req, reply) => {
    const { trackId } = parse(trackParams, req.params);
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, currentUserId(req)), eq(favorites.jamendoTrackId, trackId)));
    return reply.status(204).send();
  });

  // ---- Playlists -----------------------------------------------------------------------------

  /** Summaries with track counts and the first track's cover. */
  async function summaries(rows: PlaylistRow[]): Promise<PlaylistSummary[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const stats = await db
      .select({
        playlistId: playlistTracks.playlistId,
        trackCount: count(),
        firstTrack: sql<
          string | null
        >`(array_agg(${playlistTracks.jamendoTrackId} order by ${playlistTracks.position}))[1]`,
      })
      .from(playlistTracks)
      .where(inArray(playlistTracks.playlistId, ids))
      .groupBy(playlistTracks.playlistId);
    const byId = new Map(stats.map((s) => [s.playlistId, s]));
    const covers = await resolveTracks(
      loadTrack,
      stats.flatMap((s) => (s.firstTrack ? [s.firstTrack] : [])),
    );
    return rows.map((r) => {
      const s = byId.get(r.id);
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        trackCount: s?.trackCount ?? 0,
        artworkUrl: (s?.firstTrack && covers.get(s.firstTrack)?.artworkUrl) || null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  /** The user's playlist, locked for update inside a transaction; 404 for anyone else's. */
  async function owned(tx: Db | Tx, id: string, userId: string, lock = false) {
    const query = tx
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
    const [row] = lock ? await query.for('update') : await query;
    if (!row) throw new AppError('NOT_FOUND', 'Playlist not found');
    return row;
  }

  const touch = (tx: Db | Tx, id: string) =>
    tx
      .update(playlists)
      .set({ updatedAt: sql`now()` })
      .where(eq(playlists.id, id));

  app.get('/playlists', async (req) => {
    const rows = await db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, currentUserId(req)))
      .orderBy(desc(playlists.updatedAt));
    return { playlists: await summaries(rows) };
  });

  app.post('/playlists', async (req, reply) => {
    const userId = currentUserId(req);
    const body = parse(createPlaylistBodySchema, req.body);
    const [{ total } = { total: 0 }] = await db
      .select({ total: count() })
      .from(playlists)
      .where(eq(playlists.userId, userId));
    if (total >= PLAYLISTS_PER_USER_MAX) {
      throw new AppError('LIMIT_REACHED', `At most ${PLAYLISTS_PER_USER_MAX} playlists`);
    }
    const [row] = await db
      .insert(playlists)
      .values({ userId, name: body.name, description: body.description ?? null })
      .returning();
    if (!row) throw new Error('playlist insert returned no row');
    const [summary] = await summaries([row]);
    return reply.status(201).send({ playlist: summary });
  });

  app.get('/playlists/:id', async (req) => {
    const { id } = parse(playlistParams, req.params);
    const row = await owned(db, id, currentUserId(req));
    const entries = await db
      .select()
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, id))
      .orderBy(asc(playlistTracks.position));
    const tracks = await resolveTracks(
      loadTrack,
      entries.map((e) => e.jamendoTrackId),
    );
    const [playlist] = await summaries([row]);
    if (!playlist) throw new AppError('NOT_FOUND', 'Playlist not found');
    const res: PlaylistDetailResponse = {
      playlist,
      entries: entries.map((e) => ({
        entryId: e.id,
        position: e.position,
        trackId: e.jamendoTrackId,
        track: tracks.get(e.jamendoTrackId) ?? null,
      })),
    };
    return res;
  });

  app.patch('/playlists/:id', async (req) => {
    const { id } = parse(playlistParams, req.params);
    const body = parse(updatePlaylistBodySchema, req.body);
    await owned(db, id, currentUserId(req));
    const [row] = await db
      .update(playlists)
      .set({ ...body, updatedAt: sql`now()` })
      .where(eq(playlists.id, id))
      .returning();
    if (!row) throw new AppError('NOT_FOUND', 'Playlist not found');
    const [playlist] = await summaries([row]);
    return { playlist };
  });

  app.delete('/playlists/:id', async (req, reply) => {
    const { id } = parse(playlistParams, req.params);
    await owned(db, id, currentUserId(req));
    await db.delete(playlists).where(eq(playlists.id, id));
    return reply.status(204).send();
  });

  app.post('/playlists/:id/tracks', async (req, reply) => {
    const { id } = parse(playlistParams, req.params);
    const { trackId } = parse(addPlaylistTrackBodySchema, req.body);
    const userId = currentUserId(req);
    const entry = await db.transaction(async (tx) => {
      await owned(tx, id, userId, true);
      const existing = await tx
        .select({ trackId: playlistTracks.jamendoTrackId })
        .from(playlistTracks)
        .where(eq(playlistTracks.playlistId, id));
      if (existing.some((e) => e.trackId === trackId)) {
        throw new AppError('CONFLICT', 'Track already in playlist');
      }
      if (existing.length >= TRACKS_PER_PLAYLIST_MAX) {
        throw new AppError('LIMIT_REACHED', `At most ${TRACKS_PER_PLAYLIST_MAX} tracks`);
      }
      const [row] = await tx
        .insert(playlistTracks)
        .values({ playlistId: id, jamendoTrackId: trackId, position: existing.length })
        .returning();
      await touch(tx, id);
      if (!row) throw new Error('playlist entry insert returned no row');
      return row;
    });
    return reply.status(201).send({
      entry: {
        entryId: entry.id,
        position: entry.position,
        trackId: entry.jamendoTrackId,
        track: await loadTrack(trackId).catch(() => null),
      },
    });
  });

  app.delete('/playlists/:id/tracks/:entryId', async (req, reply) => {
    const { id, entryId } = parse(entryParams, req.params);
    const userId = currentUserId(req);
    await db.transaction(async (tx) => {
      await owned(tx, id, userId, true);
      const [removed] = await tx
        .delete(playlistTracks)
        .where(and(eq(playlistTracks.id, entryId), eq(playlistTracks.playlistId, id)))
        .returning();
      if (!removed) throw new AppError('NOT_FOUND', 'Entry not found');
      // Keep positions contiguous (D10).
      await tx
        .update(playlistTracks)
        .set({ position: sql`${playlistTracks.position} - 1` })
        .where(
          and(
            eq(playlistTracks.playlistId, id),
            sql`${playlistTracks.position} > ${removed.position}`,
          ),
        );
      await touch(tx, id);
    });
    return reply.status(204).send();
  });

  app.put('/playlists/:id/order', async (req, reply) => {
    const { id } = parse(playlistParams, req.params);
    const { entryIds } = parse(reorderPlaylistBodySchema, req.body);
    const userId = currentUserId(req);
    await db.transaction(async (tx) => {
      await owned(tx, id, userId, true);
      const current = await tx
        .select({ id: playlistTracks.id })
        .from(playlistTracks)
        .where(eq(playlistTracks.playlistId, id));
      const same =
        current.length === entryIds.length &&
        new Set(entryIds).size === entryIds.length &&
        current.every((c) => entryIds.includes(c.id));
      if (!same) {
        throw new AppError('VALIDATION_ERROR', 'entryIds must list every entry exactly once', [
          { path: 'entryIds', message: 'mismatch' },
        ]);
      }
      if (entryIds.length > 0) {
        // Drizzle expands JS arrays into parameter lists, so build the arrays explicitly.
        const idArray = sql.join(
          entryIds.map((e) => sql`${e}`),
          sql`, `,
        );
        const posArray = sql.join(
          entryIds.map((_, i) => sql`${i}`),
          sql`, `,
        );
        await tx.execute(sql`
          update ${playlistTracks} set position = v.pos
          from unnest(array[${idArray}]::uuid[], array[${posArray}]::int[]) as v(id, pos)
          where ${playlistTracks.id} = v.id and ${playlistTracks.playlistId} = ${id}`);
      }
      await touch(tx, id);
    });
    return reply.status(204).send();
  });
}
