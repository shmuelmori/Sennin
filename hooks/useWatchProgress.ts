import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { FeedItem } from '@/lib/records';
import {
  EMPTY_CLOCK,
  msUntilWatched,
  type PlayClock,
  playedMsOf,
  startPlaying,
  stopPlaying,
} from '@/lib/watchProgress';

/**
 * Counts how long each video has played (F9, step 7.4) and calls
 * `onHalfPlayed` once, when the playing video reaches half its length.
 * `getItem` looks a video up in the current list; videos not in it, or not
 * unseen, are not counted toward watched.
 */
export function useWatchProgress(
  getItem: (videoId: string) => FeedItem | undefined,
  onHalfPlayed: (item: FeedItem, playedMs: number) => void,
) {
  const clock = useRef<PlayClock>(EMPTY_CLOCK);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Videos already reported, so a late timer can't report one twice.
  const reported = useRef(new Set<string>());

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // Sets a timer for the moment the playing video reaches half its length.
  const schedule = useCallback(() => {
    clearTimer();
    const videoId = clock.current.active?.videoId;
    if (videoId === undefined || reported.current.has(videoId)) return;
    const item = getItem(videoId);
    if (item?.status !== 'unseen') return;
    const waitMs = msUntilWatched(clock.current, Date.now(), item.durationSec);
    if (waitMs === null) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (clock.current.active?.videoId !== videoId) return;
      reported.current.add(videoId);
      onHalfPlayed(item, playedMsOf(clock.current, videoId, Date.now()));
    }, waitMs);
  }, [clearTimer, getItem, onHalfPlayed]);

  /** Call when a player starts playing (true) or stops: pause, buffering, end. */
  const onPlaybackChange = useCallback(
    (videoId: string, playing: boolean) => {
      const now = Date.now();
      clock.current = playing
        ? startPlaying(clock.current, videoId, now)
        : stopPlaying(clock.current, videoId, now);
      schedule();
    },
    [schedule],
  );

  /** Forgets all play time, e.g. when a new list replaces the old one. */
  const reset = useCallback(() => {
    clearTimer();
    clock.current = EMPTY_CLOCK;
  }, [clearTimer]);

  // The WebView may pause without reporting it while the app is in the
  // background, so stop counting there and pick up again on return.
  useEffect(() => {
    let paused: string | null = null;
    const subscription = AppState.addEventListener('change', (next) => {
      const now = Date.now();
      if (next === 'active') {
        if (paused !== null) clock.current = startPlaying(clock.current, paused, now);
        paused = null;
      } else if (clock.current.active !== null) {
        paused = clock.current.active.videoId;
        clock.current = stopPlaying(clock.current, paused, now);
      }
      schedule();
    });
    return () => subscription.remove();
  }, [schedule]);

  useEffect(() => clearTimer, [clearTimer]);

  return { onPlaybackChange, reset };
}
