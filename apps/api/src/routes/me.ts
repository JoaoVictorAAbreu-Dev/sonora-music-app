import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { updateMeBodySchema, type MeResponse } from '@sonora/shared';
import { currentUserId, requireAuth } from '../auth/guard';
import type { AccessTokenIssuer } from '../auth/tokens';
import type { Db } from '../db/client';
import { users } from '../db/schema';
import { AppError, parse } from '../errors';
import { findUserById, toUserDto } from './users';

export async function meRoutes(
  app: FastifyInstance,
  deps: { db: Db; accessTokens: AccessTokenIssuer },
) {
  app.addHook('preHandler', requireAuth(deps.accessTokens));

  app.get('/me', async (req) => {
    const user = await findUserById(deps.db, currentUserId(req));
    // A valid token for a deleted account is treated as signed out.
    if (!user) throw new AppError('UNAUTHORIZED', 'Account not found');
    const res: MeResponse = { user: toUserDto(user) };
    return res;
  });

  // Deletes the account and everything that belongs to it (identities, sessions, favorites,
  // playlists, history) through ON DELETE CASCADE. Access tokens already issued stop working
  // because every authenticated route resolves the user.
  app.delete('/me', async (req, reply) => {
    const userId = currentUserId(req);
    const [deleted] = await deps.db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!deleted) throw new AppError('UNAUTHORIZED', 'Account not found');
    req.log.info({ event: 'account_deleted', userId }, 'account deleted');
    return reply.status(204).send();
  });

  app.patch('/me', async (req) => {
    const body = parse(updateMeBodySchema, req.body);
    const [user] = await deps.db
      .update(users)
      .set({ ...body, updatedAt: sql`now()` })
      .where(eq(users.id, currentUserId(req)))
      .returning();
    if (!user) throw new AppError('UNAUTHORIZED', 'Account not found');
    const res: MeResponse = { user: toUserDto(user) };
    return res;
  });
}
