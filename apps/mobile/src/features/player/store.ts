import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { Track } from '@sonora/shared';
import type { EngineState, PlayerEngine } from './engine';

export type RepeatMode = 'off' | 'all' | 'one';
export type PlayerStatus = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error';

/** "Anterior" restarts the current track when more than this has played. */
export const RESTART_THRESHOLD_SECONDS = 3;

export interface PlayerState {
  /** Play order (shuffled when shuffle is on). */
  queue: Track[];
  /** The list as the user started it, to restore order when shuffle is turned off. */
  original: Track[];
  index: number;
  status: PlayerStatus;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  error: string | null;

  current(): Track | null;
  playList(list: Track[], startIndex: number): Promise<void>;
  togglePlay(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(seconds: number): Promise<void>;
  seekBy(offset: number): Promise<void>;
  setVolume(level: number): Promise<void>;
  toggleShuffle(): void;
  cycleRepeat(): void;
  retry(): Promise<void>;
  /** Engine callbacks. */
  onEngineState(state: EngineState): void;
  onEngineError(message: string): void;
  onTrackEnded(): Promise<void>;
  /** Stops playback and forgets the queue (sign-out). */
  reset(): Promise<void>;
}

export interface PlayerDeps {
  engine: PlayerEngine;
  /** Absolute stream URL for a track path (API base URL + streamPath). */
  streamUrl(path: string): string;
  /** A valid access token for the stream request, or null when signed out. */
  getAccessToken(): Promise<string | null>;
  random?: () => number;
}

/** Fisher–Yates over a copy. */
export function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

const repeatOrder: RepeatMode[] = ['off', 'all', 'one'];

export function createPlayerStore(deps: PlayerDeps): StoreApi<PlayerState> {
  const random = deps.random ?? Math.random;

  return createStore<PlayerState>()((set, get) => {
    /** Loads queue[index] into the engine with a fresh token, then plays. */
    async function loadAndPlay(index: number) {
      const track = get().queue[index];
      if (!track) return;
      set({ index, status: 'loading', error: null });
      try {
        await deps.engine.setup();
        const token = await deps.getAccessToken();
        if (!token) throw new Error('signed out');
        await deps.engine.load({
          id: track.id,
          url: deps.streamUrl(track.streamPath),
          title: track.title,
          artist: track.artist.name,
          artwork: track.artworkUrl ?? undefined,
          duration: track.durationSeconds || undefined,
          headers: { Authorization: `Bearer ${token}` },
        });
        // Another track may have been chosen while this one was loading.
        if (get().queue[get().index]?.id !== track.id) return;
        await deps.engine.setVolume(get().volume);
        await deps.engine.play();
      } catch (err) {
        set({ status: 'error', error: err instanceof Error ? err.message : 'playback failed' });
      }
    }

    return {
      queue: [],
      original: [],
      index: 0,
      status: 'idle',
      shuffle: false,
      repeat: 'off',
      volume: 1,
      error: null,

      current: () => get().queue[get().index] ?? null,

      async playList(list, startIndex) {
        if (list.length === 0) return;
        const start = Math.min(Math.max(startIndex, 0), list.length - 1);
        const first = list[start];
        if (get().shuffle && first) {
          const rest = shuffled(
            list.filter((_, i) => i !== start),
            random,
          );
          set({ original: list, queue: [first, ...rest] });
          return loadAndPlay(0);
        }
        set({ original: list, queue: list });
        return loadAndPlay(start);
      },

      async togglePlay() {
        const { status, queue, index } = get();
        if (!queue.length) return;
        if (status === 'playing' || status === 'buffering') {
          set({ status: 'paused' });
          return deps.engine.pause();
        }
        if (status === 'error' || status === 'idle') return loadAndPlay(index);
        await deps.engine.play();
      },

      async next() {
        const { queue, index, repeat } = get();
        if (!queue.length) return;
        if (index < queue.length - 1) return loadAndPlay(index + 1);
        if (repeat === 'all') return loadAndPlay(0);
        // End of the list without repeat: stay on the last track, paused at the start.
        await deps.engine.pause();
        await deps.engine.seekTo(0);
        set({ status: 'paused' });
      },

      async previous() {
        const { queue, index, repeat } = get();
        if (!queue.length) return;
        const position = await deps.engine.getPosition().catch(() => 0);
        if (position > RESTART_THRESHOLD_SECONDS || (index === 0 && repeat !== 'all')) {
          return deps.engine.seekTo(0);
        }
        return loadAndPlay(index === 0 ? queue.length - 1 : index - 1);
      },

      seek: (seconds) => deps.engine.seekTo(Math.max(0, seconds)),

      async seekBy(offset) {
        const position = await deps.engine.getPosition().catch(() => 0);
        const track = get().current();
        const max = track?.durationSeconds || Number.POSITIVE_INFINITY;
        return deps.engine.seekTo(Math.min(Math.max(0, position + offset), max));
      },

      async setVolume(level) {
        const volume = Math.min(1, Math.max(0, level));
        set({ volume });
        await deps.engine.setVolume(volume);
      },

      toggleShuffle() {
        const { shuffle, queue, original, index } = get();
        const current = queue[index];
        if (!current) {
          set({ shuffle: !shuffle });
          return;
        }
        if (!shuffle) {
          // Keep the current track first; shuffle everything else.
          const rest = shuffled(
            original.filter((t) => t.id !== current.id),
            random,
          );
          set({ shuffle: true, queue: [current, ...rest], index: 0 });
        } else {
          set({
            shuffle: false,
            queue: original,
            index: Math.max(
              0,
              original.findIndex((t) => t.id === current.id),
            ),
          });
        }
      },

      cycleRepeat() {
        const i = repeatOrder.indexOf(get().repeat);
        set({ repeat: repeatOrder[(i + 1) % repeatOrder.length] ?? 'off' });
      },

      retry: () => loadAndPlay(get().index),

      onEngineState(state) {
        if (state === 'ended' || state === 'idle') return;
        if (state === 'error') {
          set({ status: 'error' });
          return;
        }
        set({ status: state });
      },

      onEngineError(message) {
        set({ status: 'error', error: message });
      },

      async onTrackEnded() {
        const { repeat, index } = get();
        if (repeat === 'one') return loadAndPlay(index);
        return get().next();
      },

      async reset() {
        set({ queue: [], original: [], index: 0, status: 'idle', error: null });
        await deps.engine.stop().catch(() => undefined);
      },
    };
  });
}

/** React binding for any player store instance. */
export function usePlayerStore<T>(
  store: StoreApi<PlayerState>,
  selector: (s: PlayerState) => T,
): T {
  return useStore(store, selector);
}
