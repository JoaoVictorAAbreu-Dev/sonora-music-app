import type { Album, Artist, SearchResponse, Track } from '@sonora/shared';

/** Synthetic catalog data (no real songs or artwork). */
export const track = (id: number): Track => ({
  id: String(id),
  title: `Synthetic Track ${id}`,
  artist: { id: '900', name: 'Fixture Artist' },
  album: { id: '500', title: 'Fixture Album' },
  durationSeconds: 180,
  artworkUrl: null,
  streamPath: `/v1/tracks/${id}/stream`,
  licenseUrl: null,
});

export const album = (id: number): Album => ({
  id: String(id),
  title: `Fixture Album ${id}`,
  artist: { id: '900', name: 'Fixture Artist' },
  artworkUrl: null,
  releaseDate: null,
});

export const artist = (id: number): Artist => ({
  id: String(id),
  name: `Artist ${id}`,
  imageUrl: null,
});

export function searchResult(
  query: string,
  n = { tracks: 6, albums: 2, artists: 2 },
): SearchResponse {
  return {
    query,
    type: 'all',
    tracks: Array.from({ length: n.tracks }, (_, i) => track(i + 1)),
    albums: Array.from({ length: n.albums }, (_, i) => album(i + 1)),
    artists: Array.from({ length: n.artists }, (_, i) => artist(i + 1)),
  };
}
