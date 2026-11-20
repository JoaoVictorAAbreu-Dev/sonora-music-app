import { z } from 'zod';
import { catalogIdSchema, trackSchema } from './catalog';

// ---- Favorites -------------------------------------------------------------------------------

export const FAVORITES_MAX_LIMIT = 100;

export const favoritesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(FAVORITES_MAX_LIMIT).default(50),
  before: z.iso.datetime({ offset: true }).optional(),
});

export const favoriteEntrySchema = z.object({
  trackId: catalogIdSchema,
  addedAt: z.iso.datetime({ offset: true }),
  /** Null when the track is no longer available. */
  track: trackSchema.nullable(),
});
export type FavoriteEntry = z.infer<typeof favoriteEntrySchema>;

export const favoritesResponseSchema = z.object({
  entries: z.array(favoriteEntrySchema),
  total: z.number().int().nonnegative(),
  nextBefore: z.iso.datetime({ offset: true }).nullable(),
});
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>;

/** All favorited ids, to draw hearts without loading full pages. */
export const favoriteIdsResponseSchema = z.object({ ids: z.array(catalogIdSchema) });

// ---- Playlists -------------------------------------------------------------------------------

export const PLAYLIST_NAME_MAX = 60;
export const PLAYLIST_DESCRIPTION_MAX = 300;
export const PLAYLISTS_PER_USER_MAX = 200;
export const TRACKS_PER_PLAYLIST_MAX = 1000;

export const playlistNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'name_required' })
  .max(PLAYLIST_NAME_MAX, { error: 'name_too_long' });

export const createPlaylistBodySchema = z
  .object({
    name: playlistNameSchema,
    description: z.string().trim().max(PLAYLIST_DESCRIPTION_MAX).nullable().optional(),
  })
  .strict();
export type CreatePlaylistBody = z.input<typeof createPlaylistBodySchema>;

export const updatePlaylistBodySchema = createPlaylistBodySchema
  .partial()
  .refine((b) => Object.keys(b).length > 0, { error: 'empty_update' });
export type UpdatePlaylistBody = z.input<typeof updatePlaylistBodySchema>;

export const addPlaylistTrackBodySchema = z.object({ trackId: catalogIdSchema }).strict();

/** Full new order of the playlist's entries (every entry id exactly once). */
export const reorderPlaylistBodySchema = z
  .object({ entryIds: z.array(z.uuid()).max(TRACKS_PER_PLAYLIST_MAX) })
  .strict();

export const playlistSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  trackCount: z.number().int().nonnegative(),
  /** Cover of the first track, if any. */
  artworkUrl: z.url().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type PlaylistSummary = z.infer<typeof playlistSummarySchema>;

export const playlistEntrySchema = z.object({
  entryId: z.uuid(),
  position: z.number().int().nonnegative(),
  trackId: catalogIdSchema,
  track: trackSchema.nullable(),
});
export type PlaylistEntry = z.infer<typeof playlistEntrySchema>;

export const playlistsResponseSchema = z.object({ playlists: z.array(playlistSummarySchema) });
export const playlistResponseSchema = z.object({ playlist: playlistSummarySchema });
export const playlistDetailResponseSchema = z.object({
  playlist: playlistSummarySchema,
  entries: z.array(playlistEntrySchema),
});
export type PlaylistDetailResponse = z.infer<typeof playlistDetailResponseSchema>;
