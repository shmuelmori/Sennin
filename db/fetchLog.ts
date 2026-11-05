// Queries for the fetch_log table (F5, F11).

import type { SQLiteDatabase } from 'expo-sqlite';

import { decodeRejections, encodeRejections, type FetchLog, type NewFetchLog } from '@/lib/records';

/** Logs older than this are deleted, so the rejection lists don't pile up. */
export const FETCH_LOG_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type FetchLogRow = {
  id: number;
  startedAt: number;
  fetched: number;
  rejectedByRule: string;
  quotaUsed: number;
  error: string | null;
};

/**
 * Saves the log of one fetch, and deletes logs that started more than 30 days
 * before it. The new log itself is always kept.
 */
export async function insertFetchLog(db: SQLiteDatabase, log: NewFetchLog): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO fetch_log (startedAt, fetched, rejectedByRule, quotaUsed, error)
       VALUES (?, ?, ?, ?, ?)`,
      [log.startedAtMs, log.fetched, encodeRejections(log.rejected), log.quotaUsed, log.error],
    );
    await db.runAsync('DELETE FROM fetch_log WHERE startedAt < ?', [
      log.startedAtMs - FETCH_LOG_MAX_AGE_MS,
    ]);
  });
}

/** The most recent fetch, or null if there was none. */
export async function getLatestFetchLog(db: SQLiteDatabase): Promise<FetchLog | null> {
  const row = await db.getFirstAsync<FetchLogRow>(
    `SELECT id, startedAt, fetched, rejectedByRule, quotaUsed, error
     FROM fetch_log ORDER BY id DESC LIMIT 1`,
  );
  if (row === null) {
    return null;
  }
  const rejected = decodeRejections(row.rejectedByRule);
  if (rejected === null) {
    throw new Error(`fetch_log ${row.id} has an unreadable rejectedByRule`);
  }
  return {
    id: row.id,
    startedAtMs: row.startedAt,
    fetched: row.fetched,
    rejected,
    quotaUsed: row.quotaUsed,
    error: row.error,
  };
}
