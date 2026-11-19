import { randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { TokenPair } from '@sonora/shared';
import type { Db } from '../db/client';
import { refreshTokens } from '../db/schema';
import { AppError } from '../errors';
import { hashRefreshToken, newRefreshToken, type AccessTokenIssuer } from './tokens';

export interface SessionDeps {
  db: Db;
  accessTokens: AccessTokenIssuer;
  refreshTtlSeconds: number;
}

/** Raised when a rotated refresh token is presented again; carries ids for the security log. */
export class TokenReuseError extends AppError {
  constructor(
    readonly userId: string,
    readonly familyId: string,
  ) {
    super('TOKEN_REUSED', 'Refresh token reuse detected; session revoked');
  }
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

async function insertRefreshToken(
  tx: Db | Tx,
  deps: SessionDeps,
  userId: string,
  familyId: string,
  device: string | null,
) {
  const raw = newRefreshToken();
  const expiresAt = new Date(Date.now() + deps.refreshTtlSeconds * 1000);
  const [row] = await tx
    .insert(refreshTokens)
    .values({ userId, familyId, device, tokenHash: hashRefreshToken(raw), expiresAt })
    .returning({ id: refreshTokens.id });
  if (!row) throw new Error('refresh token insert returned no row');
  return { raw, expiresAt, id: row.id };
}

async function pair(deps: SessionDeps, userId: string, refresh: { raw: string; expiresAt: Date }) {
  const access = await deps.accessTokens.sign(userId);
  const tokens: TokenPair = {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken: refresh.raw,
    refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
  };
  return tokens;
}

/** Starts a new token family (sign-in on one device). */
export async function startSession(
  deps: SessionDeps,
  userId: string,
  device: string | undefined,
): Promise<TokenPair> {
  const refresh = await insertRefreshToken(deps.db, deps, userId, randomUUID(), device ?? null);
  return pair(deps, userId, refresh);
}

async function revokeFamily(tx: Db | Tx, familyId: string) {
  await tx
    .update(refreshTokens)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
}

/**
 * Rotates a refresh token: the presented token is consumed and a successor in the same family is
 * issued. Presenting an already rotated token is treated as theft: the whole family is revoked.
 */
export async function rotateSession(deps: SessionDeps, rawToken: string): Promise<TokenPair> {
  const result = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashRefreshToken(rawToken)))
      .for('update');

    if (!row)
      return { ok: false as const, error: new AppError('UNAUTHORIZED', 'Invalid refresh token') };
    if (row.replacedBy) {
      await revokeFamily(tx, row.familyId);
      return { ok: false as const, error: new TokenReuseError(row.userId, row.familyId) };
    }
    if (row.revokedAt)
      return { ok: false as const, error: new AppError('UNAUTHORIZED', 'Session revoked') };
    if (row.expiresAt.getTime() <= Date.now()) {
      return { ok: false as const, error: new AppError('TOKEN_EXPIRED', 'Refresh token expired') };
    }

    const next = await insertRefreshToken(tx, deps, row.userId, row.familyId, row.device);
    await tx
      .update(refreshTokens)
      .set({ revokedAt: sql`now()`, replacedBy: next.id })
      .where(eq(refreshTokens.id, row.id));
    return { ok: true as const, userId: row.userId, next };
  });

  // Throw after the transaction so the family revocation on reuse is committed.
  if (!result.ok) throw result.error;
  return pair(deps, result.userId, result.next);
}

/** Ends the session that owns this refresh token (its whole family). Unknown tokens are ignored. */
export async function endSession(deps: SessionDeps, rawToken: string): Promise<void> {
  const [row] = await deps.db
    .select({ familyId: refreshTokens.familyId })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashRefreshToken(rawToken)));
  if (row) await revokeFamily(deps.db, row.familyId);
}
