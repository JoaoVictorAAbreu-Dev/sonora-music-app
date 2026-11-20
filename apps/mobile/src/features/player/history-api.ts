import { useInfiniteQuery } from '@tanstack/react-query';
import { historyResponseSchema } from '@sonora/shared';
import { apiClient } from '@/lib/auth/store';

export const historyKey = ['history'] as const;

/** POST /v1/history (called by the player after a real listen). */
export async function recordPlay(trackId: string): Promise<void> {
  await apiClient.request('/v1/history', { method: 'POST', body: { trackId } });
}

/** Paged listening history for Biblioteca › Histórico. */
export function useHistory() {
  return useInfiniteQuery({
    queryKey: historyKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const qs = new URLSearchParams({ limit: '30', ...(pageParam ? { before: pageParam } : {}) });
      return apiClient.request(`/v1/history?${qs.toString()}`, {
        schema: historyResponseSchema,
        signal,
      });
    },
    getNextPageParam: (last) => last.nextBefore,
  });
}
