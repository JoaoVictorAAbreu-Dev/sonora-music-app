import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReducedMotion } from 'react-native-reanimated';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** T18 Configurações, stored on the device. */
export interface SettingsState {
  /** "Reprodução contínua": go to the next track when one ends. */
  continuousPlayback: boolean;
  /** App-level overrides on top of the system accessibility settings. */
  reduceTransparency: boolean;
  reduceMotion: boolean;
  set<K extends 'continuousPlayback' | 'reduceTransparency' | 'reduceMotion'>(
    key: K,
    value: boolean,
  ): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      continuousPlayback: true,
      reduceTransparency: false,
      reduceMotion: false,
      set: (key, value) => set({ [key]: value } as Pick<SettingsState, typeof key>),
    }),
    {
      name: 'sonora.settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ continuousPlayback, reduceTransparency, reduceMotion }) => ({
        continuousPlayback,
        reduceTransparency,
        reduceMotion,
      }),
    },
  ),
);

/** True when the system or the in-app setting asks for less motion. */
export function useMotionReduced(): boolean {
  const system = useReducedMotion();
  const app = useSettings((s) => s.reduceMotion);
  return system || app;
}
