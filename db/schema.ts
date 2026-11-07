// The SQLite schema (spec §7) and the setup that runs on every launch.
// Times are stored as ms since the epoch, booleans as 0 or 1.
//
// db/ uses withTransactionAsync, not withExclusiveTransactionAsync. The exclusive
// one opens a new connection for each transaction, and foreign_keys (set in
// initDatabase) is off on that connection. The cost: any other query that runs
// during a transaction becomes part of it, which is fine for one user whose
// writes take milliseconds. Don't start two transactions at the same time.

import type { SQLiteDatabase } from 'expo-sqlite';

import { FEED_STATUSES } from '@/lib/records';
import { TOPICS } from '@/lib/topics';

/** Bump this and add a step to migrateDatabase when the schema changes. */
export const SCHEMA_VERSION = 2;

const statusList = FEED_STATUSES.map((status) => `'${status}'`).join(', ');

const CREATE_TABLES_V1 = `
CREATE TABLE topic (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  -- JSON list of lowercase keywords, copied from lib/topics.ts
  keywords TEXT NOT NULL
);

CREATE TABLE channel (
  channelId TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  uploadsPlaylistId TEXT NOT NULL,
  thumbnailUrl TEXT,
  addedAt INTEGER NOT NULL
);

CREATE TABLE channel_topic (
  channelId TEXT NOT NULL REFERENCES channel (channelId) ON DELETE CASCADE,
  topicId TEXT NOT NULL REFERENCES topic (id),
  PRIMARY KEY (channelId, topicId)
);

-- No foreign key to channel: removing a channel keeps its videos in the list (F2).
CREATE TABLE feed_item (
  position INTEGER PRIMARY KEY NOT NULL,
  videoId TEXT NOT NULL UNIQUE,
  channelId TEXT NOT NULL,
  channelTitle TEXT NOT NULL,
  title TEXT NOT NULL,
  durationSec INTEGER NOT NULL,
  isReserve INTEGER NOT NULL CHECK (isReserve IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'unseen' CHECK (status IN (${statusList}))
);

CREATE TABLE watched (
  videoId TEXT PRIMARY KEY NOT NULL,
  watchedAt INTEGER NOT NULL
);

CREATE TABLE fetch_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  startedAt INTEGER NOT NULL,
  fetched INTEGER NOT NULL,
  -- JSON list of {videoId, rule, detail}, see lib/records.ts
  rejectedByRule TEXT NOT NULL,
  quotaUsed INTEGER NOT NULL,
  error TEXT
);
`;

// v2 (2026-11-08): when each fetch ended, for the report's duration (§7).
// Rows logged before it keep NULL.
const ADD_FETCH_FINISHED_AT_V2 = 'ALTER TABLE fetch_log ADD COLUMN finishedAt INTEGER';

async function readSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  const version = await readSchemaVersion(db);
  if (version > SCHEMA_VERSION) {
    throw new Error(`Database schema v${version} is newer than this app (v${SCHEMA_VERSION})`);
  }
  if (version < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(CREATE_TABLES_V1);
      await db.execAsync('PRAGMA user_version = 1');
    });
  }
  if (version < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(ADD_FETCH_FINISHED_AT_V2);
      await db.execAsync('PRAGMA user_version = 2');
    });
  }
}

/** Writes the topics from lib/topics.ts, so the table always matches the code. */
async function seedTopics(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const topic of TOPICS) {
      await db.runAsync(
        `INSERT INTO topic (id, name, keywords) VALUES (?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, keywords = excluded.keywords`,
        [topic.id, topic.name, JSON.stringify(topic.keywords)],
      );
    }
  });
}

/** Creates or upgrades the tables and seeds the topics. Runs on every launch. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  // foreign_keys is off by default and has to be set on each connection.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrateDatabase(db);
  await seedTopics(db);
}

export type DatabaseSummary = {
  schemaVersion: number;
  tables: string[];
  topicCount: number;
};

/** What's in the database, for the launch log line (status.md step 3.1). */
export async function readDatabaseSummary(db: SQLiteDatabase): Promise<DatabaseSummary> {
  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  );
  const topics = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM topic');
  return {
    schemaVersion: await readSchemaVersion(db),
    tables: tables.map((table) => table.name),
    topicCount: topics?.count ?? 0,
  };
}
