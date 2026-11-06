import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getFeedItems, skipFeedItem } from '@/db/feed';
import { applySkip, formatSkipLine, isSkipError, planSkip } from '@/lib/autoSkip';
import { feedVideos, startPageIndex } from '@/lib/feedPages';
import type { FeedItem } from '@/lib/records';

// The saved list for the Feed screen (steps 7.1 and 7.3): reads feed_item,
// picks the page to open on, and replaces a video that can't play with one
// from the reserve (F8). Logs [feed] and [skip] lines.

export type FeedState =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | {
      kind: 'ready';
      /** The whole list, feed and reserve. */
      items: FeedItem[];
      /** The videos to show, without the reserve or skipped videos. */
      videos: FeedItem[];
      /** The page to open on. `videos.length` is the end page. */
      startIndex: number;
      /**
       * Goes up on every read, so the screen starts the list over. A skip
       * keeps it, so the feed stays on the same page.
       */
      version: number;
    };

function log(line: string) {
  console.log(`[feed] ${line}`);
}

type Read = { items: FeedItem[]; videos: FeedItem[]; startIndex: number } | null;

async function readFeed(db: SQLiteDatabase): Promise<Read> {
  const startedAt = Date.now();
  try {
    const items = await getFeedItems(db);
    const videos = feedVideos(items);
    const startIndex = startPageIndex(videos);
    const where = startIndex < videos.length ? `video ${startIndex + 1}` : 'the end page';
    log(`list read: ${videos.length} videos, opening on ${where} (${Date.now() - startedAt} ms)`);
    return { items, videos, startIndex };
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
  // The latest state, for skips, which read the list outside of rendering.
  const latest = useRef<FeedState>(state);

  const show = useCallback((read: Read) => {
    const next = nextState(latest.current, read);
    latest.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    let active = true;
    void readFeed(db).then((read) => {
      if (active) show(read);
    });
    return () => {
      active = false;
    };
  }, [db, show]);

  /** Reads the list again, e.g. after a Refresh saved a new one. */
  const reload = useCallback(async () => show(await readFeed(db)), [db, show]);

  /**
   * Call when a player reports an error. If the video can never play here,
   * a reserve video takes its place (F8). Other errors are only logged.
   */
  const onPlayerError = useCallback(
    async (videoId: string, error: string) => {
      console.warn(`[player] ${videoId}: ${error}`);
      const current = latest.current;
      if (!isSkipError(error) || current.kind !== 'ready') return;
      const plan = planSkip(current.items, videoId);
      if (plan === null) return;

      const items = applySkip(current.items, plan);
      const next: FeedState = { ...current, items, videos: feedVideos(items) };
      latest.current = next;
      setState(next);
      console.log(formatSkipLine(plan, error));

      try {
        const saved = await skipFeedItem(db, videoId, plan.replacement?.videoId ?? null);
        if (!saved) console.warn(`[skip] ${videoId}: not found in the saved list`);
      } catch (cause) {
        console.warn(`[skip] saving the skip of ${videoId} failed: ${String(cause)}`);
      }
    },
    [db],
  );

  return { state, reload, onPlayerError };
}
