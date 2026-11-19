import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  apiErrorSchema,
  authResponseSchema,
  meResponseSchema,
  refreshResponseSchema,
  type AuthResponse,
} from '@sonora/shared';
import { createAccessTokens, hashRefreshToken } from '../src/auth/tokens';
import { refreshTokens, users } from '../src/db/schema';
import { goodPassword, setupApp, uniqueEmail } from './helpers';

type Ctx = Awaited<ReturnType<typeof setupApp>>;

const errorCode = (res: { json(): unknown }) => apiErrorSchema.parse(res.json()).error.code;

async function register(ctx: Ctx, email = uniqueEmail(), password = goodPassword) {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password, acceptTerms: true, device: 'test' },
  });
  return res;
}

async function registered(ctx: Ctx, email = uniqueEmail()): Promise<AuthResponse> {
  const res = await register(ctx, email);
  expect(res.statusCode).toBe(201);
  return authResponseSchema.parse(res.json());
}

function login(ctx: Ctx, email: string, password: string) {
  return ctx.app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password } });
}

function refresh(ctx: Ctx, refreshToken: string) {
  return ctx.app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken } });
}

function me(ctx: Ctx, accessToken?: string) {
  return ctx.app.inject({
    method: 'GET',
    url: '/v1/me',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });
}

