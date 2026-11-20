/* Jest setup: in-memory secure store and Reanimated test mode. */
const mockSecureStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async (k: string) => mockSecureStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecureStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecureStore.delete(k);
  }),
  __store: mockSecureStore,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-track-player', () => {
  const fn = () => jest.fn(async () => undefined);
  return {
    __esModule: true,
    default: {
      setupPlayer: fn(),
      updateOptions: fn(),
      load: fn(),
      play: fn(),
      pause: fn(),
      stop: fn(),
      seekTo: fn(),
      setVolume: fn(),
      getPosition: jest.fn(async () => 0),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      registerPlaybackService: jest.fn(),
    },
    useProgress: jest.fn(() => ({ position: 84, duration: 221, buffered: 100 })),
    Capability: {},
    AppKilledPlaybackBehavior: {},
    Event: { PlaybackProgressUpdated: 'playback-progress-updated' },
    IOSCategory: { Playback: 'playback' },
    State: {
      None: 'none',
      Ready: 'ready',
      Playing: 'playing',
      Paused: 'paused',
      Stopped: 'stopped',
      Loading: 'loading',
      Buffering: 'buffering',
      Error: 'error',
      Ended: 'ended',
    },
  };
});

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

require('react-native-reanimated').setUpTests();
