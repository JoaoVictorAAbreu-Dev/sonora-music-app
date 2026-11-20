import { ApiRequestError } from '@/lib/api/client';
import type { AuthApi } from '@/lib/api/auth-api';
import { createAuthStore } from '@/lib/auth/store';
import type { TokenStorage } from '@/lib/auth/token-storage';
import { tokens, user } from './fixtures';

function memoryStorage(initial: { refresh?: string; user?: typeof user } = {}) {
  let refresh = initial.refresh ?? null;
  let cached = initial.user ?? null;
  const storage: TokenStorage = {
    getRefreshToken: async () => refresh,
    setRefreshToken: async (t) => {
      refresh = t;
    },
    getUser: async () => cached,
    setUser: async (u) => {
      cached = u;
    },
    clear: async () => {
      refresh = null;
      cached = null;
    },
  };
  return { storage, peek: () => ({ refresh, cached }) };
}

function fakeApi(overrides: Partial<Record<keyof AuthApi, jest.Mock>> = {}) {
  return {
    register: jest.fn(async () => ({ user, tokens: tokens(1) })),
    login: jest.fn(async () => ({ user, tokens: tokens(1) })),
    social: jest.fn(async () => ({ user, tokens: tokens(1) })),
    refresh: jest.fn(async () => ({ tokens: tokens(2) })),
    logout: jest.fn(async () => undefined),
    me: jest.fn(async () => ({ user })),
    updateMe: jest.fn(),
    ...overrides,
  } as unknown as AuthApi & Record<keyof AuthApi, jest.Mock>;
}

const gone = (code: 'TOKEN_REUSED' | 'UNAUTHORIZED') => new ApiRequestError(code, code, 401);

describe('auth store', () => {
  it('signs in: refresh token persisted, access token only in memory', async () => {
    const { storage, peek } = memoryStorage();
    const api = fakeApi();
    const store = createAuthStore({ api, storage });
    await store.getState().signIn({ email: user.email, password: 'pw' });
    expect(api.login).toHaveBeenCalledWith(expect.objectContaining({ device: expect.any(String) }));
    expect(store.getState()).toMatchObject({ status: 'signedIn', user, accessToken: 'access-1' });
    expect(peek().refresh).toBe(tokens(1).refreshToken);
    expect(JSON.stringify(peek())).not.toContain('access-1');
  });

  it('signs up the same way', async () => {
    const { storage } = memoryStorage();
    const store = createAuthStore({ api: fakeApi(), storage });
    await store.getState().signUp({ email: user.email, password: 'pw', acceptTerms: true });
    expect(store.getState().status).toBe('signedIn');
  });

  it('signs in with a provider ID token (M6)', async () => {
    const { storage } = memoryStorage();
    const api = fakeApi();
    const store = createAuthStore({ api, storage });
    await store.getState().signInWithProvider({ provider: 'apple', idToken: 'x'.repeat(40) });
    expect(api.social).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'apple', device: expect.any(String) }),
    );
    expect(store.getState().status).toBe('signedIn');
  });

  it('signs out locally even when the server call fails', async () => {
    const { storage, peek } = memoryStorage({ refresh: 'r'.repeat(43), user });
    const api = fakeApi({ logout: jest.fn(async () => Promise.reject(new Error('offline'))) });
    const store = createAuthStore({ api, storage });
    store.setState({ status: 'signedIn', user, accessToken: 'a' });
    await store.getState().signOut();
    expect(api.logout).toHaveBeenCalledWith('r'.repeat(43));
    expect(store.getState()).toMatchObject({ status: 'signedOut', user: null, accessToken: null });
    expect(peek()).toEqual({ refresh: null, cached: null });
  });

  describe('bootstrap', () => {
    it('is signed out without a stored token', async () => {
      const store = createAuthStore({ api: fakeApi(), storage: memoryStorage().storage });
      await store.getState().bootstrap();
      expect(store.getState().status).toBe('signedOut');
    });

    it('restores the session by rotating the stored refresh token', async () => {
      const { storage, peek } = memoryStorage({ refresh: tokens(1).refreshToken });
      const api = fakeApi();
      const store = createAuthStore({ api, storage });
      await store.getState().bootstrap();
      expect(api.refresh).toHaveBeenCalledWith(tokens(1).refreshToken);
      expect(store.getState()).toMatchObject({ status: 'signedIn', user, accessToken: 'access-2' });
      expect(peek().refresh).toBe(tokens(2).refreshToken);
    });

    it('signs out and clears storage when the session was revoked', async () => {
      const { storage, peek } = memoryStorage({ refresh: tokens(1).refreshToken, user });
      const api = fakeApi({ refresh: jest.fn(async () => Promise.reject(gone('TOKEN_REUSED'))) });
      const store = createAuthStore({ api, storage });
      await store.getState().bootstrap();
      expect(store.getState().status).toBe('signedOut');
      expect(peek().refresh).toBeNull();
    });

    it('stays signed in offline with the cached profile', async () => {
      const { storage, peek } = memoryStorage({ refresh: tokens(1).refreshToken, user });
      const api = fakeApi({
        refresh: jest.fn(async () =>
          Promise.reject(new ApiRequestError('NETWORK_ERROR', 'offline', 0)),
        ),
      });
      const store = createAuthStore({ api, storage });
      await store.getState().bootstrap();
      expect(store.getState()).toMatchObject({ status: 'signedIn', user, accessToken: null });
      expect(peek().refresh).toBe(tokens(1).refreshToken);
    });
  });

  it('refreshSession reports failure without throwing when the session is gone', async () => {
    const { storage } = memoryStorage({ refresh: tokens(1).refreshToken });
    const api = fakeApi({ refresh: jest.fn(async () => Promise.reject(gone('UNAUTHORIZED'))) });
    const store = createAuthStore({ api, storage });
    store.setState({ status: 'signedIn', user, accessToken: 'a' });
    await expect(store.getState().refreshSession()).resolves.toBe(false);
    expect(store.getState().status).toBe('signedOut');
  });
});

