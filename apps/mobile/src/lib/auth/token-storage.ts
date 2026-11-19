import * as SecureStore from 'expo-secure-store';
import { userSchema, type User } from '@sonora/shared';

const REFRESH_KEY = 'sonora.refreshToken';
const USER_KEY = 'sonora.user';

/** Persists only the refresh token (Keychain/Keystore) and the last known profile. */
export interface TokenStorage {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  getUser(): Promise<User | null>;
  setUser(user: User): Promise<void>;
  clear(): Promise<void>;
}

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const secureTokenStorage: TokenStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY, options),
  setRefreshToken: (token) => SecureStore.setItemAsync(REFRESH_KEY, token, options),
  async getUser() {
    const raw = await SecureStore.getItemAsync(USER_KEY, options);
    if (!raw) return null;
    try {
      const parsed = userSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user), options),
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(REFRESH_KEY, options),
      SecureStore.deleteItemAsync(USER_KEY, options),
    ]);
  },
};
