// Mark as watched (F9, step 7.4): a video counts as watched once half of it
// has played. Play time is counted from the player's own "playing" and
// "stopped" reports, so pauses, buffering and time spent on other pages
// don't count. Only one video plays at a time.

import type { FeedItem } from './records';

export type PlayClock = {
  /** Play time counted so far per video, not including the current run. */
  playedMs: ReadonlyMap<string, number>;
  /** The video playing now, and since when. */
  active: { videoId: string; sinceMs: number } | null;
};

export const EMPTY_CLOCK: PlayClock = { playedMs: new Map(), active: null };

/** How long a video must play to count as watched: half its length. */
export function watchThresholdMs(durationSec: number): number {
  return Number.isFinite(durationSec) && durationSec > 0 ? durationSec * 500 : 0;
}

/** Ends the current run, adding its time to that video's total. */
function closeRun(clock: PlayClock, nowMs: number): PlayClock {
  const { active } = clock;
  if (active === null) return clock;
  const playedMs = new Map(clock.playedMs);
  const run = Math.max(0, nowMs - active.sinceMs);
  playedMs.set(active.videoId, (playedMs.get(active.videoId) ?? 0) + run);
  return { playedMs, active: null };
}

/**
 * A video reports "playing". Any other video stops counting, since only
 * one plays at a time, even if its "stopped" report never arrived.
 */
export function startPlaying(clock: PlayClock, videoId: string, nowMs: number): PlayClock {
  if (clock.active?.videoId === videoId) return clock;
  return { ...closeRun(clock, nowMs), active: { videoId, sinceMs: nowMs } };
}

/** A video reports it stopped (paused, buffering, ended). Others are unaffected. */
export function stopPlaying(clock: PlayClock, videoId: string, nowMs: number): PlayClock {
  if (clock.active?.videoId !== videoId) return clock;
  return closeRun(clock, nowMs);
}

/** Total play time of a video, including the current run. */
export function playedMsOf(clock: PlayClock, videoId: string, nowMs: number): number {
  const past = clock.playedMs.get(videoId) ?? 0;
  const { active } = clock;
  return active?.videoId === videoId ? past + Math.max(0, nowMs - active.sinceMs) : past;
}

/**
 * How long until the playing video reaches half its length: 0 if it already
 * has, null if no video is playing.
 */
export function msUntilWatched(
  clock: PlayClock,
  nowMs: number,
  durationSec: number,
): number | null {
  if (clock.active === null) return null;
  const played = playedMsOf(clock, clock.active.videoId, nowMs);
  return Math.max(0, watchThresholdMs(durationSec) - played);
}

/** Marks an unseen video as watched in the list in memory, like db/watched.ts does. */
export function markItemWatched(items: readonly FeedItem[], videoId: string): FeedItem[] {
  return items.map((item) =>
    item.videoId === videoId && item.status === 'unseen' ? { ...item, status: 'watched' } : item,
  );
}

/** Log line for a video marked as watched. */
export function formatWatchedLine(videoId: string, playedMs: number, durationSec: number): string {
  const played = (playedMs / 1000).toFixed(1);
  return `[watched] ${videoId}: ${played} s of ${durationSec} s played`;
}
