import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { passwordResetTokens, refreshTokens, users } from '../db/schema';
import { AppError } from '../errors';
import { hashPassword } from './passwords';
import { hashRefreshToken, newRefreshToken } from './tokens';

/** Creates a one-time reset token for the user (older unused ones stop working). */
export async function createResetToken(db: Db, userId: string, ttlSeconds: number) {
  const raw = newRefreshToken();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
    await tx.insert(passwordResetTokens).values({
      userId,
      tokenHash: hashRefreshToken(raw),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    });
  });
  return raw;
}

/**
 * Sets the new password, burns the token, marks the e-mail verified (the user proved they read it)
 * and revokes every session, so a stolen refresh token stops working.
 */
export async function resetPassword(db: Db, rawToken: string, password: string): Promise<string> {
  const passwordHash = await hashPassword(password);
  return db.transaction(async (tx) => {
    const now = new Date();
    const [row] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashRefreshToken(rawToken)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    if (!row) throw new AppError('RESET_TOKEN_INVALID', 'Reset link is invalid or expired');
    await tx
      .update(users)
      .set({ passwordHash, emailVerified: true, updatedAt: now })
      .where(eq(users.id, row.userId));
    await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.userId, row.userId), isNull(refreshTokens.revokedAt)));
    return row.userId;
  });
}
