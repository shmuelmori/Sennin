// The fetch report the Status and Refresh screens show (spec §4, F11): the
// last fetch's time and duration, the items it drew with what each gave, how
// many videos each rule rejected, the API units it used and those left
// today, and any error, plus (Status only) whether the API key is loaded.

import type { ApiKeyCheck } from './apiKey';
import { formatSeconds } from './fetchMessages';
import { countRejectionsByRule, RULE_NAMES, type RuleName } from './filterRules';
import { unitsLeft } from './quota';
import type { FetchLog } from './records';

/** The §5 rules as the Status screen names them. */
export const RULE_LABELS: Record<RuleName, string> = {
  live: 'Live stream',
  length: 'Longer than 3 minutes',
  vertical: 'Not vertical',
  embeddable: "Can't be embedded",
  blockedWord: 'Blocked word',
  minViews: 'Under 1,000 views',
  queryMatch: 'No word from the topic',
};

export type StatusRow = { label: string; value: string };

/** One drawn item: "results / passed / selected", flagged when it gave no video. */
export type ItemRow = StatusRow & { itemId: number; flagged: boolean };

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
      /** Time, duration, topics drawn, videos fetched, passed, selected, rejected and units. */
      summary: StatusRow[];
      /** Each drawn item in draw order. */
      items: ItemRow[];
      /** Every rule in the §5 order, including those that rejected nothing. */
      rules: RuleCount[];
      /** fetch_log.error: why the fetch failed or which items it skipped. */
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

function count(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * The report for the latest fetch_log row, or "no fetch yet" if there is none.
 * `unitsUsedToday` is today's quota_day count, or null if it couldn't be read.
 */
export function buildStatusReport(
  log: FetchLog | null,
  nowMs: number,
  unitsUsedToday: number | null,
): StatusReport {
  if (log === null) {
    return { hasFetch: false };
  }
  const counts = countRejectionsByRule(log.rejected);
  const selected = log.itemsPicked.reduce((sum, item) => sum + item.selected, 0);
  const summary: StatusRow[] = [
    { label: 'Time', value: formatFetchTime(log.startedAtMs, nowMs) },
    { label: 'Duration', value: formatSeconds(log.durationMs) },
    { label: 'Topics drawn', value: count(log.itemsPicked.length) },
    { label: 'Videos fetched', value: count(log.fetched) },
    { label: 'Passed the filters', value: count(log.passed) },
    { label: 'In the list', value: count(selected) },
    { label: 'Rejected', value: count(log.rejected.length) },
    { label: 'API units used', value: count(log.quotaUsed) },
  ];
  if (unitsUsedToday !== null) {
    summary.push({ label: 'API units left today', value: count(unitsLeft(unitsUsedToday)) });
  }
  return {
    hasFetch: true,
    summary,
    items: log.itemsPicked.map((item) => ({
      itemId: item.itemId,
      label: item.name,
      value: `${item.results} / ${item.passed} / ${item.selected}`,
      flagged: item.selected === 0,
    })),
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
