import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';

/** Renders with a fresh QueryClient (no retries) so tests do not share cache. */
export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { client, view: render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

/** Replaces global fetch with a router function; returns the jest mock for assertions. */
export function mockFetch(handler: { current: Handler }) {
  const fn = jest.fn((input: string | URL, init: RequestInit = {}) =>
    Promise.resolve(handler.current(new URL(String(input)), init)),
  );
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}
