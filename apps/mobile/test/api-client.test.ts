import { z } from 'zod';
import { ApiRequestError, createApiClient, type SessionHandlers } from '@/lib/api/client';
import { apiError, json } from './fixtures';

const okSchema = z.object({ ok: z.literal(true) });

function setup(refreshResult: boolean | Error = true) {
  let token = 'old';
  const calls: { url: string; auth?: string }[] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const session: SessionHandlers = {
    getAccessToken: () => token,
    refresh: jest.fn(async () => {
      await gate; // hold the refresh so concurrent requests pile up behind it
      if (refreshResult instanceof Error) throw refreshResult;
      if (refreshResult) token = 'new';
      return refreshResult;
    }),
    onSessionExpired: jest.fn(),
  };
  const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
    const auth = (init?.headers as Record<string, string>).authorization;
    calls.push({ url, auth });
    if (auth === 'Bearer new') return json(200, { ok: true });
    return json(401, apiError('TOKEN_EXPIRED'));
  }) as unknown as typeof fetch;
  const client = createApiClient({ baseUrl: 'https://api.test', session, fetchImpl });
  return { client, session, calls, release };
}

describe('api client', () => {
  it('refreshes once for concurrent 401s and retries every request', async () => {
    const { client, session, calls, release } = setup(true);
    const requests = [1, 2, 3].map((i) => client.request(`/v1/r${i}`, { schema: okSchema }));
    await new Promise((r) => setTimeout(r, 0));
    release();
    await expect(Promise.all(requests)).resolves.toEqual([
      { ok: true },
      { ok: true },
      { ok: true },
    ]);
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(calls.filter((c) => c.auth === 'Bearer new')).toHaveLength(3);
    expect(session.onSessionExpired).not.toHaveBeenCalled();
  });

  it('signs out once the refresh fails, for every waiting request', async () => {
    const { client, session, release } = setup(false);
    const requests = [1, 2].map((i) =>
      client.request(`/v1/r${i}`, { schema: okSchema }).catch((e: unknown) => e),
    );
    release();
    const results = await Promise.all(requests);
    for (const r of results) expect(r).toMatchObject({ code: 'TOKEN_EXPIRED', status: 401 });
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(session.onSessionExpired).toHaveBeenCalled();
  });

  it('keeps the session when the refresh fails for network reasons', async () => {
    const { client, session, release } = setup(new ApiRequestError('NETWORK_ERROR', 'offline', 0));
    release();
    await expect(client.request('/v1/r', { schema: okSchema })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(session.onSessionExpired).not.toHaveBeenCalled();
  });

  it('never refreshes on TOKEN_REUSED or for unauthenticated calls', async () => {
    const session: SessionHandlers = {
      getAccessToken: () => 't',
      refresh: jest.fn(async () => true),
      onSessionExpired: jest.fn(),
    };
    const fetchImpl = jest.fn(async () =>
      json(401, apiError('TOKEN_REUSED')),
    ) as unknown as typeof fetch;
    const client = createApiClient({ baseUrl: 'https://api.test', session, fetchImpl });
    await expect(client.request('/v1/me')).rejects.toMatchObject({ code: 'TOKEN_REUSED' });
    await expect(
      client.request('/v1/auth/login', { method: 'POST', body: {}, auth: false }),
    ).rejects.toMatchObject({ code: 'TOKEN_REUSED' });
    expect(session.refresh).not.toHaveBeenCalled();
    const [, init] = (fetchImpl as unknown as jest.Mock).mock.calls[1] as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('maps network failures, API errors and unexpected bodies', async () => {
    const session: SessionHandlers = {
      getAccessToken: () => null,
      refresh: jest.fn(),
      onSessionExpired: jest.fn(),
    };
    const responses = [
      () => Promise.reject(new TypeError('Network request failed')),
      async () =>
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'bad',
            details: [{ path: 'email', message: 'x' }],
          },
        }),
      async () => json(200, { unexpected: true }),
      async () => new Response('<html>', { status: 502 }),
    ];
    const fetchImpl = jest.fn(() => responses.shift()!()) as unknown as typeof fetch;
    const client = createApiClient({ baseUrl: 'https://api.test', session, fetchImpl });
    const get = () =>
      client.request('/x', { schema: okSchema, auth: false }).catch((e: unknown) => e);
    expect(await get()).toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
    expect(await get()).toMatchObject({ code: 'VALIDATION_ERROR', details: [{ path: 'email' }] });
    expect(await get()).toMatchObject({ code: 'BAD_RESPONSE', status: 200 });
    expect(await get()).toMatchObject({ code: 'BAD_RESPONSE', status: 502 });
  });
});
