import type { TokenPair, User } from '@sonora/shared';

export const user: User = {
  id: '6f1c2a3e-9a41-4f8e-8f5a-3b2c1d0e9f87',
  email: 'ana@example.com',
  displayName: null,
  createdAt: '2026-11-19T12:00:00.000Z',
};

export function tokens(n: number): TokenPair {
  return {
    accessToken: `access-${n}`,
    accessTokenExpiresAt: '2026-11-19T12:15:00.000Z',
    refreshToken: `refresh-${n}-${'x'.repeat(40)}`,
    refreshTokenExpiresAt: '2026-12-19T12:00:00.000Z',
  };
}

export function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const apiError = (code: string, message = code) => ({ error: { code, message } });
