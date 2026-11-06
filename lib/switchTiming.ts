// Pure helpers for measuring video switch time (spec §8, status.md step 1.2).

/** Spec §8: switching between videos takes under one second... */
export const SWITCH_TARGET_MS = 1000;

/** ...in 80% of cases. */
export const SWITCH_TARGET_SHARE = 0.8;

export type SwitchSummary = {
  count: number;
  underTarget: number;
  /** Share of switches under the target, from 0 to 1. */
  shareUnderTarget: number;
  medianMs: number;
  slowestMs: number;
  meetsTarget: boolean;
};

/** Summarizes measured switch times against the §8 target. */
export function summarizeSwitchTimes(timesMs: readonly number[]): SwitchSummary {
  if (timesMs.length === 0) {
    return {
      count: 0,
      underTarget: 0,
      shareUnderTarget: 0,
      medianMs: 0,
      slowestMs: 0,
      meetsTarget: false,
    };
  }
  const sorted = [...timesMs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianMs = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const underTarget = sorted.filter((ms) => ms < SWITCH_TARGET_MS).length;
  const shareUnderTarget = underTarget / sorted.length;
  return {
    count: sorted.length,
    underTarget,
    shareUnderTarget,
    medianMs,
    slowestMs: sorted[sorted.length - 1],
    meetsTarget: shareUnderTarget >= SWITCH_TARGET_SHARE,
  };
}

/** Log line for one measured switch. */
export function formatSwitchLine(
  number: number,
  videoId: string,
  totalMs: number,
  pickedMs: number,
): string {
  return `[switch] #${number} ${videoId}: ${totalMs} ms (page picked after ${pickedMs} ms)`;
}

/** Log line for a switch that was swiped away before its video started. */
export function formatSkippedLine(videoId: string, elapsedMs: number): string {
  return `[switch] ${videoId}: swiped away after ${elapsedMs} ms, before it started playing`;
}

/** Log line with the running totals. */
export function formatSwitchSummary(summary: SwitchSummary, skipped: number): string {
  const percent = Math.round(summary.shareUnderTarget * 100);
  const verdict = summary.meetsTarget ? 'met' : 'not met';
  return (
    `[switch] ${summary.count} switches: ${summary.underTarget} under 1 s (${percent}%), ` +
    `median ${Math.round(summary.medianMs)} ms, slowest ${summary.slowestMs} ms, ` +
    `${skipped} skipped. Target (80% under 1 s): ${verdict}`
  );
}

/** Spec §8: opening the app with an existing list takes under 2 seconds. */
export const OPEN_TARGET_MS = 2000;

/**
 * Log line for the first video starting after the app opened. Measured from
 * when the app's JavaScript started, so Expo Go's own startup isn't included.
 */
export function formatOpenLine(videoId: string, elapsedMs: number): string {
  const verdict = elapsedMs < OPEN_TARGET_MS ? 'met' : 'not met';
  return `[open] first video ${videoId} playing ${elapsedMs} ms after the app started. Target (under 2 s): ${verdict}`;
}
