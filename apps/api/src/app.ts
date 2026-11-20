import { createMailer, type Mailer } from './mail/mailer';
import { createSocialVerifier, remoteProviders, type SocialVerifier } from './auth/social';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import type { Db } from './db/client';
import { AttemptLimiter } from './auth/attempt-limiter';
import { createAccessTokens } from './auth/tokens';
import { createJamendoClient } from './catalog/jamendo';
import { registerErrorHandlers } from './errors';
import { authRoutes } from './routes/auth';
import { catalogRoutes } from './routes/catalog';
import { healthRoutes } from './routes/health';
import { historyRoutes } from './routes/history';
import { libraryRoutes } from './routes/library';
import { meRoutes } from './routes/me';

/** Paths pino must never print. Bodies are not logged at all; this is defense in depth. */
export const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.idToken',
  '*.identityToken',
  'body.password',
  'body.refreshToken',
];

export interface BuildOptions {
  /** Test hook: where pino writes (defaults to stdout). */
  logStream?: { write(msg: string): void };
  /** Test hook: fetch used for Jamendo (defaults to global fetch). */
  jamendoFetch?: typeof fetch;
  /** Test hook: outgoing e-mail (defaults to MAIL_PROVIDER). */
  mailer?: Mailer;
  /** Test hook: Google/Apple ID token verification (defaults to the providers' public keys). */
  verifySocial?: SocialVerifier;
}

export async function buildApp(
  config: Config,
  db: Db,
  options: BuildOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: { paths: redactPaths, censor: '[redacted]' },
      ...(options.logStream ? { stream: options.logStream } : {}),
    },
    // Trust exactly N proxy hops (Caddy) so req.ip is the client, not the proxy.
    trustProxy: (_address: string, hop: number) => hop < config.TRUST_PROXY_HOPS,
    bodyLimit: 64 * 1024,
    genReqId: () => crypto.randomUUID(),
  });

  registerErrorHandlers(app);

  await app.register(helmet, {
    // JSON API: no HTML is served, so lock everything down.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  });
  await app.register(cors, {
    origin: (origin, cb) => cb(null, origin === undefined || config.CORS_ORIGINS.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  healthRoutes(app, { db, version: config.APP_VERSION });

  const accessTokens = createAccessTokens(config.JWT_SECRET, config.ACCESS_TOKEN_TTL);
  const sessionDeps = { db, accessTokens, refreshTtlSeconds: config.REFRESH_TOKEN_TTL };
  const jamendo = createJamendoClient({
    clientId: config.JAMENDO_CLIENT_ID,
    baseUrl: config.JAMENDO_BASE_URL,
    timeoutMs: config.JAMENDO_TIMEOUT_MS,
    ...(options.jamendoFetch ? { fetchImpl: options.jamendoFetch } : {}),
  });
  await app.register(
    (v1, _opts, done) => {
      void v1.register(authRoutes, {
        prefix: '/auth',
        ...sessionDeps,
        ipLimiter: new AttemptLimiter(config.AUTH_RATE_LIMIT_PER_IP, 60_000),
        emailLimiter: new AttemptLimiter(config.AUTH_RATE_LIMIT_PER_EMAIL, 15 * 60_000),
        mailer: options.mailer ?? createMailer(config, app.log),
        passwordResetUrl: config.PASSWORD_RESET_URL,
        passwordResetTtlSeconds: config.PASSWORD_RESET_TTL,
        verifySocial:
          options.verifySocial ??
          createSocialVerifier(remoteProviders(config.GOOGLE_CLIENT_IDS, config.APPLE_CLIENT_IDS)),
      });
      void v1.register(meRoutes, { db, accessTokens });
      void v1.register(catalogRoutes, {
        db,
        accessTokens,
        jamendo,
        userLimiter: new AttemptLimiter(config.CATALOG_RATE_LIMIT_PER_USER, 60_000),
      });
      void v1.register(historyRoutes, { db, accessTokens, jamendo });
      void v1.register(libraryRoutes, { db, accessTokens, jamendo });
      done();
    },
    { prefix: '/v1' },
  );

  return app;
}
