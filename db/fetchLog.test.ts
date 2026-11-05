import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewFetchLog } from '@/lib/records';

import { FETCH_LOG_KEEP, getLatestFetchLog, insertFetchLog } from './fetchLog';
import { initDatabase } from './schema';
import { openTestDatabase } from './testDatabase';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await initDatabase(db);
});

afterEach(async () => {
  await db.closeAsync();
});

function log(startedAtMs: number): NewFetchLog {
  return {
    startedAtMs,
    fetched: 120,
    rejected: [
      { videoId: 'a', rule: 'length', detail: '240 s' },
      { videoId: 'b', rule: 'vertical', detail: '1280x720' },
    ],
    quotaUsed: 34,
    error: null,
  };
}

describe('insertFetchLog and getLatestFetchLog', () => {
  it('returns null before the first fetch', async () => {
    expect(await getLatestFetchLog(db)).toBeNull();
  });

  it('reads back the latest log with its rejections', async () => {
    await insertFetchLog(db, log(100));
    await insertFetchLog(db, log(200));
    expect(await getLatestFetchLog(db)).toEqual({ ...log(200), id: 2 });
  });

  it('keeps an error message', async () => {
    await insertFetchLog(db, { ...log(100), rejected: [], error: 'quotaExceeded' });
    expect(await getLatestFetchLog(db)).toMatchObject({ rejected: [], error: 'quotaExceeded' });
  });

  it(`keeps only the latest ${FETCH_LOG_KEEP} logs`, async () => {
    for (let i = 1; i <= FETCH_LOG_KEEP + 3; i++) {
      await insertFetchLog(db, log(i));
    }
    const rows = await db.getAllAsync<{ startedAt: number }>(
      'SELECT startedAt FROM fetch_log ORDER BY id',
    );
    expect(rows.map((row) => row.startedAt)).toEqual(
      Array.from({ length: FETCH_LOG_KEEP }, (_, i) => i + 4),
    );
    expect((await getLatestFetchLog(db))?.startedAtMs).toBe(FETCH_LOG_KEEP + 3);
  });

  it('throws if the stored rejections are unreadable', async () => {
    await insertFetchLog(db, log(100));
    await db.runAsync("UPDATE fetch_log SET rejectedByRule = 'oops'");
    await expect(getLatestFetchLog(db)).rejects.toThrow('unreadable rejectedByRule');
  });
});
