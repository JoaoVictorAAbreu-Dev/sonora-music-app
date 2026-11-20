import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { PlaylistSummary } from '@sonora/shared';
import { FavoriteButton } from '@/features/library/FavoriteButton';
import { LibraryScreen } from '@/features/library/LibraryScreen';
import { PlaylistEditScreen } from '@/features/library/PlaylistEditScreen';
import { PlaylistScreen } from '@/features/library/PlaylistScreen';
import { TrackActionsHost, useTrackActions } from '@/features/library/track-actions';
import { playerStore } from '@/features/player';
import { ToastHost, useToast } from '@/features/ui/toast';
import { authStore } from '@/lib/auth/store';
import { json } from './fixtures';
import { track } from './catalog-fixtures';
import { mockFetch, renderWithQuery } from './render';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: (...a: unknown[]) => mockReplace(...a),
    back: () => mockBack(),
    navigate: jest.fn(),
    dismissAll: jest.fn(),
  },
}));

const summary = (id: string, name: string, trackCount = 2): PlaylistSummary => ({
  id,
  name,
  description: null,
  trackCount,
  artworkUrl: null,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
});
const P1 = '11111111-1111-4111-8111-111111111111';
const E1 = '22222222-2222-4222-8222-222222222222';
const E2 = '33333333-3333-4333-8333-333333333333';

const handler: { current: (url: URL, init: RequestInit) => Response } = {
  current: () => json(404),
};
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = mockFetch(handler);
  authStore.setState({
    status: 'signedIn',
    accessToken: 'tok',
    accessTokenExpiresAt: Date.now() + 600_000,
  });
  useToast.setState({ message: null });
  jest.clearAllMocks();
});

const calls = (method: string, path: string) =>
  fetchMock.mock.calls.filter(
    ([u, i]) =>
      new URL(String(u)).pathname === path && ((i as RequestInit)?.method ?? 'GET') === method,
  );

describe('FavoriteButton', () => {
  it('toggles optimistically and calls the API', async () => {
    let favored: string[] = [];
    handler.current = (url, init) => {
      if (url.pathname === '/v1/favorites/ids') return json(200, { ids: favored });
      if (url.pathname === '/v1/favorites/7') {
        favored = init.method === 'PUT' ? ['7'] : [];
        return json(204);
      }
      return json(404);
    };
    await renderWithQuery(<FavoriteButton trackId="7" title="Synthetic Track 7" />).view;
    const button = await screen.findByLabelText('Favoritar Synthetic Track 7');
    await waitFor(() => expect(button).not.toBeSelected());
    await fireEvent.press(button);
    expect(screen.getByLabelText('Favoritar Synthetic Track 7')).toBeSelected();
    await waitFor(() => expect(calls('PUT', '/v1/favorites/7')).toHaveLength(1));
    await fireEvent.press(screen.getByLabelText('Favoritar Synthetic Track 7'));
    await waitFor(() => expect(calls('DELETE', '/v1/favorites/7')).toHaveLength(1));
  });

  it('rolls back when the API fails', async () => {
    handler.current = (url) =>
      url.pathname === '/v1/favorites/ids'
        ? json(200, { ids: [] })
        : json(500, { error: { code: 'INTERNAL', message: 'x' } });
    await renderWithQuery(<FavoriteButton trackId="8" title="T8" />).view;
    await fireEvent.press(await screen.findByLabelText('Favoritar T8'));
    await waitFor(() => expect(screen.getByLabelText('Favoritar T8')).not.toBeSelected());
  });
});

describe('Library hub (T07)', () => {
  it('lists favorites count and playlists', async () => {
    handler.current = (url) => {
      if (url.pathname === '/v1/favorites/ids') return json(200, { ids: ['1', '2', '3'] });
      if (url.pathname === '/v1/playlists')
        return json(200, { playlists: [summary(P1, 'Foco profundo', 12)] });
      return json(404);
    };
    await renderWithQuery(<LibraryScreen />).view;
    expect(await screen.findByLabelText('Favoritos, 3 faixas')).toBeTruthy();
    await fireEvent.press(await screen.findByLabelText('Foco profundo, 12 faixas'));
    expect(mockPush).toHaveBeenCalledWith(`/playlist/${P1}`);
    await fireEvent.press(screen.getByTestId('library-new-playlist'));
    expect(mockPush).toHaveBeenCalledWith('/playlist-edit');
  });
});

