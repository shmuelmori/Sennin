import { useCallback, useRef } from 'react';

import {
  formatSkippedLine,
  formatSwitchLine,
  formatSwitchSummary,
  summarizeSwitchTimes,
} from '@/lib/switchTiming';

type PendingSwitch = {
  videoId: string;
  dragEndAt: number;
  settledAt: number;
};

// Measures video switch time (spec §8, status.md step 1.2): from the moment
// the finger lifts after a swipe until the new video reports "playing".
// Logs each switch and a running summary to the terminal running Expo.
export function useSwitchTimer() {
  const lastDragEndAt = useRef<number | null>(null);
  const pending = useRef<PendingSwitch | null>(null);
  const times = useRef<number[]>([]);
  const skipped = useRef(0);

  /** Call when the finger lifts after a drag. */
  const onDragEnd = useCallback(() => {
    lastDragEndAt.current = Date.now();
  }, []);

  /** Call when the list settles on a different video. */
  const onSwitch = useCallback((videoId: string) => {
    const now = Date.now();
    const previous = pending.current;
    if (previous) {
      skipped.current += 1;
      console.log(formatSkippedLine(previous.videoId, now - previous.dragEndAt));
    }
    pending.current = { videoId, dragEndAt: lastDragEndAt.current ?? now, settledAt: now };
  }, []);

  /** Call when a video reports "playing". Ignores videos that weren't just switched to. */
  const onPlaying = useCallback((videoId: string) => {
    const current = pending.current;
    if (!current || current.videoId !== videoId) return;
    pending.current = null;
    const totalMs = Date.now() - current.dragEndAt;
    times.current.push(totalMs);
    const snapMs = current.settledAt - current.dragEndAt;
    console.log(formatSwitchLine(times.current.length, videoId, totalMs, snapMs));
    console.log(formatSwitchSummary(summarizeSwitchTimes(times.current), skipped.current));
  }, []);

  return { onDragEnd, onSwitch, onPlaying };
}
