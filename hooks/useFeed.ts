import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getFeedItems, skipFeedItem } from '@/db/feed';
import { recordWatched } from '@/db/watched';
import { useFeedListSignal } from '@/hooks/FeedListSignal';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { applySkip, formatSkipLine, isSkipError, planSkip } from '@/lib/autoSkip';
import { feedVideos, startPageIndex } from '@/lib/feedPages';
import type { FeedItem } from '@/lib/records';
import { formatWatchedLine, markItemWatched } from '@/lib/watchProgress';

// The saved list for the Feed screen (steps 7.1, 7.3 and 7.4): reads
// feed_item, picks the page to open on, replaces a video that can't play with
// one from the reserve (F8), and saves a video as watched once half of it has
// played (F9). Reads the list again when a Refresh on the Refresh tab saves
// a new one. Logs [feed], [skip] and [watched] lines.

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

  const getItem = useCallback((videoId: string) => {
    const current = latest.current;
    return current.kind === 'ready'
      ? current.items.find((item) => item.videoId === videoId)
      : undefined;
  }, []);

  // F9: half played, so save it as watched. Fetches leave watched videos out.
  const onHalfPlayed = useCallback(
    (item: FeedItem, playedMs: number) => {
      const current = latest.current;
      if (current.kind === 'ready') {
        const items = markItemWatched(current.items, item.videoId);
        const next: FeedState = { ...current, items, videos: feedVideos(items) };
        latest.current = next;
        setState(next);
      }
      console.log(formatWatchedLine(item.videoId, playedMs, item.durationSec));
      recordWatched(db, item.videoId, Date.now()).catch((cause: unknown) => {
        console.warn(`[watched] saving ${item.videoId} failed: ${String(cause)}`);
      });
    },
    [db],
  );

  const { onPlaybackChange, reset: resetWatch } = useWatchProgress(getItem, onHalfPlayed);

  /** Reads the list again, e.g. after a Refresh saved a new one. */
  const reload = useCallback(async () => {
    resetWatch();
    show(await readFeed(db));
  }, [db, show, resetWatch]);

  // A Refresh saved a new list. Compared with the count when the Feed first
  // mounted, so a list saved before the Feed tab opened isn't read twice.
  const { savedCount } = useFeedListSignal();
  const seenCount = useRef(savedCount);
  useEffect(() => {
    if (savedCount === seenCount.current) return;
    seenCount.current = savedCount;
    void reload();
  }, [savedCount, reload]);

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

  return { state, reload, onPlayerError, onPlaybackChange };
}
