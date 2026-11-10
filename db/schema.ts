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

import { seedItems } from './seed';

/** Bump this and add a step to migrateDatabase when the schema changes. */
export const SCHEMA_VERSION = 4;

const statusList = FEED_STATUSES.map((status) => `'${status}'`).join(', ');

// v1 and v2 are kept so a phone on any earlier version upgrades step by step.
const CREATE_TABLES_V1 = `
CREATE TABLE topic (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  -- JSON list of lowercase keywords (removed in v3)
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

// v3 (2026-11-08): the topic-based feed (spec §7). Channels and the 2 fixed
// topics go; the flat item list and the daily quota counter come in.
// feed_item and fetch_log are rebuilt, so the current list and old fetch
// logs are dropped; watched stays, so watched videos never come back.
const CREATE_TABLES_V3 = `
DROP TABLE IF EXISTS channel_topic;
DROP TABLE IF EXISTS channel;
DROP TABLE IF EXISTS topic;
DROP TABLE IF EXISTS feed_item;
DROP TABLE IF EXISTS fetch_log;

CREATE TABLE item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- NOCASE, so "Octopus" and "octopus" can't both be saved.
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  query TEXT NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1)),
  removedAt INTEGER,
  lastPickedAt INTEGER,
  pickCount INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL
);

-- No foreign key to item: deleting an item keeps its videos in the list,
-- with the name saved in itemName.
CREATE TABLE feed_item (
  position INTEGER PRIMARY KEY NOT NULL,
  videoId TEXT NOT NULL UNIQUE,
  itemId INTEGER NOT NULL,
  itemName TEXT NOT NULL,
  title TEXT NOT NULL,
  durationSec INTEGER NOT NULL,
  isReserve INTEGER NOT NULL CHECK (isReserve IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'unseen' CHECK (status IN (${statusList}))
);

CREATE TABLE fetch_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  startedAt INTEGER NOT NULL,
  durationMs INTEGER NOT NULL,
  -- JSON list of {itemId, name, results, passed, selected, error}, see lib/records.ts
  itemsPicked TEXT NOT NULL,
  fetched INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  -- JSON list of {videoId, rule, detail}, see lib/records.ts
  rejectedByRule TEXT NOT NULL,
  quotaUsed INTEGER NOT NULL,
  error TEXT
);

-- Units used per Pacific Time day ("YYYY-MM-DD"), see lib/quota.ts.
CREATE TABLE quota_day (
  date TEXT PRIMARY KEY NOT NULL,
  unitsUsed INTEGER NOT NULL
);
`;

// v4 (2026-11-09): the page the Feed was last on, so coming back to the app
// opens on the same video (spec §4 "Feed"). One row at most; a NULL videoId
// is the end page.
const CREATE_FEED_POSITION_V4 = `
CREATE TABLE feed_position (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  videoId TEXT
);
`;

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
  if (version < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(CREATE_TABLES_V3);
      // The seed runs here, once: the step never runs again on this database.
      await seedItems(db, Date.now());
      await db.execAsync('PRAGMA user_version = 3');
    });
  }
  if (version < 4) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(CREATE_FEED_POSITION_V4);
      await db.execAsync('PRAGMA user_version = 4');
    });
  }
}

/** Creates or upgrades the tables, seeding the items on the first launch. Runs on every launch. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  // foreign_keys is off by default and has to be set on each connection.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrateDatabase(db);
}

export type DatabaseSummary = {
  schemaVersion: number;
  tables: string[];
  itemCount: number;
};

/** What's in the database, for the launch log line. */
export async function readDatabaseSummary(db: SQLiteDatabase): Promise<DatabaseSummary> {
  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  );
  const items = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM item');
  return {
    schemaVersion: await readSchemaVersion(db),
    tables: tables.map((table) => table.name),
    itemCount: items?.count ?? 0,
  };
}
