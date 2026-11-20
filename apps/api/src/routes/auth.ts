import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  socialBodySchema,
  type AuthResponse,
  type RefreshResponse,
} from '@sonora/shared';
import type { AttemptLimiter } from '../auth/attempt-limiter';
import { hashPassword, verifyPassword } from '../auth/passwords';
import { createResetToken, resetPassword } from '../auth/password-reset';
import type { SocialVerifier } from '../auth/social';
import { resolveSocialAccount } from '../auth/social-accounts';
import {
  endSession,
  rotateSession,
  startSession,
  TokenReuseError,
  type SessionDeps,
} from '../auth/sessions';
import { users } from '../db/schema';
import { AppError, parse } from '../errors';
import type { Mailer } from '../mail/mailer';
import { toUserDto } from './users';

export interface AuthRouteDeps extends SessionDeps {
  ipLimiter: AttemptLimiter;
  emailLimiter: AttemptLimiter;
  mailer: Mailer;
  passwordResetUrl: string;
  passwordResetTtlSeconds: number;
  verifySocial: SocialVerifier;
}

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION;
}

/** https links carry the token in the fragment (never sent to the server, so never logged). */
export function resetLink(base: string, token: string): string {
  const t = encodeURIComponent(token);
  if (/^https?:\/\//.test(base)) return `${base}#token=${t}`;
  return `${base}${base.includes('?') ? '&' : '?'}token=${t}`;
}

export async function authRoutes(app: FastifyInstance, deps: AuthRouteDeps) {
  // One per-IP budget shared by every /auth route; runs before the body is parsed.
  app.addHook('onRequest', async (req, reply) => {
    const retryAfter = deps.ipLimiter.hit(req.ip);
    if (retryAfter) {
      reply.header('retry-after', retryAfter);
      throw new AppError('RATE_LIMITED', 'Too many requests');
    }
  });

  // Per-email budget for credential attempts (the body is parsed and the email normalized).
  const limitEmail = (email: string) => {
    if (deps.emailLimiter.hit(email)) throw new AppError('RATE_LIMITED', 'Too many attempts');
  };

  app.post('/register', async (req, reply) => {
    const body = parse(registerBodySchema, req.body);
    limitEmail(body.email);
    const passwordHash = await hashPassword(body.password);
    let user: typeof users.$inferSelect | undefined;
    try {
      [user] = await deps.db
        .insert(users)
        .values({
          email: body.email,
          passwordHash,
          displayName: body.displayName ?? null,
          termsAcceptedAt: new Date(),
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError('EMAIL_TAKEN', 'Email already registered');
      throw err;
    }
    if (!user) throw new Error('user insert returned no row');
    const tokens = await startSession(deps, user.id, body.device);
    const res: AuthResponse = { user: toUserDto(user), tokens };
    return reply.status(201).send(res);
  });

  app.post('/login', async (req) => {
    const body = parse(loginBodySchema, req.body);
    limitEmail(body.email);
    const [user] = await deps.db.select().from(users).where(eq(users.email, body.email));
    // Always run a verification (dummy hash when the user is unknown) and return one error,
    // so neither the message nor the timing reveals whether the email exists.
    const ok = await verifyPassword(user?.passwordHash, body.password);
    if (!user || !ok) throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect');
    const tokens = await startSession(deps, user.id, body.device);
    const res: AuthResponse = { user: toUserDto(user), tokens };
    return res;
  });

  app.post('/refresh', async (req) => {
    const { refreshToken } = parse(refreshBodySchema, req.body);
    try {
      const res: RefreshResponse = { tokens: await rotateSession(deps, refreshToken) };
      return res;
    } catch (err) {
      // Security event: ids only, never token values.
      if (err instanceof TokenReuseError) {
        req.log.warn(
          { event: 'refresh_token_reuse', userId: err.userId, familyId: err.familyId },
          'token family revoked',
        );
      }
      throw err;
    }
  });

  // M6: Google / Apple. The ID token is verified here; the app is never trusted with identity.
  app.post('/social', async (req, reply) => {
    const body = parse(socialBodySchema, req.body);
    const identity = await deps.verifySocial(body.provider, body.idToken, body.nonce);
    const { user, created, linked } = await resolveSocialAccount(deps.db, identity, body);
    if (linked) {
      req.log.info(
        { event: 'identity_linked', userId: user.id, provider: body.provider },
        'provider identity linked by verified e-mail',
      );
    }
    const tokens = await startSession(deps, user.id, body.device);
    const res: AuthResponse = { user: toUserDto(user), tokens };
    return reply.status(created ? 201 : 200).send(res);
  });

  // T04. Same 202 whether or not the account exists, and the e-mail is sent in the background,
  // so neither the answer nor its timing reveals registered addresses.
  app.post('/password/forgot', async (req, reply) => {
    const { email } = parse(forgotPasswordBodySchema, req.body);
    limitEmail(email);
    const [user] = await deps.db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (user) {
      const token = await createResetToken(deps.db, user.id, deps.passwordResetTtlSeconds);
      const url = resetLink(deps.passwordResetUrl, token);
      deps.mailer.sendPasswordReset(email, url).catch((err: unknown) => {
        req.log.error({ err, event: 'mail_failed', kind: 'password_reset' }, 'reset e-mail failed');
      });
    }
    return reply.status(202).send();
  });

  app.post('/password/reset', async (req, reply) => {
    const body = parse(resetPasswordBodySchema, req.body);
    const userId = await resetPassword(deps.db, body.token, body.password);
    req.log.info({ event: 'password_reset', userId }, 'password reset; sessions revoked');
    return reply.status(204).send();
  });

  app.post('/logout', async (req, reply) => {
    const { refreshToken } = parse(logoutBodySchema, req.body);
    await endSession(deps, refreshToken);
    return reply.status(204).send();
  });
}
