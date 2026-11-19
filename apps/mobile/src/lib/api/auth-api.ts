import {
  authResponseSchema,
  meResponseSchema,
  refreshResponseSchema,
  type LoginBody,
  type RegisterBody,
  type UpdateMeBody,
} from '@sonora/shared';
import type { ApiClient } from './client';

/** Typed wrappers for the auth and account routes; bodies match the shared Zod schemas. */
export function createAuthApi(client: ApiClient) {
  return {
    register: (body: RegisterBody) =>
      client.request('/v1/auth/register', {
        method: 'POST',
        body,
        schema: authResponseSchema,
        auth: false,
      }),
    login: (body: LoginBody) =>
      client.request('/v1/auth/login', {
        method: 'POST',
        body,
        schema: authResponseSchema,
        auth: false,
      }),
    refresh: (refreshToken: string) =>
      client.request('/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        schema: refreshResponseSchema,
        auth: false,
      }),
    logout: (refreshToken: string) =>
      client.request('/v1/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      }),
    me: () => client.request('/v1/me', { schema: meResponseSchema }),
    updateMe: (body: UpdateMeBody) =>
      client.request('/v1/me', { method: 'PATCH', body, schema: meResponseSchema }),
  };
}
export type AuthApi = ReturnType<typeof createAuthApi>;
