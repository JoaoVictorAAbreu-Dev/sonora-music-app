import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@sonora/shared';
import type { Db } from '../db/client';

export function healthRoutes(app: FastifyInstance, deps: { db: Db; version: string }): void {
  app.get('/health', async (req, reply) => {
    let database: HealthResponse['checks']['database'] = 'ok';
    try {
      await deps.db.execute(sql`select 1`);
    } catch (err) {
      req.log.warn({ err }, 'health: database unreachable');
      database = 'down';
    }
    const res: HealthResponse = {
      status: database === 'ok' ? 'ok' : 'degraded',
      version: deps.version,
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database },
    };
    return reply.status(database === 'ok' ? 200 : 503).send(res);
  });
}
