import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiErrorSchema, healthResponseSchema } from '@sonora/shared';
import { buildApp } from '../src/app';
import { createDb } from '../src/db/client';
import { setupApp, testConfig } from './helpers';

describe('GET /health', () => {
  let ctx: Awaited<ReturnType<typeof setupApp>>;
  beforeAll(async () => {
    ctx = await setupApp();
  });
  afterAll(() => ctx.close());

  it('reports ok when the database answers', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = healthResponseSchema.parse(res.json());
    expect(body).toMatchObject({ status: 'ok', version: 'test', checks: { database: 'ok' } });
  });

  it('sets security headers', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('allows configured CORS origins only', async () => {
    const ok = await ctx.app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://app.example.test' },
    });
    expect(ok.headers['access-control-allow-origin']).toBe('https://app.example.test');
    const bad = await ctx.app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns the shared error shape for unknown routes', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    const body = apiErrorSchema.parse(res.json());
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBeTruthy();
  });
});

describe('GET /health without a database', () => {
  it('reports degraded with 503', async () => {
    const config = testConfig({ DATABASE_URL: 'postgres://nobody:x@127.0.0.1:1/none' });
    const { db, pool } = createDb(config.DATABASE_URL);
    const app = await buildApp(config, db);
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ status: 'degraded', checks: { database: 'down' } });
    await app.close();
    await pool.end();
  });
});
