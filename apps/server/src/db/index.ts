import fs from 'node:fs';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema.js';

export type DB = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;
export type StorageType = 'postgres' | 'pglite-disk' | 'pglite-memory';

let dbInstance: DB | null = null;
let currentStorageType: StorageType = 'pglite-memory';

export function getStorageType(): StorageType {
  return currentStorageType;
}

export async function getDb(): Promise<DB> {
  if (dbInstance) return dbInstance;

  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    const maxAttempts = 12;
    let attempts = maxAttempts;
    let lastError: any = null;

    while (attempts > 0) {
      let client: postgres.Sql | null = null;
      try {
        client = postgres(dbUrl, {
          connect_timeout: 5,
          max: 10,
          idle_timeout: 20,
        });
        const db = drizzlePg(client, { schema });
        await initializeTables(db);
        dbInstance = db;
        currentStorageType = 'postgres';
        console.log('✅ Successfully connected to PostgreSQL database');
        return dbInstance;
      } catch (err: any) {
        lastError = err;
        attempts--;
        if (client) {
          try {
            await client.end({ timeout: 1 });
          } catch {
            // ignore close error during retry
          }
        }
        console.warn(
          `[DB] PostgreSQL connection attempt failed (${maxAttempts - attempts}/${maxAttempts}):`,
          err?.message || err
        );
        if (attempts > 0) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    }
    console.warn(
      `⚠️ Could not connect to PostgreSQL after ${maxAttempts} attempts (${lastError?.message || lastError}). Falling back to persistent PGlite storage.`
    );
  }

  // Persistent disk-backed PGlite fallback ensures ZERO data loss across pushes/restarts
  const dataDir = process.env.PGLITE_DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data/pglite' : undefined);

  if (dataDir) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      const pglite = new PGlite(dataDir);
      await pglite.waitReady;
      dbInstance = drizzlePglite(pglite, { schema });
      currentStorageType = 'pglite-disk';
      await initializeTables(dbInstance);
      console.log(`✅ Initialized persistent disk-backed PGlite database storage at: ${dataDir}`);
      return dbInstance;
    } catch (err: any) {
      console.error(`[DB] Failed to initialize persistent PGlite at ${dataDir}:`, err?.message || err);
    }
  }

  // In-memory PGlite fallback (testing or ephemeral environment)
  const pglite = new PGlite();
  await pglite.waitReady;
  dbInstance = drizzlePglite(pglite, { schema });
  currentStorageType = 'pglite-memory';
  await initializeTables(dbInstance);
  console.log('✅ Initialized ephemeral in-memory database storage (dev/test mode)');
  return dbInstance;
}

export async function createTestDb(): Promise<DB> {
  const pglite = new PGlite();
  await pglite.waitReady;
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
      google_id TEXT UNIQUE,
      email TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`);
  await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
  await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_tracks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      theme TEXT NOT NULL,
      piece_code TEXT NOT NULL,
      piece_count INTEGER NOT NULL,
      clear_ticks INTEGER NOT NULL,
      play_count INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS custom_tracks_created_idx ON custom_tracks (created_at DESC)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS custom_tracks_author_idx ON custom_tracks (author_id)
  `);
}


export * from './schema.js';