describe('deleteAccount', () => {
  it('deletes on the server and clears the local session', async () => {
    const { storage, peek } = memoryStorage({ refresh: tokens(1).refreshToken, user });
    const api = fakeApi({ deleteMe: jest.fn(async () => undefined) });
    const store = createAuthStore({ api, storage });
    store.setState({ status: 'signedIn', user, accessToken: 'a' });
    await store.getState().deleteAccount();
    expect(api.deleteMe).toHaveBeenCalled();
    expect(store.getState().status).toBe('signedOut');
    expect(peek().refresh).toBeNull();
  });

  it('keeps the session when the server call fails', async () => {
    const { storage } = memoryStorage({ refresh: tokens(1).refreshToken, user });
    const api = fakeApi({ deleteMe: jest.fn(async () => Promise.reject(new Error('offline'))) });
    const store = createAuthStore({ api, storage });
    store.setState({ status: 'signedIn', user, accessToken: 'a' });
    await expect(store.getState().deleteAccount()).rejects.toThrow('offline');
    expect(store.getState().status).toBe('signedIn');
  });
});

describe('getFreshAccessToken', () => {
  it('returns the current token while it is valid and refreshes near expiry', async () => {
    const { storage } = memoryStorage({ refresh: tokens(1).refreshToken });
    const api = fakeApi();
    const store = createAuthStore({ api, storage });
    store.setState({
      status: 'signedIn',
      user,
      accessToken: 'still-good',
      accessTokenExpiresAt: Date.now() + 10 * 60_000,
    });
    await expect(store.getState().getFreshAccessToken()).resolves.toBe('still-good');
    expect(api.refresh).not.toHaveBeenCalled();

    store.setState({ accessTokenExpiresAt: Date.now() + 30_000 });
    await expect(store.getState().getFreshAccessToken()).resolves.toBe('access-2');
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('returns null when signed out', async () => {
    const store = createAuthStore({ api: fakeApi(), storage: memoryStorage().storage });
    store.setState({ status: 'signedOut' });
    await expect(store.getState().getFreshAccessToken()).resolves.toBeNull();
  });
});
