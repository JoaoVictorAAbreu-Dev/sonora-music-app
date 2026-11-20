import { z } from 'zod';
import { catalogIdSchema, trackSchema } from './catalog';

/** POST /v1/history: one play of a track (sent after it has really played for a while). */
export const recordPlayBodySchema = z.object({ trackId: catalogIdSchema }).strict();
export type RecordPlayBody = z.infer<typeof recordPlayBodySchema>;

export const HISTORY_MAX_LIMIT = 50;

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(HISTORY_MAX_LIMIT).default(20),
  /** Cursor: entries strictly older than this timestamp. */
  before: z.iso.datetime({ offset: true }).optional(),
});
export type HistoryQuery = z.input<typeof historyQuerySchema>;

export const historyEntrySchema = z.object({
  id: z.string(),
  playedAt: z.iso.datetime({ offset: true }),
  trackId: catalogIdSchema,
  /** Null when the track is no longer available in the catalog. */
  track: trackSchema.nullable(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const historyResponseSchema = z.object({
  entries: z.array(historyEntrySchema),
  /** Pass as `before` to get the next page; null at the end. */
  nextBefore: z.iso.datetime({ offset: true }).nullable(),
});
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
