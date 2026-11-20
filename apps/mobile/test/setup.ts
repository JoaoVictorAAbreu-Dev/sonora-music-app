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

require('react-native-reanimated').setUpTests();
