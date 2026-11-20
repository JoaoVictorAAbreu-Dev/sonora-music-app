import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  favoriteIdsResponseSchema,
  favoritesResponseSchema,
  playlistDetailResponseSchema,
  playlistResponseSchema,
  playlistsResponseSchema,
  type CreatePlaylistBody,
  type UpdatePlaylistBody,
} from '@sonora/shared';
import { apiClient } from '@/lib/auth/store';

export const libraryKeys = {
  favoriteIds: ['library', 'favorite-ids'] as const,
  favorites: ['library', 'favorites'] as const,
  playlists: ['library', 'playlists'] as const,
  playlist: (id: string) => ['library', 'playlist', id] as const,
};

export const libraryApi = {
  favoriteIds: (signal?: AbortSignal) =>
    apiClient.request('/v1/favorites/ids', { schema: favoriteIdsResponseSchema, signal }),
  favorites: (before: string | null, signal?: AbortSignal) => {
    const qs = new URLSearchParams({ limit: '50', ...(before ? { before } : {}) });
    return apiClient.request(`/v1/favorites?${qs.toString()}`, {
      schema: favoritesResponseSchema,
      signal,
    });
  },
  setFavorite: (trackId: string, on: boolean) =>
    apiClient.request(`/v1/favorites/${trackId}`, { method: on ? 'PUT' : 'DELETE' }),
  playlists: (signal?: AbortSignal) =>
    apiClient.request('/v1/playlists', { schema: playlistsResponseSchema, signal }),
  playlist: (id: string, signal?: AbortSignal) =>
    apiClient.request(`/v1/playlists/${id}`, { schema: playlistDetailResponseSchema, signal }),
  createPlaylist: (body: CreatePlaylistBody) =>
    apiClient.request('/v1/playlists', { method: 'POST', body, schema: playlistResponseSchema }),
  updatePlaylist: (id: string, body: UpdatePlaylistBody) =>
    apiClient.request(`/v1/playlists/${id}`, {
      method: 'PATCH',
      body,
      schema: playlistResponseSchema,
    }),
  deletePlaylist: (id: string) => apiClient.request(`/v1/playlists/${id}`, { method: 'DELETE' }),
  addToPlaylist: (id: string, trackId: string) =>
    apiClient.request(`/v1/playlists/${id}/tracks`, { method: 'POST', body: { trackId } }),
  removeFromPlaylist: (id: string, entryId: string) =>
    apiClient.request(`/v1/playlists/${id}/tracks/${entryId}`, { method: 'DELETE' }),
  reorderPlaylist: (id: string, entryIds: string[]) =>
    apiClient.request(`/v1/playlists/${id}/order`, { method: 'PUT', body: { entryIds } }),
};

export function useFavoriteIds() {
  return useQuery({
    queryKey: libraryKeys.favoriteIds,
    queryFn: ({ signal }) => libraryApi.favoriteIds(signal),
    select: (d) => new Set(d.ids),
  });
}

/** Optimistic heart toggle: the icon flips at once and rolls back on failure. */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trackId, on }: { trackId: string; on: boolean }) =>
      libraryApi.setFavorite(trackId, on),
    onMutate: async ({ trackId, on }) => {
      await qc.cancelQueries({ queryKey: libraryKeys.favoriteIds });
      const previous = qc.getQueryData<{ ids: string[] }>(libraryKeys.favoriteIds);
      const ids = previous?.ids ?? [];
      qc.setQueryData(libraryKeys.favoriteIds, {
        ids: on ? [trackId, ...ids.filter((i) => i !== trackId)] : ids.filter((i) => i !== trackId),
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(libraryKeys.favoriteIds, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: libraryKeys.favoriteIds });
      void qc.invalidateQueries({ queryKey: libraryKeys.favorites });
    },
  });
}

export function useFavorites() {
  return useInfiniteQuery({
    queryKey: libraryKeys.favorites,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => libraryApi.favorites(pageParam, signal),
    getNextPageParam: (last) => last.nextBefore,
  });
}

export function usePlaylists() {
  return useQuery({
    queryKey: libraryKeys.playlists,
    queryFn: ({ signal }) => libraryApi.playlists(signal),
  });
}

export function usePlaylist(id: string) {
  return useQuery({
    queryKey: libraryKeys.playlist(id),
    queryFn: ({ signal }) => libraryApi.playlist(id, signal),
  });
}

/** Invalidates the playlist list and one playlist after a change. */
export function useInvalidatePlaylists() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: libraryKeys.playlists });
    if (id) void qc.invalidateQueries({ queryKey: libraryKeys.playlist(id) });
  };
}
