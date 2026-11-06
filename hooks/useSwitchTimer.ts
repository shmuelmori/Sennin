import { useCallback, useRef } from 'react';

import {
  formatOpenLine,
  formatSkippedLine,
  formatSwitchLine,
  formatSwitchSummary,
  summarizeSwitchTimes,
} from '@/lib/switchTiming';

// When this module first loads, which is while the app's JavaScript starts.
const appStartedAt = Date.now();

type PendingSwitch = {
  videoId: string;
  dragEndAt: number;
  /** When the feed picked the new page: early in the snap since step 7.5. */
  pickedAt: number;
};

// Measures video switch time (spec §8, status.md step 1.2): from the moment
// the finger lifts after a swipe until the new video reports "playing".
// Logs each switch and a running summary to the terminal running Expo.
// Also logs, once, how long after the app started the first video played
// (spec §8, app open with an existing list).
export function useSwitchTimer() {
  const lastDragEndAt = useRef<number | null>(null);
  const pending = useRef<PendingSwitch | null>(null);
  const times = useRef<number[]>([]);
  const skipped = useRef(0);
  const openLogged = useRef(false);

  /** Call when the finger lifts after a drag. */
  const onDragEnd = useCallback(() => {
    lastDragEndAt.current = Date.now();
  }, []);

  /** Call when the feed moves to a different video. */
  const onSwitch = useCallback((videoId: string) => {
    const now = Date.now();
    const previous = pending.current;
    if (previous) {
      skipped.current += 1;
      console.log(formatSkippedLine(previous.videoId, now - previous.dragEndAt));
    }
    pending.current = { videoId, dragEndAt: lastDragEndAt.current ?? now, pickedAt: now };
  }, []);

  /** Call when a video reports "playing". Ignores videos that weren't just switched to. */
  const onPlaying = useCallback((videoId: string) => {
    if (!openLogged.current) {
      openLogged.current = true;
      console.log(formatOpenLine(videoId, Date.now() - appStartedAt));
    }
    const current = pending.current;
    if (!current || current.videoId !== videoId) return;
    pending.current = null;
    const totalMs = Date.now() - current.dragEndAt;
    times.current.push(totalMs);
    const pickedMs = current.pickedAt - current.dragEndAt;
    console.log(formatSwitchLine(times.current.length, videoId, totalMs, pickedMs));
    console.log(formatSwitchSummary(summarizeSwitchTimes(times.current), skipped.current));
  }, []);

  return { onDragEnd, onSwitch, onPlaying };
}
