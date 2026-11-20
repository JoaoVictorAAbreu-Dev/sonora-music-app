import { useStore } from 'zustand';
import { API_URL } from '@/lib/config';
import { recordPlay } from './history-api';
import { authStore, onSignedOut } from '@/lib/auth/store';
import { rntpEngine, subscribeEngineEvents } from './rntp-engine';
import { createPlayerStore, type PlayerState } from './store';

/** The app's single player. */
export const playerStore = createPlayerStore({
  engine: rntpEngine,
  streamUrl: (path) => `${API_URL}${path}`,
  getAccessToken: () => authStore.getState().getFreshAccessToken(),
  reportPlay: recordPlay,
});

let unsubscribe: (() => void) | null = null;

/** Connects engine events to the store once (called from the root layout). */
export function connectPlayer() {
  unsubscribe ??= subscribeEngineEvents({
    onState: (s) => playerStore.getState().onEngineState(s),
    onError: (m) => playerStore.getState().onEngineError(m),
    onEnded: () => void playerStore.getState().onTrackEnded(),
    onProgress: (p) => playerStore.getState().onProgress(p),
  });
  return () => {
    unsubscribe?.();
    unsubscribe = null;
  };
}

onSignedOut(() => void playerStore.getState().reset());

export function usePlayer<T>(selector: (s: PlayerState) => T): T {
  return useStore(playerStore, selector);
}
