import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from './api/client';

/** Retry only transient failures (network, upstream); never auth or validation errors. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return false;
  const transient = error.code === 'NETWORK_ERROR' || error.code === 'UPSTREAM_UNAVAILABLE';
  return transient && failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 5 * 60_000, gcTime: 30 * 60_000 },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
