import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gt, lt } from 'drizzle-orm';
import { historyQuerySchema, recordPlayBodySchema, type HistoryResponse } from '@sonora/shared';
import { currentUserId, requireAuth } from '../auth/guard';
import type { AccessTokenIssuer } from '../auth/tokens';
import { resolveTracks, trackLoader } from '../catalog/tracks';
import type { JamendoClient } from '../catalog/jamendo';
import type { Db } from '../db/client';
import { playHistory } from '../db/schema';
import { parse } from '../errors';

/** The same track again within this window counts as one play (replays, retries, double taps). */
export const DUPLICATE_PLAY_WINDOW_MS = 30_000;

export async function historyRoutes(
  app: FastifyInstance,
  deps: { db: Db; accessTokens: AccessTokenIssuer; jamendo: JamendoClient },
) {
  const { db } = deps;
  const loadTrack = trackLoader(db, deps.jamendo);
  app.addHook('preHandler', requireAuth(deps.accessTokens));

  app.post('/history', async (req, reply) => {
    const userId = currentUserId(req);
    const { trackId } = parse(recordPlayBodySchema, req.body);
    const recent = await db
      .select({ id: playHistory.id })
      .from(playHistory)
      .where(
        and(
          eq(playHistory.userId, userId),
          eq(playHistory.jamendoTrackId, trackId),
          gt(playHistory.playedAt, new Date(Date.now() - DUPLICATE_PLAY_WINDOW_MS)),
        ),
      )
      .limit(1);
    if (recent.length === 0) {
      await db.insert(playHistory).values({ userId, jamendoTrackId: trackId });
    }
    return reply.status(204).send();
  });

  app.get('/history', async (req) => {
    const userId = currentUserId(req);
    const q = parse(historyQuerySchema, req.query);
    const rows = await db
      .select()
      .from(playHistory)
      .where(
        and(
          eq(playHistory.userId, userId),
          q.before ? lt(playHistory.playedAt, new Date(q.before)) : undefined,
        ),
      )
      .orderBy(desc(playHistory.playedAt), desc(playHistory.id))
      .limit(q.limit + 1);
    const page = rows.slice(0, q.limit);
    const tracks = await resolveTracks(
      loadTrack,
      page.map((r) => r.jamendoTrackId),
    );
    const res: HistoryResponse = {
      entries: page.map((r) => ({
        id: String(r.id),
        playedAt: r.playedAt.toISOString(),
        trackId: r.jamendoTrackId,
        track: tracks.get(r.jamendoTrackId) ?? null,
      })),
      nextBefore: rows.length > q.limit ? (page.at(-1)?.playedAt.toISOString() ?? null) : null,
    };
    return res;
  });
}
