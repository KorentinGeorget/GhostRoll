import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema.js';

export type DB = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

let dbInstance: DB | null = null;

export async function getDb(): Promise<DB> {
  if (dbInstance) return dbInstance;

  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    const client = postgres(dbUrl);
    dbInstance = drizzlePg(client, { schema });
  } else {
    // Embedded PGlite for zero-config local dev and tests
    const pglite = new PGlite();
    dbInstance = drizzlePglite(pglite, { schema });
  }

  // Ensure tables exist
  await initializeTables(dbInstance);

  return dbInstance;
}

export async function createTestDb(): Promise<DB> {
  const pglite = new PGlite();
  const testDb = drizzlePglite(pglite, { schema });
  await initializeTables(testDb);
  return testDb;
}

async function initializeTables(db: DB): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      guest_token TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      level_id TEXT NOT NULL,
      sim_version INTEGER NOT NULL,
      status TEXT NOT NULL,
      rejection_reason TEXT,
      claimed_ticks INTEGER NOT NULL,
      verified_ticks INTEGER,
      final_hash TEXT NOT NULL,
      inputs TEXT NOT NULL,
      ghost_samples TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS runs_level_verified_idx ON runs (level_id, status, verified_ticks)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS runs_user_idx ON runs (user_id)
  `);
}

export * from './schema.js';
