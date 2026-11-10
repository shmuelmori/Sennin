import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase, readDatabaseSummary, SCHEMA_VERSION } from './schema';
import { SEED_ITEMS } from './seed';
import { openTestDatabase } from './testDatabase';

let db: SQLiteDatabase;

beforeEach(() => {
  db = openTestDatabase();
});

afterEach(async () => {
  await db.closeAsync();
});

/** A v2 database with one row in each table, as the channel-based app left it. */
async function makeV2Database(): Promise<void> {
  await db.execAsync(`
    CREATE TABLE topic (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, keywords TEXT NOT NULL);
    CREATE TABLE channel (channelId TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL,
      uploadsPlaylistId TEXT NOT NULL, thumbnailUrl TEXT, addedAt INTEGER NOT NULL);
    CREATE TABLE channel_topic (channelId TEXT NOT NULL, topicId TEXT NOT NULL);
    CREATE TABLE feed_item (position INTEGER PRIMARY KEY NOT NULL, videoId TEXT NOT NULL UNIQUE,
      channelId TEXT NOT NULL, channelTitle TEXT NOT NULL, title TEXT NOT NULL,
      durationSec INTEGER NOT NULL, isReserve INTEGER NOT NULL, status TEXT NOT NULL);
    CREATE TABLE watched (videoId TEXT PRIMARY KEY NOT NULL, watchedAt INTEGER NOT NULL);
    CREATE TABLE fetch_log (id INTEGER PRIMARY KEY AUTOINCREMENT, startedAt INTEGER NOT NULL,
      fetched INTEGER NOT NULL, rejectedByRule TEXT NOT NULL, quotaUsed INTEGER NOT NULL,
      error TEXT, finishedAt INTEGER);
    INSERT INTO topic VALUES ('ww2', 'World War II', '[]');
    INSERT INTO channel VALUES ('UCx', 'Channel', 'UUx', NULL, 1);
    INSERT INTO channel_topic VALUES ('UCx', 'ww2');
    INSERT INTO feed_item VALUES (0, 'old', 'UCx', 'Channel', 'Old video', 60, 0, 'unseen');
    INSERT INTO watched VALUES ('seen', 5);
    INSERT INTO fetch_log (startedAt, fetched, rejectedByRule, quotaUsed) VALUES (1, 2, '[]', 3);
    PRAGMA user_version = 2;
  `);
}

describe('initDatabase', () => {
  it('creates the six tables from spec §7 and seeds the items', async () => {
    await initDatabase(db);
    expect(await readDatabaseSummary(db)).toEqual({
      schemaVersion: SCHEMA_VERSION,
      tables: ['feed_item', 'fetch_log', 'item', 'quota_day', 'video_info', 'watched'],
      itemCount: SEED_ITEMS.length,
    });
  });

  it('seeds hundreds of items, each with a name and a query', async () => {
    await initDatabase(db);
    const rows = await db.getAllAsync<{ name: string; query: string; removed: number }>(
      'SELECT name, query, removed FROM item',
    );
    expect(rows.length).toBeGreaterThanOrEqual(200);
    expect(rows.every((row) => row.name !== '' && row.query !== '' && row.removed === 0)).toBe(true);
    expect(rows.map((row) => row.name)).toContain('Octopus');
  });

  it('can run on every launch without losing data or seeding again', async () => {
    await initDatabase(db);
    await db.runAsync('INSERT INTO watched (videoId, watchedAt) VALUES (?, ?)', ['abc', 1]);
    await db.runAsync('DELETE FROM item');
    await initDatabase(db);
    expect((await readDatabaseSummary(db)).itemCount).toBe(0);
    expect(await db.getAllAsync('SELECT videoId FROM watched')).toEqual([{ videoId: 'abc' }]);
  });

  it('upgrades a v2 database: drops the channel tables and keeps watched', async () => {
    await makeV2Database();
    await initDatabase(db);
    const summary = await readDatabaseSummary(db);
    expect(summary.schemaVersion).toBe(SCHEMA_VERSION);
    expect(summary.tables).toEqual([
      'feed_item',
      'fetch_log',
      'item',
      'quota_day',
      'video_info',
      'watched',
    ]);
    expect(summary.itemCount).toBe(SEED_ITEMS.length);
    expect(await db.getAllAsync('SELECT videoId FROM watched')).toEqual([{ videoId: 'seen' }]);
    expect(await db.getAllAsync('SELECT videoId FROM feed_item')).toEqual([]);
    expect(await db.getAllAsync('SELECT id FROM fetch_log')).toEqual([]);
  });

  it('upgrades a v3 database: keeps the list and the quota, with an empty channel and description', async () => {
    await initDatabase(db);
    // Back to v3 by hand: the v4 columns and table removed.
    await db.execAsync(`
      DROP TABLE video_info;
      ALTER TABLE feed_item DROP COLUMN channelTitle;
      ALTER TABLE feed_item DROP COLUMN description;
      ALTER TABLE quota_day DROP COLUMN geminiRequests;
      INSERT INTO feed_item (position, videoId, itemId, itemName, title, durationSec, isReserve)
        VALUES (0, 'v', 1, 'Octopus', 'Title', 60, 0);
      INSERT INTO quota_day (date, unitsUsed) VALUES ('2026-11-10', 2010);
      PRAGMA user_version = 3;
    `);
    await initDatabase(db);
    expect((await readDatabaseSummary(db)).schemaVersion).toBe(4);
    expect(await db.getAllAsync('SELECT videoId, channelTitle, description FROM feed_item')).toEqual([
      { videoId: 'v', channelTitle: '', description: '' },
    ]);
    expect(await db.getAllAsync('SELECT unitsUsed, geminiRequests FROM quota_day')).toEqual([
      { unitsUsed: 2010, geminiRequests: 0 },
    ]);
    expect(await db.getAllAsync('SELECT videoId FROM video_info')).toEqual([]);
  });

  it('refuses a database from a newer app version', async () => {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(initDatabase(db)).rejects.toThrow('newer than this app');
  });

  it('only allows the known feed statuses', async () => {
    await initDatabase(db);
    await expect(
      db.runAsync(
        `INSERT INTO feed_item
           (position, videoId, itemId, itemName, title, durationSec, isReserve, status)
         VALUES (0, 'a', 1, 'Octopus', 'Title', 60, 0, 'done')`,
      ),
    ).rejects.toThrow(/CHECK/);
  });

  it('treats item names that differ only in case as the same', async () => {
    await initDatabase(db);
    await expect(
      db.runAsync("INSERT INTO item (name, query, createdAt) VALUES ('OCTOPUS', 'x', 1)"),
    ).rejects.toThrow(/UNIQUE/);
  });
});

describe('SEED_ITEMS', () => {
  it('has no names that repeat, ignoring case', () => {
    const names = SEED_ITEMS.map((entry) => entry.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('has an English query for every item', () => {
    expect(SEED_ITEMS.every((entry) => /^[\x20-\x7e]+$/.test(entry.query))).toBe(true);
  });
});