describe('Create / edit playlist (T16)', () => {
  it('validates the name, creates, adds the pending track and opens it', async () => {
    handler.current = (url, init) => {
      if (url.pathname === '/v1/playlists' && init.method === 'POST') {
        return json(201, { playlist: summary(P1, 'Noite de chuva', 0) });
      }
      if (url.pathname === `/v1/playlists/${P1}/tracks`) return json(201, {});
      return json(404);
    };
    await renderWithQuery(<PlaylistEditScreen addTrack="42" />).view;
    await fireEvent.press(screen.getByTestId('playlist-save'));
    expect(screen.getByText('⚠ Dê um nome para a playlist.')).toBeTruthy();
    expect(calls('POST', '/v1/playlists')).toHaveLength(0);

    await fireEvent.changeText(screen.getByTestId('playlist-name-input'), 'Noite de chuva');
    await fireEvent.press(screen.getByTestId('playlist-save'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(`/playlist/${P1}`));
    expect(JSON.parse(String(calls('POST', `/v1/playlists/${P1}/tracks`)[0]![1].body))).toEqual({
      trackId: '42',
    });
    expect(useToast.getState().message).toBe('Playlist criada');
  });

  it('explains the playlist limit', async () => {
    handler.current = () => json(422, { error: { code: 'LIMIT_REACHED', message: 'max' } });
    await renderWithQuery(<PlaylistEditScreen />).view;
    await fireEvent.changeText(screen.getByTestId('playlist-name-input'), 'Mais uma');
    await fireEvent.press(screen.getByTestId('playlist-save'));
    expect(await screen.findByText('⚠ Você atingiu o limite de playlists.')).toBeTruthy();
  });
});

describe('Playlist (T10)', () => {
  const detail = {
    playlist: summary(P1, 'Foco profundo', 2),
    entries: [
      { entryId: E1, position: 0, trackId: '1', track: track(1) },
      { entryId: E2, position: 1, trackId: '2', track: track(2) },
    ],
  };

  beforeEach(() => {
    handler.current = (url) => {
      if (url.pathname === `/v1/playlists/${P1}`) return json(200, detail);
      if (url.pathname.startsWith(`/v1/playlists/${P1}`)) return json(204);
      return json(404);
    };
  });
  afterEach(() => playerStore.getState().reset());

  it('plays, reorders and removes tracks', async () => {
    await renderWithQuery(<PlaylistScreen id={P1} />).view;
    expect(await screen.findByTestId('playlist-name')).toHaveTextContent('Foco profundo');
    await fireEvent.press(screen.getByTestId('playlist-play'));
    expect(playerStore.getState().queue.map((t) => t.id)).toEqual(['1', '2']);

    const second = screen.getByLabelText('Synthetic Track 2, Fixture Artist, posição 2 de 2');
    await fireEvent(second, 'accessibilityAction', { nativeEvent: { actionName: 'moveUp' } });
    await waitFor(() => expect(calls('PUT', `/v1/playlists/${P1}/order`)).toHaveLength(1));
    expect(JSON.parse(String(calls('PUT', `/v1/playlists/${P1}/order`)[0]![1].body))).toEqual({
      entryIds: [E2, E1],
    });

    await fireEvent.press(screen.getByTestId('queue-remove-1'));
    await waitFor(() =>
      expect(calls('DELETE', `/v1/playlists/${P1}/tracks/${E1}`)).toHaveLength(1),
    );
  });

  it('deletes after confirmation (T20) and shows a toast', async () => {
    await renderWithQuery(
      <>
        <PlaylistScreen id={P1} />
        <ToastHost />
      </>,
    ).view;
    await fireEvent.press(await screen.findByTestId('playlist-menu'));
    await fireEvent.press(screen.getByTestId('playlist-delete'));
    expect(screen.getByText('Excluir playlist?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cancelar'));
    expect(calls('DELETE', `/v1/playlists/${P1}`)).toHaveLength(0);

    await fireEvent.press(screen.getByTestId('playlist-menu'));
    await fireEvent.press(screen.getByTestId('playlist-delete'));
    await fireEvent.press(screen.getByLabelText('Excluir'));
    await waitFor(() => expect(calls('DELETE', `/v1/playlists/${P1}`)).toHaveLength(1));
    expect(await screen.findByText('Playlist excluída')).toBeTruthy();
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('Track actions (T15)', () => {
  afterEach(() => {
    useTrackActions.getState().close();
    return playerStore.getState().reset();
  });

  it('adds to the queue and to a playlist, warning about duplicates', async () => {
    let duplicate = false;
    handler.current = (url) => {
      if (url.pathname === '/v1/favorites/ids') return json(200, { ids: [] });
      if (url.pathname === '/v1/playlists')
        return json(200, { playlists: [summary(P1, 'Foco profundo')] });
      if (url.pathname === `/v1/playlists/${P1}/tracks`) {
        return duplicate
          ? json(409, { error: { code: 'CONFLICT', message: 'dup' } })
          : json(201, {});
      }
      return json(404);
    };
    await renderWithQuery(<TrackActionsHost />).view;
    await act(async () => useTrackActions.getState().open(track(5)));
    await fireEvent.press(screen.getByTestId('option-queue'));
    expect(playerStore.getState().queue.map((t) => t.id)).toEqual(['5']);
    expect(useToast.getState().message).toBe('Adicionada à fila');

    await act(async () => useTrackActions.getState().open(track(5)));
    await fireEvent.press(screen.getByTestId('option-playlist'));
    await fireEvent.press(await screen.findByTestId(`add-to-${P1}`));
    await waitFor(() => expect(useToast.getState().message).toBe('Adicionada a “Foco profundo”'));

    duplicate = true;
    await act(async () => useTrackActions.getState().openPlaylists(track(5)));
    await fireEvent.press(await screen.findByTestId(`add-to-${P1}`));
    expect(await screen.findByTestId('duplicate-warning')).toHaveTextContent(
      '⚠ Esta faixa já está em “Foco profundo”.',
    );
  });
});