describe('auth', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    // Every request comes from one IP here; the limits have their own tests below.
    ctx = await setupApp({ AUTH_RATE_LIMIT_PER_IP: '10000', AUTH_RATE_LIMIT_PER_EMAIL: '10000' });
  });
  afterAll(() => ctx.close());

  describe('POST /v1/auth/register', () => {
    it('creates the account, stores an argon2id hash and starts a session', async () => {
      const email = uniqueEmail('Mixed.Case');
      const res = await register(ctx, `  ${email.toUpperCase()} `);
      expect(res.statusCode).toBe(201);
      const body = authResponseSchema.parse(res.json());
      expect(body.user.email).toBe(email.toLowerCase());
      expect(new Date(body.tokens.accessTokenExpiresAt).getTime() - Date.now()).toBeLessThanOrEqual(
        900_000,
      );
      const [row] = await ctx.db.select().from(users).where(eq(users.id, body.user.id));
      expect(row!.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
      expect(row!.termsAcceptedAt).toBeInstanceOf(Date);
      const [token] = await ctx.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, body.user.id));
      expect(token!.tokenHash).toBe(hashRefreshToken(body.tokens.refreshToken));
      expect(token!.tokenHash).not.toContain(body.tokens.refreshToken);
      expect(token!.device).toBe('test');
    });

    it('rejects a duplicate email regardless of case', async () => {
      const email = uniqueEmail();
      await registered(ctx, email);
      const res = await register(ctx, email.toUpperCase());
      expect(res.statusCode).toBe(409);
      expect(errorCode(res)).toBe('EMAIL_TAKEN');
    });

    it.each([
      ['short password', { password: 'short-pw' }, 'password', 'too_short'],
      ['common password', { password: 'Password123' }, 'password', 'too_common'],
      ['invalid email', { email: 'not-an-email' }, 'email', undefined],
      ['terms not accepted', { acceptTerms: false }, 'acceptTerms', 'terms_required'],
    ])('rejects %s with VALIDATION_ERROR details', async (_name, patch, path, message) => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: uniqueEmail(), password: goodPassword, acceptTerms: true, ...patch },
      });
      expect(res.statusCode).toBe(400);
      const { error } = apiErrorSchema.parse(res.json());
      expect(error.code).toBe('VALIDATION_ERROR');
      const detail = error.details?.find((d) => d.path === path);
      expect(detail).toBeDefined();
      if (message) expect(detail!.message).toBe(message);
    });

    it('rejects malformed JSON and oversized bodies with the shared shape', async () => {
      const bad = await ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        headers: { 'content-type': 'application/json' },
        payload: '{"email":',
      });
      expect(bad.statusCode).toBe(400);
      expect(errorCode(bad)).toBe('VALIDATION_ERROR');
      const big = await ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'a@b.co', password: 'x'.repeat(70 * 1024) },
      });
      expect(big.statusCode).toBe(413);
      expect(errorCode(big)).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /v1/auth/login', () => {
    it('signs in with the right password', async () => {
      const email = uniqueEmail();
      await registered(ctx, email);
      const res = await login(ctx, email.toUpperCase(), goodPassword);
      expect(res.statusCode).toBe(200);
      expect(authResponseSchema.parse(res.json()).user.email).toBe(email);
    });

    it('returns the same error for a wrong password and an unknown email', async () => {
      const email = uniqueEmail();
      await registered(ctx, email);
      const wrong = await login(ctx, email, 'wrong-password-123');
      const unknown = await login(ctx, uniqueEmail('nobody'), 'wrong-password-123');
      expect(wrong.statusCode).toBe(401);
      expect(unknown.statusCode).toBe(401);
      const a = apiErrorSchema.parse(wrong.json()).error;
      const b = apiErrorSchema.parse(unknown.json()).error;
      expect(a.code).toBe('INVALID_CREDENTIALS');
      expect({ code: a.code, message: a.message }).toEqual({ code: b.code, message: b.message });
    });
  });

  describe('access token', () => {
    it('authorizes GET /v1/me', async () => {
      const { user, tokens } = await registered(ctx);
      const res = await me(ctx, tokens.accessToken);
      expect(res.statusCode).toBe(200);
      expect(meResponseSchema.parse(res.json()).user).toEqual(user);
    });

    it('rejects missing, tampered and expired tokens', async () => {
      const { user, tokens } = await registered(ctx);
      expect(errorCode(await me(ctx))).toBe('UNAUTHORIZED');
      expect(errorCode(await me(ctx, `${tokens.accessToken.slice(0, -2)}xx`))).toBe('UNAUTHORIZED');

      const signer = createAccessTokens(ctx.config.JWT_SECRET, ctx.config.ACCESS_TOKEN_TTL);
      const expired = await signer.sign(user.id, new Date(Date.now() - 16 * 60_000));
      const res = await me(ctx, expired.token);
      expect(res.statusCode).toBe(401);
      expect(errorCode(res)).toBe('TOKEN_EXPIRED');

      const otherKey = createAccessTokens('another-secret-another-secret-0000', 900);
      expect(errorCode(await me(ctx, (await otherKey.sign(user.id)).token))).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /v1/me', () => {
    it('updates the display name', async () => {
      const { tokens } = await registered(ctx);
      const res = await ctx.app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: { authorization: `Bearer ${tokens.accessToken}` },
        payload: { displayName: '  Ana Clara ' },
      });
      expect(res.statusCode).toBe(200);
      expect(meResponseSchema.parse(res.json()).user.displayName).toBe('Ana Clara');
      const again = meResponseSchema.parse((await me(ctx, tokens.accessToken)).json());
      expect(again.user.displayName).toBe('Ana Clara');
    });

    it('rejects unknown fields, empty bodies and anonymous calls', async () => {
      const { tokens } = await registered(ctx);
      const auth = { authorization: `Bearer ${tokens.accessToken}` };
      const unknownField = await ctx.app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: auth,
        payload: { email: 'new@example.com' },
      });
      expect(errorCode(unknownField)).toBe('VALIDATION_ERROR');
      const empty = await ctx.app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: auth,
        payload: {},
      });
      expect(errorCode(empty)).toBe('VALIDATION_ERROR');
      const anonymous = await ctx.app.inject({
        method: 'PATCH',
        url: '/v1/me',
        payload: { displayName: 'x' },
      });
      expect(anonymous.statusCode).toBe(401);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('rotates the refresh token on every use', async () => {
      const { tokens } = await registered(ctx);
      const res = await refresh(ctx, tokens.refreshToken);
      expect(res.statusCode).toBe(200);
      const next = refreshResponseSchema.parse(res.json()).tokens;
      expect(next.refreshToken).not.toBe(tokens.refreshToken);
      expect((await me(ctx, next.accessToken)).statusCode).toBe(200);

      const [old] = await ctx.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, hashRefreshToken(tokens.refreshToken)));
      const [successor] = await ctx.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, hashRefreshToken(next.refreshToken)));
      expect(old!.revokedAt).not.toBeNull();
      expect(old!.replacedBy).toBe(successor!.id);
      expect(successor!.familyId).toBe(old!.familyId);

      const third = await refresh(ctx, next.refreshToken);
      expect(third.statusCode).toBe(200);
    });

    it('detects reuse of a rotated token and revokes the whole family', async () => {
      const email = uniqueEmail();
      const first = (await registered(ctx, email)).tokens;
      const other = authResponseSchema.parse((await login(ctx, email, goodPassword)).json()).tokens;

      const rotated = refreshResponseSchema.parse((await refresh(ctx, first.refreshToken)).json());

      const reuse = await refresh(ctx, first.refreshToken);
      expect(reuse.statusCode).toBe(401);
      expect(errorCode(reuse)).toBe('TOKEN_REUSED');

      // The legitimate successor is dead too: the attacker and the user both have to sign in.
      const successor = await refresh(ctx, rotated.tokens.refreshToken);
      expect(successor.statusCode).toBe(401);
      expect(errorCode(successor)).toBe('UNAUTHORIZED');

      // Another device (a different family) is unaffected.
      expect((await refresh(ctx, other.refreshToken)).statusCode).toBe(200);
    });

    it('rejects an expired refresh token', async () => {
      const { tokens } = await registered(ctx);
      await ctx.db
        .update(refreshTokens)
        .set({ expiresAt: sql`now() - interval '1 second'` })
        .where(eq(refreshTokens.tokenHash, hashRefreshToken(tokens.refreshToken)));
      const res = await refresh(ctx, tokens.refreshToken);
      expect(res.statusCode).toBe(401);
      expect(errorCode(res)).toBe('TOKEN_EXPIRED');
    });

    it('rejects unknown and malformed tokens', async () => {
      expect(errorCode(await refresh(ctx, 'x'.repeat(43)))).toBe('UNAUTHORIZED');
      expect(errorCode(await refresh(ctx, 'short'))).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('revokes the session so its refresh token stops working', async () => {
      const { tokens } = await registered(ctx);
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        payload: { refreshToken: tokens.refreshToken },
      });
      expect(res.statusCode).toBe(204);
      const after = await refresh(ctx, tokens.refreshToken);
      expect(after.statusCode).toBe(401);
      expect(errorCode(after)).toBe('UNAUTHORIZED');
    });

    it('is idempotent for unknown tokens', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        payload: { refreshToken: 'y'.repeat(43) },
      });
      expect(res.statusCode).toBe(204);
    });
  });
});

