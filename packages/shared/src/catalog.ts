import { z } from 'zod';

/** Jamendo ids are numeric strings; kept as strings end to end. */
export const catalogIdSchema = z.string().regex(/^\d{1,12}$/, { error: 'invalid_id' });

const imageUrl = z.url().nullable();

export const artistSummarySchema = z.object({ id: catalogIdSchema, name: z.string() });

export const trackSchema = z.object({
  id: catalogIdSchema,
  title: z.string(),
  artist: artistSummarySchema,
  album: z.object({ id: catalogIdSchema, title: z.string() }).nullable(),
  /** Seconds. */
  durationSeconds: z.number().int().nonnegative(),
  artworkUrl: imageUrl,
  /** API path that redirects to the audio stream (relative to the API base URL). */
  streamPath: z.string().startsWith('/v1/tracks/'),
  /** Creative Commons license URL shown in "Sobre e licenças". */
  licenseUrl: z.url().nullable(),
});
export type Track = z.infer<typeof trackSchema>;

export const albumSchema = z.object({
  id: catalogIdSchema,
  title: z.string(),
  artist: artistSummarySchema,
  artworkUrl: imageUrl,
  releaseDate: z.iso.date().nullable(),
});
export type Album = z.infer<typeof albumSchema>;

export const artistSchema = z.object({
  id: catalogIdSchema,
  name: z.string(),
  imageUrl: imageUrl,
});
export type Artist = z.infer<typeof artistSchema>;

export const albumDetailSchema = albumSchema.extend({ tracks: z.array(trackSchema) });
export type AlbumDetail = z.infer<typeof albumDetailSchema>;

export const artistDetailSchema = artistSchema.extend({
  topTracks: z.array(trackSchema),
  albums: z.array(albumSchema),
});
export type ArtistDetail = z.infer<typeof artistDetailSchema>;

export const searchTypes = ['all', 'tracks', 'albums', 'artists'] as const;
export type SearchType = (typeof searchTypes)[number];

export const SEARCH_MAX_LIMIT = 50;

/** Query string of GET /v1/search. */
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, { error: 'query_required' }).max(100),
  type: z.enum(searchTypes).default('all'),
  limit: z.coerce.number().int().min(1).max(SEARCH_MAX_LIMIT).default(20),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});
export type SearchQuery = z.input<typeof searchQuerySchema>;

export const searchResponseSchema = z.object({
  query: z.string(),
  type: z.enum(searchTypes),
  tracks: z.array(trackSchema),
  albums: z.array(albumSchema),
  artists: z.array(artistSchema),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

/** GET /v1/home: sections of T05 Início. */
export const homeResponseSchema = z.object({
  /** Recently played tracks of the signed-in user (empty until there is history). */
  continueListening: z.array(trackSchema),
  /** "Feito para você": albums picked for the user (popular this week for now). */
  madeForYou: z.array(albumSchema),
  /** "Populares": most played tracks this month. */
  popular: z.array(trackSchema),
});
export type HomeResponse = z.infer<typeof homeResponseSchema>;

export const trackResponseSchema = z.object({ track: trackSchema });
export const albumResponseSchema = z.object({ album: albumDetailSchema });
export const artistResponseSchema = z.object({ artist: artistDetailSchema });
