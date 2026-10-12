import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  guestToken: text('guest_token').notNull().unique(),
  displayName: text('display_name').notNull(),
  googleId: text('google_id').unique(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const runs = pgTable(
  'runs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    levelId: text('level_id').notNull(),
    simVersion: integer('sim_version').notNull(),
    status: text('status').$type<'pending' | 'verified' | 'rejected'>().notNull(),
    rejectionReason: text('rejection_reason'),
    claimedTicks: integer('claimed_ticks').notNull(),
    verifiedTicks: integer('verified_ticks'),
    finalHash: text('final_hash').notNull(),
    inputs: text('inputs').notNull(), // JSON string
    ghostSamples: text('ghost_samples'), // JSON string of [tick, x, y, z][]
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('runs_level_verified_idx').on(table.levelId, table.status, table.verifiedTicks),
    index('runs_user_idx').on(table.userId),
  ]
);

export const syncCodes = pgTable('sync_codes', {
  code: text('code').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customTracks = pgTable(
  'custom_tracks',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    authorName: text('author_name').notNull(),
    theme: text('theme').notNull(),
    pieceCode: text('piece_code').notNull(),
    pieceCount: integer('piece_count').notNull(),
    clearTicks: integer('clear_ticks').notNull(),
    playCount: integer('play_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('custom_tracks_created_idx').on(table.createdAt),
    index('custom_tracks_author_idx').on(table.authorId),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type SyncCode = typeof syncCodes.$inferSelect;
export type NewSyncCode = typeof syncCodes.$inferInsert;
export type CustomTrack = typeof customTracks.$inferSelect;
export type NewCustomTrack = typeof customTracks.$inferInsert;