describe('auth rate limits', () => {
  it('limits attempts per email', async () => {
    const ctx = await setupApp({ AUTH_RATE_LIMIT_PER_EMAIL: '3', AUTH_RATE_LIMIT_PER_IP: '100' });
    try {
      const email = uniqueEmail();
      const codes = [];
      for (let i = 0; i < 4; i++)
        codes.push((await login(ctx, email, 'wrong-password-123')).statusCode);
      expect(codes).toEqual([401, 401, 401, 429]);
      const res = await login(ctx, email.toUpperCase(), 'wrong-password-123');
      expect(errorCode(res)).toBe('RATE_LIMITED');
      // Other emails still work.
      expect((await login(ctx, uniqueEmail(), 'wrong-password-123')).statusCode).toBe(401);
    } finally {
      await ctx.close();
    }
  });

  it('limits requests per IP across all auth routes', async () => {
    const ctx = await setupApp({ AUTH_RATE_LIMIT_PER_IP: '3', AUTH_RATE_LIMIT_PER_EMAIL: '100' });
    try {
      await login(ctx, uniqueEmail(), 'wrong-password-123');
      await refresh(ctx, 'z'.repeat(43));
      await login(ctx, uniqueEmail(), 'wrong-password-123');
      const res = await refresh(ctx, 'z'.repeat(43));
      expect(res.statusCode).toBe(429);
      expect(errorCode(res)).toBe('RATE_LIMITED');
      expect(res.headers['retry-after']).toBeDefined();
      // Non-auth routes are not limited.
      expect((await ctx.app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    } finally {
      await ctx.close();
    }
  });
});

describe('logging', () => {
  it('never writes passwords, tokens or Authorization headers', async () => {
    const lines: string[] = [];
    const ctx = await setupApp(
      { LOG_LEVEL: 'trace', AUTH_RATE_LIMIT_PER_IP: '10000' },
      { logStream: { write: (m) => lines.push(m) } },
    );
    try {
      const email = uniqueEmail();
      const reg = await register(ctx, email);
      const { tokens } = authResponseSchema.parse(reg.json());
      await login(ctx, email, goodPassword);
      await me(ctx, tokens.accessToken);
      await refresh(ctx, tokens.refreshToken);
      await refresh(ctx, tokens.refreshToken); // reuse → security warning log
      const log = lines.join('\n');
      expect(log).toContain('refresh_token_reuse');
      expect(log).not.toContain(goodPassword);
      expect(log).not.toContain(tokens.refreshToken);
      expect(log).not.toContain(tokens.accessToken);
      expect(log).not.toMatch(/Bearer /);
    } finally {
      await ctx.close();
    }
  });
});
