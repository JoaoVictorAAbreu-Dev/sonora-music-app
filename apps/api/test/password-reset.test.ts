import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorSchema, authResponseSchema } from '@sonora/shared';
import { passwordResetTokens, users } from '../src/db/schema';
import { loadConfig } from '../src/config';
import type { Mailer } from '../src/mail/mailer';
import { goodPassword, setupApp, uniqueEmail } from './helpers';

type Ctx = Awaited<ReturnType<typeof setupApp>>;
const errorCode = (res: { json(): unknown }) => apiErrorSchema.parse(res.json()).error.code;
const newPassword = 'amber-meadow-compass-77';

const sent: { to: string; url: string }[] = [];
const mailer: Mailer = {
  async sendPasswordReset(to, url) {
    sent.push({ to, url });
  },
};
const flush = () => new Promise((r) => setImmediate(r));

describe('password reset (T04)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await setupApp({ PASSWORD_RESET_URL: 'sonora://reset-password' }, { mailer });
  });
  afterAll(() => ctx.close());
  beforeEach(() => {
    sent.length = 0;
  });

  const post = (url: string, payload: object) =>
    ctx.app.inject({ method: 'POST', url: `/v1/auth/password/${url}`, payload });

  async function signUp(email = uniqueEmail()) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: goodPassword, acceptTerms: true },
    });
    return { email, ...authResponseSchema.parse(res.json()) };
  }

  async function requestLink(email: string) {
    const res = await post('forgot', { email });
    expect(res.statusCode).toBe(202);
    await flush();
    const url = sent.at(-1)?.url ?? '';
    return new URL(url).searchParams.get('token') ?? '';
  }

  it('answers 202 for unknown e-mails without sending anything', async () => {
    const res = await post('forgot', { email: uniqueEmail('nobody') });
    expect(res.statusCode).toBe(202);
    await flush();
    expect(sent).toHaveLength(0);
  });

  it('e-mails a one-time link, stores only its hash, and resets the password', async () => {
    const { email, tokens } = await signUp();
    const token = await requestLink(email);
    expect(sent[0]?.to).toBe(email);
    expect(sent[0]?.url.startsWith('sonora://reset-password?token=')).toBe(true);

    const rows = await ctx.db.select().from(passwordResetTokens);
    expect(rows.some((r) => r.tokenHash === token)).toBe(false);

    expect((await post('reset', { token, password: newPassword })).statusCode).toBe(204);

    const login = (password: string) =>
      ctx.app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password } });
    expect((await login(goodPassword)).statusCode).toBe(401);
    expect((await login(newPassword)).statusCode).toBe(200);

    // Old sessions are revoked and the e-mail counts as verified.
    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(refresh.statusCode).toBe(401);
    const [u] = await ctx.db.select().from(users).where(eq(users.email, email));
    expect(u?.emailVerified).toBe(true);

    // The link works once.
    const again = await post('reset', { token, password: 'another-river-stone-88' });
    expect(errorCode(again)).toBe('RESET_TOKEN_INVALID');
  });

  it('only the newest link works', async () => {
    const { email } = await signUp();
    const first = await requestLink(email);
    const second = await requestLink(email);
    expect(errorCode(await post('reset', { token: first, password: newPassword }))).toBe(
      'RESET_TOKEN_INVALID',
    );
    expect((await post('reset', { token: second, password: newPassword })).statusCode).toBe(204);
  });

  it('rejects expired links and weak passwords', async () => {
    const { email } = await signUp();
    const token = await requestLink(email);
    expect(errorCode(await post('reset', { token, password: 'short' }))).toBe('VALIDATION_ERROR');
    await ctx.db
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(
        eq(
          passwordResetTokens.userId,
          (await ctx.db.select().from(users).where(eq(users.email, email)))[0]!.id,
        ),
      );
    expect(errorCode(await post('reset', { token, password: newPassword }))).toBe(
      'RESET_TOKEN_INVALID',
    );
  });

  it('refuses the log mailer in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://u:p@localhost:5432/db',
        JWT_SECRET: 'x'.repeat(40),
        MAIL_PROVIDER: 'log',
      }),
    ).toThrow(/MAIL_PROVIDER/);
  });
});
