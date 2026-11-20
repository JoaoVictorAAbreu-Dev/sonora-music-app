import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { authIdentities, refreshTokens, users } from '../db/schema';
import { AppError } from '../errors';
import type { VerifiedIdentity } from './social';

type User = typeof users.$inferSelect;

/**
 * Resolves the Sonora account for a verified provider identity:
 * 1. a linked identity wins;
 * 2. otherwise a verified provider e-mail links to the account with that e-mail. If that account
 *    never proved its e-mail, its password is removed and its sessions revoked, so whoever
 *    registered the address first cannot keep access (account pre-hijacking);
 * 3. otherwise a new account is created, which requires accepting the terms.
 */
export async function resolveSocialAccount(
  db: Db,
  identity: VerifiedIdentity,
  opts: { displayName?: string | undefined; acceptTerms?: boolean | undefined },
): Promise<{ user: User; created: boolean; linked: boolean }> {
  return db.transaction(async (tx) => {
    const [linked] = await tx
      .select({ user: users })
      .from(authIdentities)
      .innerJoin(users, eq(users.id, authIdentities.userId))
      .where(
        and(
          eq(authIdentities.provider, identity.provider),
          eq(authIdentities.providerUserId, identity.subject),
        ),
      );
    if (linked) return { user: linked.user, created: false, linked: false };

    if (!identity.email || !identity.emailVerified) {
      throw new AppError('FORBIDDEN', 'The provider did not share a verified e-mail');
    }
    const link = (userId: string) =>
      tx.insert(authIdentities).values({
        userId,
        provider: identity.provider,
        providerUserId: identity.subject,
        email: identity.email,
      });

    const [existing] = await tx.select().from(users).where(eq(users.email, identity.email));
    if (existing) {
      let user = existing;
      if (!existing.emailVerified) {
        const now = new Date();
        [user = existing] = await tx
          .update(users)
          .set({ emailVerified: true, passwordHash: null, updatedAt: now })
          .where(eq(users.id, existing.id))
          .returning();
        await tx
          .update(refreshTokens)
          .set({ revokedAt: now })
          .where(and(eq(refreshTokens.userId, existing.id), isNull(refreshTokens.revokedAt)));
      }
      await link(existing.id);
      return { user, created: false, linked: true };
    }

    if (!opts.acceptTerms) {
      throw new AppError('TERMS_REQUIRED', 'Accept the Terms and Privacy Policy to sign up');
    }
    const [created] = await tx
      .insert(users)
      .values({
        email: identity.email,
        emailVerified: true,
        passwordHash: null,
        displayName: opts.displayName ?? null,
        termsAcceptedAt: new Date(),
      })
      .returning();
    if (!created) throw new Error('user insert returned no row');
    await link(created.id);
    return { user: created, created: true, linked: false };
  });
}
