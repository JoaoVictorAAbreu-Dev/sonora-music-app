import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiErrorSchema, authResponseSchema } from '@sonora/shared';
import { APPLE_ISSUERS, createSocialVerifier, GOOGLE_ISSUERS } from '../src/auth/social';
import { authIdentities, users } from '../src/db/schema';
import { goodPassword, setupApp, uniqueEmail } from './helpers';

type Ctx = Awaited<ReturnType<typeof setupApp>>;
const errorCode = (res: { json(): unknown }) => apiErrorSchema.parse(res.json()).error.code;

const GOOGLE_AUD = 'test-client.apps.googleusercontent.com';
const APPLE_AUD = 'dev.example.sonora';

let privateKey: CryptoKey;
let otherKey: CryptoKey;
let ctx: Ctx;
let sub = 0;

async function idToken(
  claims: JWTPayload,
  { iss = GOOGLE_ISSUERS[0], aud = GOOGLE_AUD, key = privateKey, exp = '5m' } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(iss ?? '')
    .setAudience(aud)
    .setSubject(String(claims.sub ?? `sub-${++sub}`))
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);
}

const social = (payload: object) =>
  ctx.app.inject({ method: 'POST', url: '/v1/auth/social', payload });

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair('RS256')).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256' };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const verifySocial = createSocialVerifier({
    google: { issuers: GOOGLE_ISSUERS, audiences: [GOOGLE_AUD], keys },
    apple: { issuers: APPLE_ISSUERS, audiences: [APPLE_AUD], keys },
  });
  ctx = await setupApp({}, { verifySocial });
});
afterAll(() => ctx.close());

describe('social sign-in (M6)', () => {
  it('creates an account on first Google sign-in and reuses it after', async () => {
    const email = uniqueEmail('google');
    const token = await idToken({ sub: 'g-1-' + email, email, email_verified: true });
    const first = await social({ provider: 'google', idToken: token, acceptTerms: true });
    expect(first.statusCode).toBe(201);
    const a = authResponseSchema.parse(first.json());
    expect(a.user.email).toBe(email);

    const again = await social({ provider: 'google', idToken: token });
    expect(again.statusCode).toBe(200);
    expect(authResponseSchema.parse(again.json()).user.id).toBe(a.user.id);
  });

  it('requires accepting the terms for a new account', async () => {
    const email = uniqueEmail('terms');
    const token = await idToken({ email, email_verified: true });
    expect(errorCode(await social({ provider: 'google', idToken: token }))).toBe('TERMS_REQUIRED');
  });

  it('rejects bad signatures, wrong audience, expired tokens and unverified e-mails', async () => {
    const email = uniqueEmail('bad');
    const claims = { email, email_verified: true };
    for (const token of [
      await idToken(claims, { key: otherKey }),
      await idToken(claims, { aud: 'someone-else' }),
      await idToken(claims, { exp: '-2m' }),
      await idToken(claims, { iss: 'https://evil.example' }),
    ]) {
      expect(
        errorCode(await social({ provider: 'google', idToken: token, acceptTerms: true })),
      ).toBe('UNAUTHORIZED');
    }
    const unverified = await idToken({ email, email_verified: false });
    expect(
      errorCode(await social({ provider: 'google', idToken: unverified, acceptTerms: true })),
    ).toBe('FORBIDDEN');
  });

  it('checks the Apple nonce (SHA-256 of the raw value) and its string email_verified', async () => {
    const email = uniqueEmail('apple');
    const nonce = 'n'.repeat(32);
    const hashed = createHash('sha256').update(nonce).digest('hex');
    const token = await idToken(
      { email, email_verified: 'true', nonce: hashed },
      { iss: APPLE_ISSUERS[0], aud: APPLE_AUD },
    );
    expect(errorCode(await social({ provider: 'apple', idToken: token, acceptTerms: true }))).toBe(
      'UNAUTHORIZED',
    );
    expect(
      errorCode(
        await social({
          provider: 'apple',
          idToken: token,
          nonce: 'x'.repeat(32),
          acceptTerms: true,
        }),
      ),
    ).toBe('UNAUTHORIZED');
    const ok = await social({
      provider: 'apple',
      idToken: token,
      nonce,
      acceptTerms: true,
      displayName: 'Ana',
    });
    expect(ok.statusCode).toBe(201);
    expect(authResponseSchema.parse(ok.json()).user.displayName).toBe('Ana');
  });

  it('links to an existing account by verified e-mail and removes an unproven password', async () => {
    const email = uniqueEmail('link');
    const reg = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: goodPassword, acceptTerms: true },
    });
    const registered = authResponseSchema.parse(reg.json());

    const token = await idToken({ email: email.toUpperCase(), email_verified: true });
    const res = await social({ provider: 'google', idToken: token });
    expect(res.statusCode).toBe(200);
    expect(authResponseSchema.parse(res.json()).user.id).toBe(registered.user.id);

    const [u] = await ctx.db.select().from(users).where(eq(users.email, email));
    expect(u?.emailVerified).toBe(true);
    expect(u?.passwordHash).toBeNull();
    const ids = await ctx.db
      .select()
      .from(authIdentities)
      .where(eq(authIdentities.userId, registered.user.id));
    expect(ids).toHaveLength(1);

    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: registered.tokens.refreshToken },
    });
    expect(refresh.statusCode).toBe(401);
  });

  it('answers PROVIDER_DISABLED when no client id is configured', async () => {
    const off = await setupApp();
    const res = await off.app.inject({
      method: 'POST',
      url: '/v1/auth/social',
      payload: { provider: 'apple', idToken: 'x'.repeat(40) },
    });
    expect(errorCode(res)).toBe('PROVIDER_DISABLED');
    await off.close();
  });
});
