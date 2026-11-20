import { fireEvent, screen } from '@testing-library/react-native';
import type { AlbumDetail, ArtistDetail } from '@sonora/shared';
import { AlbumScreen, ArtistScreen } from '@/features/catalog/CollectionScreens';
import { albumLicenseNote, licenseName } from '@/features/catalog/license';
import { playerStore } from '@/features/player';
import { authStore } from '@/lib/auth/store';
import { json } from './fixtures';
import { album, track } from './catalog-fixtures';
import { mockFetch, renderWithQuery } from './render';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: jest.fn(),
    navigate: jest.fn(),
  },
}));

const CC = 'https://creativecommons.org/licenses/by-nc-sa/3.0/';
const albumDetail: AlbumDetail = {
  ...album(500),
  releaseDate: '2024-03-01',
  tracks: [1, 2, 3].map((i) => ({ ...track(i), licenseUrl: CC })),
};
const artistDetail: ArtistDetail = {
  id: '900',
  name: 'Fixture Artist',
  imageUrl: null,
  topTracks: [track(1), track(2)],
  albums: [album(500), album(501)],
};

const handler: { current: (url: URL) => Response } = { current: () => json(404) };
const playList = jest.fn(() => Promise.resolve());

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch(handler);
  handler.current = (url) => {
    if (url.pathname === '/v1/albums/500') return json(200, { album: albumDetail });
    if (url.pathname === '/v1/artists/900') return json(200, { artist: artistDetail });
    return json(503, { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'x' } });
  };
  authStore.setState({
    status: 'signedIn',
    accessToken: 'tok',
    accessTokenExpiresAt: Date.now() + 600_000,
  });
  playerStore.setState({ playList });
});

describe('T09 Álbum', () => {
  it('shows cover, details, tracks and the license note', async () => {
    await renderWithQuery(<AlbumScreen id="500" />).view;
    expect(await screen.findByText('Fixture Album 500')).toBeOnTheScreen();
    expect(screen.getByText('Fixture Artist · 2024 · 3 faixas')).toBeOnTheScreen();
    expect(screen.getByTestId('album-track-2')).toBeOnTheScreen();
    expect(screen.getByTestId('album-license')).toHaveTextContent(
      'Licença Creative Commons BY-NC-SA 3.0 · ver detalhes em Sobre e licenças',
    );
  });

  it('plays the whole album from "Tocar" and from a tapped track', async () => {
    await renderWithQuery(<AlbumScreen id="500" />).view;
    await fireEvent.press(await screen.findByTestId('collection-play'));
    expect(playList).toHaveBeenLastCalledWith(albumDetail.tracks, 0);
    await fireEvent.press(screen.getByTestId('album-track-3'));
    expect(playList).toHaveBeenLastCalledWith(albumDetail.tracks, 2);
  });

  it('opens the artist from the details line', async () => {
    await renderWithQuery(<AlbumScreen id="500" />).view;
    await fireEvent.press(await screen.findByTestId('album-artist'));
    expect(mockPush).toHaveBeenCalledWith('/artist/900');
  });

  it('shows the error state with retry', async () => {
    await renderWithQuery(<AlbumScreen id="999" />).view;
    expect(await screen.findByText('Tentar de novo')).toBeOnTheScreen();
    expect(screen.queryByTestId('collection-play')).toBeNull();
  });
});

describe('T08 Artista', () => {
  it('shows popular tracks and albums, and opens an album', async () => {
    await renderWithQuery(<ArtistScreen id="900" />).view;
    expect(await screen.findByText('Faixas populares')).toBeOnTheScreen();
    expect(screen.getByTestId('artist-track-1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('artist-album-501'));
    expect(mockPush).toHaveBeenCalledWith('/album/501');
  });

  it('plays the top tracks', async () => {
    await renderWithQuery(<ArtistScreen id="900" />).view;
    await fireEvent.press(await screen.findByTestId('collection-play'));
    expect(playList).toHaveBeenCalledWith(artistDetail.topTracks, 0);
  });
});

describe('license note', () => {
  it('names Creative Commons licenses', () => {
    expect(licenseName(CC)).toBe('Creative Commons BY-NC-SA 3.0');
    expect(licenseName('https://example.com/x')).toBe('Creative Commons');
  });

  it('is null without licenses and generic when they differ', () => {
    expect(albumLicenseNote([track(1)])).toBeNull();
    expect(
      albumLicenseNote([
        { ...track(1), licenseUrl: CC },
        { ...track(2), licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
      ]),
    ).toMatch(/^Licenças Creative Commons variadas/);
  });
});
