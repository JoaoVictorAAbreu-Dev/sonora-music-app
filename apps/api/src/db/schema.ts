import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigserial,
  check,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    /** argon2id hash; null for accounts created only through Google/Apple. */
    passwordHash: text('password_hash'),
    displayName: text('display_name'),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Stored lowercase (enforced), so a plain unique index is case-insensitive.
    uniqueIndex('users_email_uq').on(t.email),
    check('users_email_lowercase_ck', sql`${t.email} = lower(${t.email})`),
  ],
);

export const authProvider = pgEnum('auth_provider', ['google', 'apple']);

export const authIdentities = pgTable(
  'auth_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProvider('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    email: text('email'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('auth_identities_provider_user_uq').on(t.provider, t.providerUserId),
    index('auth_identities_user_idx').on(t.userId),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 of the opaque token; the raw token is never stored. */
    tokenHash: text('token_hash').notNull(),
    /** All tokens produced by rotating one sign-in share a family; reuse revokes the family. */
    familyId: uuid('family_id').notNull(),
    /** Set when the token was rotated; presenting a token with a successor is reuse. */
    replacedBy: uuid('replaced_by').references((): AnyPgColumn => refreshTokens.id, {
      onDelete: 'set null',
    }),
    device: text('device'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_uq').on(t.tokenHash),
    index('refresh_tokens_family_idx').on(t.familyId),
    index('refresh_tokens_user_idx').on(t.userId),
    index('refresh_tokens_expires_idx').on(t.expiresAt),
  ],
);

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jamendoTrackId: text('jamendo_track_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.jamendoTrackId] }),
    index('favorites_user_created_idx').on(t.userId, t.createdAt.desc()),
  ],
);

export const playlists = pgTable(
  'playlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('playlists_user_updated_idx').on(t.userId, t.updatedAt.desc())],
);

export const playlistTracks = pgTable(
  'playlist_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    jamendoTrackId: text('jamendo_track_id').notNull(),
    /** 0-based; kept contiguous by the API inside a transaction. */
    position: integer('position').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('playlist_tracks_playlist_position_idx').on(t.playlistId, t.position)],
);

export const playHistory = pgTable(
  'play_history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jamendoTrackId: text('jamendo_track_id').notNull(),
    playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('play_history_user_played_idx').on(t.userId, t.playedAt.desc())],
);

/** Cached Jamendo responses keyed by request (e.g. `track:123`, `search:<hash>`). */
export const trackCache = pgTable(
  'track_cache',
  {
    key: text('key').primaryKey(),
    payload: jsonb('payload').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('track_cache_fetched_idx').on(t.fetchedAt)],
);
