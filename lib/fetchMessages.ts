// What a finished fetch turns into (F4, F5, step 6.2): the fetch_log row, the
// message the Feed shows after Refresh, and the [fetch] lines for the Expo terminal.

import { countRejectionsByRule, RULE_NAMES, type RejectedVideo } from './filterRules';
import type { FetchOutcome } from './fetchPipeline';
import type { NewFetchLog } from './records';
import { describeYoutubeError, type YoutubeError } from './youtubeErrors';

export type FetchMessage = { title: string; message: string };

export const NO_CHANNELS_MESSAGE: FetchMessage = {
  title: 'No channels yet',
  message: 'Add channels in Sources, then tap Refresh.',
};

export const READ_FAILED_MESSAGE: FetchMessage = {
  title: "Couldn't refresh",
  message: "Couldn't read your saved channels and list.",
};

export const SAVE_FAILED_MESSAGE: FetchMessage = {
  title: "Couldn't refresh",
  message: "Couldn't save the new list. Your current list stays.",
};

const LIST_STAYS = 'Your current list stays.';

type DoneOutcome = Extract<FetchOutcome, { ok: true }>;

/** Whether the fetch found videos for a new list. If not, the current list stays. */
export function replacesList(outcome: FetchOutcome): outcome is DoneOutcome {
  return outcome.ok && outcome.feed.length > 0;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** The error for logs: kind, HTTP status and YouTube's own message. */
export function formatError(error: YoutubeError): string {
  return `${error.kind} (HTTP ${error.status ?? '-'}): ${error.message}`;
}

/**
 * The fetch_log.error text: why the fetch failed, which channels it skipped,
 * and `extra` (e.g. a failed save), joined by "; ". null if there's nothing to report.
 */
export function fetchLogError(outcome: FetchOutcome, extra: string | null = null): string | null {
  const parts: string[] = [];
  if (!outcome.ok) {
    parts.push(`failed: ${formatError(outcome.error)}`);
  }
  for (const channel of outcome.skipped) {
    parts.push(`skipped ${channel.title} (${channel.channelId}): ${formatError(channel.error)}`);
  }
  if (extra !== null) {
    parts.push(extra);
  }
  return parts.length === 0 ? null : parts.join('; ');
}

/** The fetch_log row (F5): every rejected video with its rule, the units used and when it ran. */
export function toFetchLog(
  outcome: FetchOutcome,
  startedAtMs: number,
  finishedAtMs: number,
  quotaUsed: number,
  extraError: string | null = null,
): NewFetchLog {
  return {
    startedAtMs,
    finishedAtMs,
    fetched: outcome.counts.fetched,
    rejected: outcome.ok ? outcome.rejected : [],
    quotaUsed,
    error: fetchLogError(outcome, extraError),
  };
}

function describeFetchError(error: YoutubeError): string {
  // describeYoutubeError's "YouTube couldn't find it." is unclear for a whole fetch.
  return error.kind === 'notFound'
    ? "YouTube couldn't find your channels' uploads."
    : describeYoutubeError(error);
}

/** The message shown after Refresh. */
export function describeFetchOutcome(outcome: FetchOutcome): FetchMessage {
  if (!outcome.ok) {
    return {
      title: "Couldn't refresh",
      message: `${describeFetchError(outcome.error)} ${LIST_STAYS}`,
    };
  }
  const lines: string[] = [];
  let title: string;
  if (outcome.feed.length === 0) {
    title = 'No new videos found';
    lines.push(`Your channels have no new Shorts that pass the filters. ${LIST_STAYS}`);
  } else {
    title = 'New list ready';
    const reserve =
      outcome.reserve.length === 0 ? 'no reserve' : `plus ${outcome.reserve.length} in reserve`;
    lines.push(`${plural(outcome.feed.length, 'video')}, ${reserve}.`);
  }
  if (outcome.skipped.length > 0) {
    const names = outcome.skipped.map((channel) => channel.title).join(', ');
    lines.push(`Skipped ${plural(outcome.skipped.length, 'channel')} YouTube couldn't read: ${names}.`);
  }
  return { title, message: lines.join('\n\n') };
}

/** A fetch's duration as the [fetch] lines and the report show it: "12.3 s". */
export function formatSeconds(durationMs: number): string {
  return `${(Math.max(0, durationMs) / 1000).toFixed(1)} s`;
}

/** The [fetch] summary for the Expo terminal: counts, units and time (§8 targets). */
export function fetchSummaryLines(
  outcome: FetchOutcome,
  channelCount: number,
  quotaUsed: number,
  durationMs: number,
): string[] {
  const cost = `${plural(quotaUsed, 'unit')}, ${formatSeconds(durationMs)}`;
  const lines = outcome.skipped.map(
    (channel) => `skipped ${channel.title} (${channel.channelId}): ${formatError(channel.error)}`,
  );
  if (!outcome.ok) {
    lines.push(`failed: ${formatError(outcome.error)}, ${cost}`);
    return lines;
  }
  const { channelsRead, uploads, toCheck, fetched } = outcome.counts;
  const rejected = outcome.rejected.length;
  lines.push(
    `${channelsRead} of ${plural(channelCount, 'channel')} read, ${uploads} uploads, ` +
      `${toCheck} to check, ${fetched} fetched (${toCheck - fetched} private or deleted)`,
  );
  lines.push(`${fetched - rejected} passed, ${rejected} rejected`);
  lines.push(
    replacesList(outcome)
      ? `new list: ${outcome.feed.length} + ${outcome.reserve.length} reserve, ${cost}`
      : `no new videos, list kept, ${cost}`,
  );
  return lines;
}

/**
 * One line per rule, in the §5 order: how many videos it rejected, with up to
 * `examples` of them, so the stored rejections can be checked by eye.
 */
export function rejectionLines(rejected: readonly RejectedVideo[], examples = 2): string[] {
  const counts = countRejectionsByRule(rejected);
  return RULE_NAMES.map((rule) => {
    const sample = rejected
      .filter((video) => video.rule === rule)
      .slice(0, examples)
      .map((video) => `${video.videoId} (${video.detail})`);
    return sample.length === 0
      ? `${rule}: ${counts[rule]}`
      : `${rule}: ${counts[rule]}, e.g. ${sample.join(', ')}`;
  });
}
