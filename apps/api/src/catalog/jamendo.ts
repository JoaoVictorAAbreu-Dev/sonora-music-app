import { z } from 'zod';
import type { Album, AlbumDetail, Artist, Track } from '@sonora/shared';
import { AppError } from '../errors';

/**
 * Jamendo API v3 client. The response format follows the public Jamendo documentation
 * (envelope `{ headers: { status, code, error_message }, results }`); it has not been checked
 * against the live API yet (no client id — docs/open-questions.md Q5).
 */

const rawTrackSchema = z.object({
  id: z.coerce.string(),
  name: z.string(),
  duration: z.coerce.number().default(0),
  artist_id: z.coerce.string(),
  artist_name: z.string(),
  album_id: z.coerce.string().optional().nullable(),
  album_name: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  album_image: z.string().optional().nullable(),
  audio: z.string().optional().nullable(),
  license_ccurl: z.string().optional().nullable(),
});
type RawTrack = z.infer<typeof rawTrackSchema>;

const rawAlbumSchema = z.object({
  id: z.coerce.string(),
  name: z.string(),
  artist_id: z.coerce.string(),
  artist_name: z.string(),
  image: z.string().optional().nullable(),
  releasedate: z.string().optional().nullable(),
});

const rawAlbumWithTracksSchema = rawAlbumSchema.extend({
  tracks: z
    .array(
      z.object({
        id: z.coerce.string(),
        name: z.string(),
        duration: z.coerce.number().default(0),
        audio: z.string().optional().nullable(),
        license_ccurl: z.string().optional().nullable(),
      }),
    )
    .default([]),
});

const rawArtistSchema = z.object({
  id: z.coerce.string(),
  name: z.string(),
  image: z.string().optional().nullable(),
});

const envelopeSchema = z.object({
  headers: z.object({
    status: z.string(),
    code: z.coerce.number().optional(),
    error_message: z.string().optional(),
  }),
  results: z.array(z.unknown()),
});

const url = (v: string | null | undefined): string | null =>
  v && z.url().safeParse(v).success ? v : null;

const isoDate = (v: string | null | undefined): string | null =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

const streamPath = (id: string) => `/v1/tracks/${id}/stream`;

export function toTrack(r: RawTrack): Track {
  return {
    id: r.id,
    title: r.name,
    artist: { id: r.artist_id, name: r.artist_name },
    album: r.album_id && r.album_id !== '0' ? { id: r.album_id, title: r.album_name ?? '' } : null,
    durationSeconds: Math.max(0, Math.round(r.duration)),
    artworkUrl: url(r.image) ?? url(r.album_image),
    streamPath: streamPath(r.id),
    licenseUrl: url(r.license_ccurl),
  };
}

function toAlbum(r: z.infer<typeof rawAlbumSchema>): Album {
  return {
    id: r.id,
    title: r.name,
    artist: { id: r.artist_id, name: r.artist_name },
    artworkUrl: url(r.image),
    releaseDate: isoDate(r.releasedate),
  };
}

function toArtist(r: z.infer<typeof rawArtistSchema>): Artist {
  return { id: r.id, name: r.name, imageUrl: url(r.image) };
}

export interface JamendoOptions {
  clientId: string;
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

const unavailable = () => new AppError('UPSTREAM_UNAVAILABLE', 'Music catalog is unavailable');

export function createJamendoClient(opts: JamendoOptions) {
  const doFetch = opts.fetchImpl ?? fetch;

  /** Calls one endpoint and returns the parsed `results` items that match `item`. */
  async function get<T extends z.ZodType>(
    path: string,
    params: Record<string, string | number>,
    item: T,
  ): Promise<z.output<T>[]> {
    if (!opts.clientId) throw unavailable();
    const qs = new URLSearchParams({
      format: 'json',
      ...stringify(params),
      client_id: opts.clientId,
    });
    let res: Response;
    try {
      res = await doFetch(`${opts.baseUrl}${path}?${qs.toString()}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(opts.timeoutMs),
      });
    } catch {
      throw unavailable(); // network error or timeout; never include the URL (it has the client id)
    }
    if (!res.ok) throw unavailable();
    const parsed = envelopeSchema.safeParse(await res.json().catch(() => undefined));
    if (!parsed.success || parsed.data.headers.status !== 'success') throw unavailable();
    // Skip individual malformed items instead of failing the whole response.
    return parsed.data.results.flatMap((r) => {
      const one = item.safeParse(r);
      return one.success ? [one.data] : [];
    });
  }

  const trackParams = { imagesize: 300, audioformat: 'mp32' };

  return {
    async searchTracks(q: string, limit: number, offset: number): Promise<Track[]> {
      const rows = await get(
        '/tracks/',
        { ...trackParams, search: q, limit, offset },
        rawTrackSchema,
      );
      return rows.map(toTrack);
    },
    async searchAlbums(q: string, limit: number, offset: number): Promise<Album[]> {
      const rows = await get(
        '/albums/',
        { namesearch: q, imagesize: 300, limit, offset },
        rawAlbumSchema,
      );
      return rows.map(toAlbum);
    },
    async searchArtists(q: string, limit: number, offset: number): Promise<Artist[]> {
      const rows = await get('/artists/', { namesearch: q, limit, offset }, rawArtistSchema);
      return rows.map(toArtist);
    },
    async track(id: string): Promise<Track | null> {
      const [row] = await get('/tracks/', { ...trackParams, id }, rawTrackSchema);
      return row ? toTrack(row) : null;
    },
    /** The raw stream URL (contains the client id): only for the redirect route. */
    async streamUrl(id: string): Promise<string | null> {
      const [row] = await get('/tracks/', { ...trackParams, id }, rawTrackSchema);
      return url(row?.audio);
    },
    async album(id: string): Promise<AlbumDetail | null> {
      const [row] = await get(
        '/albums/tracks/',
        { id, imagesize: 300, audioformat: 'mp32' },
        rawAlbumWithTracksSchema,
      );
      if (!row) return null;
      const album = toAlbum(row);
      const tracks = row.tracks.map((t) =>
        toTrack({
          ...t,
          artist_id: row.artist_id,
          artist_name: row.artist_name,
          album_id: row.id,
          album_name: row.name,
          image: row.image,
        }),
      );
      return { ...album, tracks };
    },
    async artist(id: string): Promise<Artist | null> {
      const [row] = await get('/artists/', { id }, rawArtistSchema);
      return row ? toArtist(row) : null;
    },
    async artistTopTracks(id: string, limit: number): Promise<Track[]> {
      const rows = await get(
        '/tracks/',
        { ...trackParams, artist_id: id, order: 'popularity_total', limit },
        rawTrackSchema,
      );
      return rows.map(toTrack);
    },
    async artistAlbums(id: string, limit: number): Promise<Album[]> {
      const rows = await get(
        '/albums/',
        { artist_id: id, order: 'releasedate_desc', imagesize: 300, limit },
        rawAlbumSchema,
      );
      return rows.map(toAlbum);
    },
    async popularTracks(limit: number): Promise<Track[]> {
      const rows = await get(
        '/tracks/',
        { ...trackParams, order: 'popularity_month', limit },
        rawTrackSchema,
      );
      return rows.map(toTrack);
    },
    async popularAlbums(limit: number): Promise<Album[]> {
      const rows = await get(
        '/albums/',
        { order: 'popularity_week', imagesize: 300, limit },
        rawAlbumSchema,
      );
      return rows.map(toAlbum);
    },
  };
}
export type JamendoClient = ReturnType<typeof createJamendoClient>;

function stringify(params: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
}
