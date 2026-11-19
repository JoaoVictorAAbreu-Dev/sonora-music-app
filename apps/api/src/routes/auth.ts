import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import {
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  type AuthResponse,
  type RefreshResponse,
} from '@sonora/shared';
import type { AttemptLimiter } from '../auth/attempt-limiter';
import { hashPassword, verifyPassword } from '../auth/passwords';
import {
  endSession,
  rotateSession,
  startSession,
  TokenReuseError,
  type SessionDeps,
} from '../auth/sessions';
import { users } from '../db/schema';
import { AppError, parse } from '../errors';
import { toUserDto } from './users';

export interface AuthRouteDeps extends SessionDeps {
  ipLimiter: AttemptLimiter;
  emailLimiter: AttemptLimiter;
}

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION;
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

  app.post('/logout', async (req, reply) => {
    const { refreshToken } = parse(logoutBodySchema, req.body);
    await endSession(deps, refreshToken);
    return reply.status(204).send();
  });
}
