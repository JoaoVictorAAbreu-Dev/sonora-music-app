import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { onSignedOut } from '@/lib/auth/store';

export const MAX_RECENT_SEARCHES = 5;

interface RecentSearchesState {
  items: string[];
  add(query: string): void;
  remove(query: string): void;
  clear(): void;
}

/** "Buscas recentes" (T06 initial state), newest first, case-insensitively unique, on device only. */
export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set) => ({
      items: [],
      add: (query) =>
        set((s) => {
          const q = query.trim();
          if (!q) return s;
          const rest = s.items.filter((i) => i.toLowerCase() !== q.toLowerCase());
          return { items: [q, ...rest].slice(0, MAX_RECENT_SEARCHES) };
        }),
      remove: (query) => set((s) => ({ items: s.items.filter((i) => i !== query) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'sonora.recentSearches', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// Recent searches belong to the person who made them.
onSignedOut(() => useRecentSearches.getState().clear());
