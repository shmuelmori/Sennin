import type { SQLiteDatabase } from 'expo-sqlite';

import { TOPICS } from '@/lib/topics';

import { initDatabase, readDatabaseSummary, SCHEMA_VERSION } from './schema';
import { openTestDatabase } from './testDatabase';

let db: SQLiteDatabase;

beforeEach(() => {
  db = openTestDatabase();
});

afterEach(async () => {
  await db.closeAsync();
});

describe('initDatabase', () => {
  it('creates the six tables from spec §7 and seeds the topics', async () => {
    await initDatabase(db);
    expect(await readDatabaseSummary(db)).toEqual({
      schemaVersion: SCHEMA_VERSION,
      tables: ['channel', 'channel_topic', 'feed_item', 'fetch_log', 'topic', 'watched'],
      topicCount: 2,
    });
  });

  it('stores each topic with its keywords as JSON', async () => {
    await initDatabase(db);
    const rows = await db.getAllAsync<{ id: string; name: string; keywords: string }>(
      'SELECT id, name, keywords FROM topic',
    );
    expect(
      rows.map((row) => ({ id: row.id, name: row.name, keywords: JSON.parse(row.keywords) })),
    ).toEqual(TOPICS.map((topic) => ({ ...topic, keywords: [...topic.keywords] })));
  });

  it('can run on every launch without losing data', async () => {
    await initDatabase(db);
    await db.runAsync('INSERT INTO watched (videoId, watchedAt) VALUES (?, ?)', ['abc', 1]);
    await initDatabase(db);
    const summary = await readDatabaseSummary(db);
    expect(summary.topicCount).toBe(2);
    expect(await db.getAllAsync('SELECT videoId FROM watched')).toEqual([{ videoId: 'abc' }]);
  });

  it('brings old topic names and keywords up to date', async () => {
    await initDatabase(db);
    await db.runAsync("UPDATE topic SET name = 'Old', keywords = '[]' WHERE id = 'ww2'");
    await initDatabase(db);
    const row = await db.getFirstAsync<{ name: string; keywords: string }>(
      "SELECT name, keywords FROM topic WHERE id = 'ww2'",
    );
    expect(row?.name).toBe('World War II');
    expect(JSON.parse(row?.keywords ?? '[]')).toContain('ww2');
  });

  it('adds fetch_log.finishedAt to a v1 database and keeps its rows', async () => {
    // A v1 database, as the app made it before the column existed.
    await initDatabase(db);
    await db.execAsync('ALTER TABLE fetch_log DROP COLUMN finishedAt; PRAGMA user_version = 1');
    await db.runAsync(
      `INSERT INTO fetch_log (startedAt, fetched, rejectedByRule, quotaUsed, error)
       VALUES (100, 50, '[]', 4, NULL)`,
    );
    await initDatabase(db);
    expect((await readDatabaseSummary(db)).schemaVersion).toBe(2);
    expect(await db.getAllAsync('SELECT startedAt, finishedAt, fetched FROM fetch_log')).toEqual([
      { startedAt: 100, finishedAt: null, fetched: 50 },
    ]);
  });

  it('refuses a database from a newer app version', async () => {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(initDatabase(db)).rejects.toThrow('newer than this app');
  });

  it('turns on foreign keys', async () => {
    await initDatabase(db);
    await expect(
      db.runAsync('INSERT INTO channel_topic (channelId, topicId) VALUES (?, ?)', ['UCx', 'ww2']),
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it('only allows the known feed statuses', async () => {
    await initDatabase(db);
    await expect(
      db.runAsync(
        `INSERT INTO feed_item
           (position, videoId, channelId, channelTitle, title, durationSec, isReserve, status)
         VALUES (0, 'a', 'UCx', 'Channel', 'Title', 60, 0, 'done')`,
      ),
    ).rejects.toThrow(/CHECK/);
  });
});
