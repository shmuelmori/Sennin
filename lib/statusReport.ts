// The fetch report the Status and Refresh screens show (spec §4, F11): the
// last fetch's time and duration, how many videos it fetched, how many each
// rule rejected, the API units it used and any error, plus (Status only)
// whether the API key is loaded.

import type { ApiKeyCheck } from './apiKey';
import { formatSeconds } from './fetchMessages';
import { countRejectionsByRule, RULE_NAMES, type RuleName } from './filterRules';
import type { FetchLog } from './records';

/** The §5 rules as the Status screen names them. */
export const RULE_LABELS: Record<RuleName, string> = {
  live: 'Live stream',
  length: 'Longer than 3 minutes',
  vertical: 'Not vertical',
  embeddable: "Can't be embedded",
  blockedWord: 'Blocked word',
  keyword: 'No topic keyword',
  minViews: 'Under 1,000 views',
};

export type StatusRow = { label: string; value: string };

export type RuleCount = { rule: RuleName; label: string; count: number };

/** The report as a screen holds it: still reading fetch_log, failed to, or ready. */
export type FetchReportState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; report: StatusReport };

export type StatusReport =
  | { hasFetch: false }
  | {
      hasFetch: true;
      /** Time, duration, videos fetched, passed, rejected and units used. */
      summary: StatusRow[];
      /** Every rule in the §5 order, including those that rejected nothing. */
      rules: RuleCount[];
      /** fetch_log.error: why the fetch failed or which channels it skipped. */
      error: string | null;
    };

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** How long ago, roughly: "just now", "5 min ago", "3 h ago", "2 days ago". */
export function formatAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/**
 * The fetch time in the phone's local time: "Today 14:32", "Yesterday 09:05"
 * or "2026-11-03 18:40", followed by the age, e.g. "Today 14:32 (5 min ago)".
 */
export function formatFetchTime(startedAtMs: number, nowMs: number): string {
  const started = new Date(startedAtMs);
  const now = new Date(nowMs);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const clock = `${pad2(started.getHours())}:${pad2(started.getMinutes())}`;
  const day = isSameDay(started, now)
    ? 'Today'
    : isSameDay(started, yesterday)
      ? 'Yesterday'
      : `${started.getFullYear()}-${pad2(started.getMonth() + 1)}-${pad2(started.getDate())}`;
  return `${day} ${clock} (${formatAge(Math.max(0, nowMs - startedAtMs))})`;
}

/** How long the fetch took, or "—" for a fetch logged before schema v2 saved the end. */
export function formatFetchDuration(log: Pick<FetchLog, 'startedAtMs' | 'finishedAtMs'>): string {
  return log.finishedAtMs === null ? '—' : formatSeconds(log.finishedAtMs - log.startedAtMs);
}

/** The report for the latest fetch_log row, or "no fetch yet" if there is none. */
export function buildStatusReport(log: FetchLog | null, nowMs: number): StatusReport {
  if (log === null) {
    return { hasFetch: false };
  }
  const counts = countRejectionsByRule(log.rejected);
  const rejected = log.rejected.length;
  return {
    hasFetch: true,
    summary: [
      { label: 'Time', value: formatFetchTime(log.startedAtMs, nowMs) },
      { label: 'Duration', value: formatFetchDuration(log) },
      { label: 'Videos fetched', value: String(log.fetched) },
      { label: 'Passed the filters', value: String(Math.max(0, log.fetched - rejected)) },
      { label: 'Rejected', value: String(rejected) },
      { label: 'API units used', value: String(log.quotaUsed) },
    ],
    rules: RULE_NAMES.map((rule) => ({ rule, label: RULE_LABELS[rule], count: counts[rule] })),
    error: log.error,
  };
}

/** The API key line: loaded (with its last 4 characters), missing or malformed. */
export function describeApiKeyStatus(check: ApiKeyCheck): string {
  if (check.ok) {
    return `Loaded (…${check.key.slice(-4)})`;
  }
  return check.reason === 'missing' ? 'Missing: add it to .env' : "Doesn't look valid: check .env";
}
