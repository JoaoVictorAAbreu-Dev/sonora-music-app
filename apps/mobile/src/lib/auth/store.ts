import { Platform } from 'react-native';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { LoginBody, RegisterBody, SocialBody, TokenPair, User } from '@sonora/shared';
import { createApiClient, ApiRequestError, type ApiClient } from '../api/client';
import { createAuthApi, type AuthApi } from '../api/auth-api';
import { API_URL } from '../config';
import { secureTokenStorage, type TokenStorage } from './token-storage';

export type AuthStatus = 'bootstrapping' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** Kept in memory only; never persisted. */
  accessToken: string | null;
  /** Epoch ms when the access token expires (null when unknown). */
  accessTokenExpiresAt: number | null;
  bootstrap(): Promise<void>;
  signIn(body: Omit<LoginBody, 'device'>): Promise<void>;
  signUp(body: Omit<RegisterBody, 'device'>): Promise<void>;
  /** Google/Apple: the native SDK's ID token, verified by the API (M6). */
  signInWithProvider(body: Omit<SocialBody, 'device'>): Promise<void>;
  signOut(): Promise<void>;
  /** Deletes the account on the server, then clears the local session. */
  deleteAccount(): Promise<void>;
  /** Used by the API client on 401: true when a new access token was obtained. */
  refreshSession(): Promise<boolean>;
  /** Drops the local session without calling the API (refresh already failed). */
  expireSession(): void;
  /**
   * An access token valid for at least another minute, refreshing first if needed. Used where the
   * request is made outside the API client (the audio player's stream request).
   */
  getFreshAccessToken(): Promise<string | null>;
}

/** Refresh this long before expiry so a request never leaves with an expiring token. */
const EXPIRY_MARGIN_MS = 60_000;

/** Codes meaning the stored refresh token can never work again. */
const SESSION_GONE = new Set(['UNAUTHORIZED', 'TOKEN_EXPIRED', 'TOKEN_REUSED']);

const device = `${Platform.OS}`;

export function createAuthStore(deps: {
  api: AuthApi;
  storage: TokenStorage;
  /** Clears per-user caches (queries, player) when the session ends. */
  onSignedOut?: () => void;
}): StoreApi<AuthState> {
  const { api, storage } = deps;

  return createStore<AuthState>()((set, get) => {
    async function adopt(user: User, tokens: TokenPair) {
      await storage.setRefreshToken(tokens.refreshToken);
      await storage.setUser(user);
      set({
        status: 'signedIn',
        user,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: Date.parse(tokens.accessTokenExpiresAt),
      });
    }

    async function clearLocal() {
      set({ status: 'signedOut', user: null, accessToken: null, accessTokenExpiresAt: null });
      deps.onSignedOut?.();
      await storage.clear().catch(() => undefined);
    }

    return {
      status: 'bootstrapping',
      user: null,
      accessToken: null,
      accessTokenExpiresAt: null,

      async bootstrap() {
        const [refreshToken, cachedUser] = await Promise.all([
          storage.getRefreshToken(),
          storage.getUser(),
        ]);
        if (!refreshToken) {
          set({ status: 'signedOut' });
          return;
        }
        try {
          if (!(await get().refreshSession())) return; // refreshSession already signed out
          const { user } = await api.me();
          await storage.setUser(user);
          set({ status: 'signedIn', user });
        } catch (err) {
          // Offline at launch: stay signed in with the cached profile; requests refresh lazily.
          if (err instanceof ApiRequestError && err.code === 'NETWORK_ERROR' && cachedUser) {
            set({ status: 'signedIn', user: cachedUser });
            return;
          }
          await clearLocal();
        }
      },

      async signIn(body) {
        const res = await api.login({ ...body, device });
        await adopt(res.user, res.tokens);
      },

      async signUp(body) {
        const res = await api.register({ ...body, device });
        await adopt(res.user, res.tokens);
      },

      async signInWithProvider(body) {
        const res = await api.social({ ...body, device });
        await adopt(res.user, res.tokens);
      },

      async signOut() {
        const refreshToken = await storage.getRefreshToken().catch(() => null);
        await clearLocal();
        // Best effort: the local session is gone even if the server call fails.
        if (refreshToken) await api.logout(refreshToken).catch(() => undefined);
      },

      async deleteAccount() {
        await api.deleteMe();
        await clearLocal();
      },

      async refreshSession() {
        const refreshToken = await storage.getRefreshToken();
        if (!refreshToken) {
          await clearLocal();
          return false;
        }
        try {
          const { tokens } = await api.refresh(refreshToken);
          await storage.setRefreshToken(tokens.refreshToken);
          set({
            accessToken: tokens.accessToken,
            accessTokenExpiresAt: Date.parse(tokens.accessTokenExpiresAt),
          });
          return true;
        } catch (err) {
          if (err instanceof ApiRequestError && SESSION_GONE.has(err.code)) {
            await clearLocal();
            return false;
          }
          throw err;
        }
      },

      expireSession() {
        void clearLocal();
      },

      async getFreshAccessToken() {
        const { accessToken, accessTokenExpiresAt, status } = get();
        if (status !== 'signedIn') return null;
        const fresh =
          accessToken &&
          accessTokenExpiresAt &&
          accessTokenExpiresAt - Date.now() > EXPIRY_MARGIN_MS;
        if (fresh) return accessToken;
        return (await get().refreshSession()) ? get().accessToken : null;
      },
    };
  });
}

const signedOutListeners = new Set<() => void>();

/** Registers cleanup to run whenever the session ends (sign-out, revoked session). */
export function onSignedOut(listener: () => void): () => void {
  signedOutListeners.add(listener);
  return () => signedOutListeners.delete(listener);
}

/** App-wide instances. The client reads the store lazily (at request time) to break the cycle. */
export const apiClient: ApiClient = createApiClient({
  baseUrl: API_URL,
  session: {
    getAccessToken: () => store.getState().accessToken,
    refresh: () => store.getState().refreshSession(),
    onSessionExpired: () => store.getState().expireSession(),
  },
});

export const authApi = createAuthApi(apiClient);
const store = createAuthStore({
  api: authApi,
  storage: secureTokenStorage,
  onSignedOut: () => signedOutListeners.forEach((l) => l()),
});
export const authStore = store;

export function useAuth<T>(selector: (s: AuthState) => T): T {
  return useStore(authStore, selector);
}
