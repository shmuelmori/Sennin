import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getFeedItems, replaceFeed } from '@/db/feed';
import { getLatestFetchLog, insertFetchLog } from '@/db/fetchLog';
import { listItems, markItemsPicked } from '@/db/items';
import { addUnitsUsed, getUnitsUsed } from '@/db/quota';
import { getWatchedIds } from '@/db/watched';
import { useFeedListSignal } from '@/hooks/FeedListSignal';
import {
  describeFetchOutcome,
  type FetchMessage,
  fetchSummaryLines,
  NO_ITEMS_MESSAGE,
  quotaLowMessage,
  READ_FAILED_MESSAGE,
  rejectionLines,
  replacesList,
  SAVE_FAILED_MESSAGE,
  toFetchLog,
} from '@/lib/fetchMessages';
import { failedBeforeStart, type FetchInput, type FetchOutcome, runFetch } from '@/lib/fetchPipeline';
import { canFetch, pacificDate } from '@/lib/quota';
import { createYoutubeClient } from '@/services/youtube';

// The Refresh tab's button (F4): checks today's quota, reads the items, the
// watched videos and the current list, runs the §5 fetch, saves the new list,
// marks the drawn items as picked, adds the units to quota_day and writes
// fetch_log. If the fetch fails or finds nothing, the list stays.
// Every fetch logs [fetch] lines to the Expo terminal: counts per item,
// units, time, and the rejections per rule read back from fetch_log. A saved
// list is announced through FeedListSignal, so the Feed tab reads it.

function log(line: string) {
  console.log(`[fetch] ${line}`);
}

async function readInput(db: SQLiteDatabase, nowMs: number): Promise<FetchInput | null> {
  try {
    const items = await listItems(db);
    const watchedIds = await getWatchedIds(db);
    const listedIds = new Set((await getFeedItems(db)).map((item) => item.videoId));
    return { items, watchedIds, listedIds, nowMs, random: Math.random };
  } catch (cause) {
    log(`reading saved data failed: ${String(cause)}`);
    return null;
  }
}

/**
 * Saves the new list and marks the drawn items as picked (§5 step 6), if
 * there is a new list. Returns the error text if saving failed.
 */
async function saveList(
  db: SQLiteDatabase,
  outcome: FetchOutcome,
  nowMs: number,
): Promise<string | null> {
  if (!replacesList(outcome)) {
    return null;
  }
  try {
    await replaceFeed(db, outcome.feed, outcome.reserve);
    await markItemsPicked(db, outcome.drawn.map((item) => item.id), nowMs);
    return null;
  } catch (cause) {
    log(`saving the list failed: ${String(cause)}`);
    return `saving the list failed: ${String(cause)}`;
  }
}

/** Adds the units to today's count. YouTube charges them even when the fetch failed. */
async function saveUnits(db: SQLiteDatabase, startedAtMs: number, units: number): Promise<void> {
  try {
    await addUnitsUsed(db, pacificDate(startedAtMs), units);
  } catch (cause) {
    log(`saving the quota count failed: ${String(cause)}`);
  }
}

/** Writes fetch_log (F5). Returns false if that failed. */
async function saveLog(
  db: SQLiteDatabase,
  outcome: FetchOutcome,
  startedAtMs: number,
  durationMs: number,
  quotaUsed: number,
  saveError: string | null,
): Promise<boolean> {
  try {
    await insertFetchLog(db, toFetchLog(outcome, startedAtMs, durationMs, quotaUsed, saveError));
    return true;
  } catch (cause) {
    log(`saving fetch_log failed: ${String(cause)}`);
    return false;
  }
}

/** Reads fetch_log back and logs the stored rejections per rule, to show they were saved. */
async function logStoredRejections(db: SQLiteDatabase): Promise<void> {
  try {
    const stored = await getLatestFetchLog(db);
    if (stored === null) return;
    log(`fetch_log saved: ${stored.fetched} fetched, ${stored.rejected.length} rejected, ${stored.quotaUsed} units`);
    rejectionLines(stored.rejected).forEach((line) => log(`  ${line}`));
  } catch (cause) {
    log(`reading fetch_log back failed: ${String(cause)}`);
  }
}

export type RefreshResult = {
  /** The message to show the user. */
  message: FetchMessage;
  /** Whether a new list was saved, so the feed should read it. */
  listReplaced: boolean;
};

/** Today's units, or null if quota_day couldn't be read (the fetch goes ahead then). */
async function readUnitsToday(db: SQLiteDatabase, nowMs: number): Promise<number | null> {
  try {
    return await getUnitsUsed(db, pacificDate(nowMs));
  } catch (cause) {
    log(`reading the quota count failed: ${String(cause)}`);
    return null;
  }
}

async function refreshFeed(db: SQLiteDatabase): Promise<RefreshResult> {
  const startedAtMs = Date.now();
  const unitsToday = await readUnitsToday(db, startedAtMs);
  if (unitsToday !== null && !canFetch(unitsToday)) {
    log(`${unitsToday} units used today, not enough for a fetch`);
    return { message: quotaLowMessage(unitsToday), listReplaced: false };
  }
  const input = await readInput(db, startedAtMs);
  if (input === null) {
    return { message: READ_FAILED_MESSAGE, listReplaced: false };
  }
  const active = input.items.filter((item) => !item.removed).length;
  if (active === 0) {
    log('no active items, nothing to fetch');
    return { message: NO_ITEMS_MESSAGE, listReplaced: false };
  }
  log(`started with ${active} active items`);

  const created = createYoutubeClient();
  const outcome = created.ok
    ? await runFetch(input, created.value)
    : failedBeforeStart(created.error);
  const quotaUsed = created.ok ? created.value.unitsUsed() : 0;

  const saveError = await saveList(db, outcome, startedAtMs);
  // The fetch ends once the list is saved. The same duration goes to
  // fetch_log and the [fetch] lines, so the report matches the terminal.
  const durationMs = Date.now() - startedAtMs;
  await saveUnits(db, startedAtMs, quotaUsed);
  const logSaved = await saveLog(db, outcome, startedAtMs, durationMs, quotaUsed, saveError);
  fetchSummaryLines(outcome, quotaUsed, durationMs).forEach(log);
  if (logSaved && outcome.ok) {
    await logStoredRejections(db);
  }

  if (saveError !== null) {
    return { message: SAVE_FAILED_MESSAGE, listReplaced: false };
  }
  return { message: describeFetchOutcome(outcome), listReplaced: replacesList(outcome) };
}

export function useRefresh() {
  const db = useDatabase();
  const [refreshing, setRefreshing] = useState(false);
  const running = useRef(false);
  const { markListSaved } = useFeedListSignal();

  /** Runs one fetch and returns its result, or null if a fetch is already running. */
  const refresh = useCallback(async (): Promise<RefreshResult | null> => {
    if (running.current) return null;
    running.current = true;
    setRefreshing(true);
    try {
      const result = await refreshFeed(db);
      if (result.listReplaced) markListSaved();
      return result;
    } finally {
      running.current = false;
      setRefreshing(false);
    }
  }, [db, markListSaved]);

  return { refreshing, refresh };
}
