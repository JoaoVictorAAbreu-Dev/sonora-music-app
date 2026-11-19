import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import type { Db } from './db/client';
import { registerErrorHandlers } from './errors';
import { healthRoutes } from './routes/health';

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
];

export async function buildApp(config: Config, db: Db): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: { paths: redactPaths, censor: '[redacted]' },
    },
    // Trust exactly N proxy hops (Caddy) so req.ip is the client, not the proxy.
    trustProxy: (_address: string, hop: number) => hop < config.TRUST_PROXY_HOPS,
    bodyLimit: 64 * 1024,
    genReqId: () => crypto.randomUUID(),
  });

  registerErrorHandlers(app);

  await app.register(helmet, {
    // JSON API: no HTML is served, so lock everything down.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  });
  await app.register(cors, {
    origin: (origin, cb) => cb(null, origin === undefined || config.CORS_ORIGINS.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  // Off by default; auth routes opt in with `config.rateLimit`.
  await app.register(rateLimit, { global: false });

  healthRoutes(app, { db, version: config.APP_VERSION });

  return app;
}
