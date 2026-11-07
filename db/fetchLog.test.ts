import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewFetchLog } from '@/lib/records';

import {
  FETCH_LOG_MAX_AGE_MS,
  getLastCompletedFetchStart,
  getLatestFetchLog,
  insertFetchLog,
} from './fetchLog';
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
    finishedAtMs: startedAtMs + 9_000,
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

  it('reads back a log with no end time as null', async () => {
    await insertFetchLog(db, { ...log(100), finishedAtMs: null });
    expect(await getLatestFetchLog(db)).toMatchObject({ startedAtMs: 100, finishedAtMs: null });
  });

  it('keeps an error message', async () => {
    await insertFetchLog(db, { ...log(100), rejected: [], error: 'quotaExceeded' });
    expect(await getLatestFetchLog(db)).toMatchObject({ rejected: [], error: 'quotaExceeded' });
  });

  describe('deleting old logs', () => {
    const day = 24 * 60 * 60 * 1000;
    const now = 1_800_000_000_000;

    async function storedStartTimes(): Promise<number[]> {
      const rows = await db.getAllAsync<{ startedAt: number }>(
        'SELECT startedAt FROM fetch_log ORDER BY id',
      );
      return rows.map((row) => row.startedAt);
    }

    it('is set to 30 days', () => {
      expect(FETCH_LOG_MAX_AGE_MS).toBe(30 * day);
    });

    it('deletes logs more than 30 days older than the new one', async () => {
      await insertFetchLog(db, log(now - 45 * day));
      await insertFetchLog(db, log(now - 31 * day));
      await insertFetchLog(db, log(now - 29 * day));
      await insertFetchLog(db, log(now));
      expect(await storedStartTimes()).toEqual([now - 29 * day, now]);
    });

    it('keeps a log exactly 30 days old', async () => {
      await insertFetchLog(db, log(now - 30 * day));
      await insertFetchLog(db, log(now));
      expect(await storedStartTimes()).toEqual([now - 30 * day, now]);
    });

    it('keeps every log from the last 30 days, however many', async () => {
      for (let i = 0; i < 100; i++) {
        await insertFetchLog(db, log(now - 29 * day + i * 60_000));
      }
      expect(await storedStartTimes()).toHaveLength(100);
    });
  });

  it('throws if the stored rejections are unreadable', async () => {
    await insertFetchLog(db, log(100));
    await db.runAsync("UPDATE fetch_log SET rejectedByRule = 'oops'");
    await expect(getLatestFetchLog(db)).rejects.toThrow('unreadable rejectedByRule');
  });
});

describe('getLastCompletedFetchStart', () => {
  it('returns null before the first fetch', async () => {
    expect(await getLastCompletedFetchStart(db)).toBeNull();
  });

  it('returns the start of the latest fetch that checked videos', async () => {
    await insertFetchLog(db, log(100));
    await insertFetchLog(db, log(200));
    expect(await getLastCompletedFetchStart(db)).toBe(200);
  });

  it('skips fetches that checked no videos, such as failed ones', async () => {
    await insertFetchLog(db, log(100));
    await insertFetchLog(db, { ...log(200), fetched: 0, rejected: [], error: 'failed: quota' });
    await insertFetchLog(db, { ...log(300), fetched: 0, rejected: [] });
    expect(await getLastCompletedFetchStart(db)).toBe(100);
  });

  it('counts a fetch that skipped a channel but checked videos', async () => {
    await insertFetchLog(db, log(100));
    await insertFetchLog(db, { ...log(200), error: 'skipped Gone (UCgone): notFound' });
    expect(await getLastCompletedFetchStart(db)).toBe(200);
  });
});
