import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getFeedItems } from '@/db/feed';
import { feedVideos, startPageIndex } from '@/lib/feedPages';
import type { FeedItem } from '@/lib/records';

// The saved list for the Feed screen (step 7.1): reads feed_item and picks
// the page to open on. Logs a [feed] line with the time the read took.

export type FeedState =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | {
      kind: 'ready';
      /** The videos to show, without the reserve. */
      videos: FeedItem[];
      /** The page to open on. `videos.length` is the end page. */
      startIndex: number;
      /** Goes up on every read, so the screen can start the list over. */
      version: number;
    };

function log(line: string) {
  console.log(`[feed] ${line}`);
}

type Read = { videos: FeedItem[]; startIndex: number } | null;

async function readFeed(db: SQLiteDatabase): Promise<Read> {
  const startedAt = Date.now();
  try {
    const videos = feedVideos(await getFeedItems(db));
    const startIndex = startPageIndex(videos);
    const where = startIndex < videos.length ? `video ${startIndex + 1}` : 'the end page';
    log(`list read: ${videos.length} videos, opening on ${where} (${Date.now() - startedAt} ms)`);
    return { videos, startIndex };
  } catch (cause) {
    log(`reading the list failed: ${String(cause)}`);
    return null;
  }
}

function nextState(previous: FeedState, read: Read): FeedState {
  if (read === null) return { kind: 'failed' };
  const version = previous.kind === 'ready' ? previous.version + 1 : 1;
  return { kind: 'ready', ...read, version };
}

export function useFeed() {
  const db = useDatabase();
  const [state, setState] = useState<FeedState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void readFeed(db).then((read) => {
      if (active) setState((previous) => nextState(previous, read));
    });
    return () => {
      active = false;
    };
  }, [db]);

  /** Reads the list again, e.g. after a Refresh saved a new one. */
  const reload = useCallback(async () => {
    const read = await readFeed(db);
    setState((previous) => nextState(previous, read));
  }, [db]);

  return { state, reload };
}
