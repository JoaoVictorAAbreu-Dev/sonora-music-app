import type { z } from 'zod';
import { apiErrorSchema, type ErrorCode, type FieldIssue } from '@sonora/shared';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'BAD_RESPONSE';

/** Every failure surfaced by the client: API errors keep their stable code. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly status: number,
    readonly details?: FieldIssue[],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export interface SessionHandlers {
  /** Current in-memory access token, if any. */
  getAccessToken(): string | null;
  /**
   * Obtains a new access token with the stored refresh token. Resolves true on success and false
   * when the session is gone (the caller then signs out). Network failures reject.
   */
  refresh(): Promise<boolean>;
  /** Called once when the session cannot be recovered. */
  onSessionExpired(): void;
}

export interface RequestOptions<S extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Response schema; omit for empty (204) responses. */
  schema?: S;
  /** Send the access token and recover from 401 with one refresh. Default true. */
  auth?: boolean;
  signal?: AbortSignal;
}

export interface ApiClient {
  request<S extends z.ZodType = z.ZodVoid>(
    path: string,
    options?: RequestOptions<S>,
  ): Promise<z.output<S>>;
}

/** 401 codes that a token refresh can fix. TOKEN_REUSED is never retried. */
const REFRESHABLE = new Set<ClientErrorCode>(['TOKEN_EXPIRED', 'UNAUTHORIZED']);

export function createApiClient(opts: {
  baseUrl: string;
  session: SessionHandlers;
  fetchImpl?: typeof fetch;
}): ApiClient {
  const doFetch = opts.fetchImpl ?? fetch;
  // A single refresh shared by every request that hits 401 while it is running.
  let inFlight: Promise<boolean> | null = null;

  const refreshOnce = () => {
    inFlight ??= opts.session.refresh().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  async function send<S extends z.ZodType>(path: string, o: RequestOptions<S>) {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (o.body !== undefined) headers['content-type'] = 'application/json';
    const token = o.auth === false ? null : opts.session.getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
    try {
      return await doFetch(`${opts.baseUrl}${path}`, {
        method: o.method ?? 'GET',
        headers,
        body: o.body === undefined ? undefined : JSON.stringify(o.body),
        signal: o.signal,
      });
    } catch {
      throw new ApiRequestError('NETWORK_ERROR', 'Network request failed', 0);
    }
  }

  async function toError(res: Response): Promise<ApiRequestError> {
    const json: unknown = await res.json().catch(() => undefined);
    const parsed = apiErrorSchema.safeParse(json);
    if (parsed.success) {
      const e = parsed.data.error;
      return new ApiRequestError(e.code, e.message, res.status, e.details);
    }
    return new ApiRequestError('BAD_RESPONSE', `Unexpected response (${res.status})`, res.status);
  }

  async function read<S extends z.ZodType>(res: Response, schema?: S) {
    if (!schema || res.status === 204) return undefined as z.output<S>;
    const json: unknown = await res.json().catch(() => undefined);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiRequestError('BAD_RESPONSE', 'Response did not match schema', res.status);
    }
    return parsed.data;
  }

  return {
    async request<S extends z.ZodType>(path: string, o: RequestOptions<S> = {}) {
      const auth = o.auth !== false;
      let res = await send(path, o);
      if (res.ok) return read(res, o.schema);

      let error = await toError(res);
      if (!auth || res.status !== 401 || !REFRESHABLE.has(error.code)) throw error;

      const refreshed = await refreshOnce();
      if (!refreshed) {
        opts.session.onSessionExpired();
        throw error;
      }
      res = await send(path, o);
      if (res.ok) return read(res, o.schema);
      error = await toError(res);
      if (res.status === 401) opts.session.onSessionExpired();
      throw error;
    },
  };
}
