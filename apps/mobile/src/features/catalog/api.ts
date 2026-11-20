import { useQuery } from '@tanstack/react-query';
import {
  albumResponseSchema,
  artistResponseSchema,
  homeResponseSchema,
  searchResponseSchema,
  trackResponseSchema,
  type SearchType,
} from '@sonora/shared';
import type { ApiClient } from '@/lib/api/client';
import { apiClient } from '@/lib/auth/store';

export function createCatalogApi(client: ApiClient) {
  return {
    home: (signal?: AbortSignal) =>
      client.request('/v1/home', { schema: homeResponseSchema, signal }),
    search: (q: string, type: SearchType, signal?: AbortSignal) => {
      const qs = new URLSearchParams({ q, type, limit: type === 'all' ? '10' : '30' });
      return client.request(`/v1/search?${qs.toString()}`, {
        schema: searchResponseSchema,
        signal,
      });
    },
    track: (id: string) => client.request(`/v1/tracks/${id}`, { schema: trackResponseSchema }),
    album: (id: string) => client.request(`/v1/albums/${id}`, { schema: albumResponseSchema }),
    artist: (id: string) => client.request(`/v1/artists/${id}`, { schema: artistResponseSchema }),
  };
}

export const catalogApi = createCatalogApi(apiClient);

export const catalogKeys = {
  home: ['catalog', 'home'] as const,
  search: (q: string, type: SearchType) => ['catalog', 'search', type, q] as const,
  album: (id: string) => ['catalog', 'album', id] as const,
  artist: (id: string) => ['catalog', 'artist', id] as const,
};

export function useHome() {
  return useQuery({ queryKey: catalogKeys.home, queryFn: ({ signal }) => catalogApi.home(signal) });
}

/** Runs only for a non-empty (already debounced) query. */
export function useSearch(q: string, type: SearchType) {
  const query = q.trim();
  return useQuery({
    queryKey: catalogKeys.search(query, type),
    queryFn: ({ signal }) => catalogApi.search(query, type, signal),
    enabled: query.length > 0,
  });
}

export function useAlbum(id: string) {
  return useQuery({
    queryKey: catalogKeys.album(id),
    queryFn: () => catalogApi.album(id).then((r) => r.album),
  });
}

export function useArtist(id: string) {
  return useQuery({
    queryKey: catalogKeys.artist(id),
    queryFn: () => catalogApi.artist(id).then((r) => r.artist),
  });
}
