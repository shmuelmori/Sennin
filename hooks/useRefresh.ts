import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { listChannels } from '@/db/channels';
import { useDatabase } from '@/db/DatabaseProvider';
import { getFeedItems, replaceFeed } from '@/db/feed';
import { getLastCompletedFetchStart, getLatestFetchLog, insertFetchLog } from '@/db/fetchLog';
import { getWatchedIds } from '@/db/watched';
import {
  describeFetchOutcome,
  type FetchMessage,
  fetchSummaryLines,
  NO_CHANNELS_MESSAGE,
  READ_FAILED_MESSAGE,
  rejectionLines,
  replacesList,
  SAVE_FAILED_MESSAGE,
  toFetchLog,
} from '@/lib/fetchMessages';
import { failedBeforeStart, type FetchInput, type FetchOutcome, runFetch } from '@/lib/fetchPipeline';
import { createYoutubeClient } from '@/services/youtube';

// The "Refresh" button (F4, steps 6.1 and 6.2): reads the channels, the
// watched videos and the current list, runs the §5 fetch, saves the new list
// and writes fetch_log. If the fetch fails or finds nothing, the list stays.
// Every fetch logs [fetch] lines to the Expo terminal: counts, units, time,
// and the rejections per rule read back from fetch_log.

function log(line: string) {
  console.log(`[fetch] ${line}`);
}

async function readInput(db: SQLiteDatabase, nowMs: number): Promise<FetchInput | null> {
  try {
    const channels = await listChannels(db);
    const watchedIds = await getWatchedIds(db);
    const listedIds = new Set((await getFeedItems(db)).map((item) => item.videoId));
    const lastFetchMs = await getLastCompletedFetchStart(db);
    return { channels, watchedIds, listedIds, lastFetchMs, nowMs };
  } catch (cause) {
    log(`reading saved data failed: ${String(cause)}`);
    return null;
  }
}

/** Saves the new list, if there is one. Returns the error text if saving failed. */
async function saveList(db: SQLiteDatabase, outcome: FetchOutcome): Promise<string | null> {
  if (!replacesList(outcome)) {
    return null;
  }
  try {
    await replaceFeed(db, outcome.feed, outcome.reserve);
    return null;
  } catch (cause) {
    log(`saving the list failed: ${String(cause)}`);
    return `saving the list failed: ${String(cause)}`;
  }
}

/** Writes fetch_log (F5). Returns false if that failed. */
async function saveLog(
  db: SQLiteDatabase,
  outcome: FetchOutcome,
  startedAtMs: number,
  quotaUsed: number,
  saveError: string | null,
): Promise<boolean> {
  try {
    await insertFetchLog(db, toFetchLog(outcome, startedAtMs, quotaUsed, saveError));
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

async function refreshFeed(db: SQLiteDatabase): Promise<RefreshResult> {
  const startedAtMs = Date.now();
  const input = await readInput(db, startedAtMs);
  if (input === null) {
    return { message: READ_FAILED_MESSAGE, listReplaced: false };
  }
  if (input.channels.length === 0) {
    log('no channels, nothing to fetch');
    return { message: NO_CHANNELS_MESSAGE, listReplaced: false };
  }
  log(`started with ${input.channels.length} channels`);

  const created = createYoutubeClient();
  const outcome = created.ok
    ? await runFetch(input, created.value)
    : failedBeforeStart(created.error);
  const quotaUsed = created.ok ? created.value.unitsUsed() : 0;

  const saveError = await saveList(db, outcome);
  const logSaved = await saveLog(db, outcome, startedAtMs, quotaUsed, saveError);
  const durationMs = Date.now() - startedAtMs;
  fetchSummaryLines(outcome, input.channels.length, quotaUsed, durationMs).forEach(log);
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

  /** Runs one fetch and returns its result, or null if a fetch is already running. */
  const refresh = useCallback(async (): Promise<RefreshResult | null> => {
    if (running.current) return null;
    running.current = true;
    setRefreshing(true);
    try {
      return await refreshFeed(db);
    } finally {
      running.current = false;
      setRefreshing(false);
    }
  }, [db]);

  return { refreshing, refresh };
}
