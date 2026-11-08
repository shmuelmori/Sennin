// The shapes of the rows the app stores (spec §7), in app terms: times in ms
// since the epoch, booleans as booleans. db/ maps the SQLite rows to and from
// these. Also the JSON formats of fetch_log.rejectedByRule and itemsPicked.

import { RULE_NAMES, type RejectedVideo, type RuleName } from './filterRules';

/** One topic in the flat list (spec §2 "Concepts"). */
export type Item = {
  id: number;
  name: string;
  /** The English search query. For an added item, the text that was typed. */
  query: string;
  /** Removed items are not drawn, and can be restored. */
  removed: boolean;
  removedAtMs: number | null;
  /** When the item was last drawn, or null if it never was. */
  lastPickedAtMs: number | null;
  pickCount: number;
  createdAtMs: number;
};

export const FEED_STATUSES = ['unseen', 'watched', 'skipped'] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

/** A video as a fetch saves it in the list (§5 step 6). */
export type NewFeedItem = {
  videoId: string;
  itemId: number;
  /** Kept with the video, so the strip still has it after the item is deleted. */
  itemName: string;
  title: string;
  durationSec: number;
};

export type FeedItem = NewFeedItem & {
  /** Order in the list, from 0. The feed comes first, then the reserve. */
  position: number;
  isReserve: boolean;
  status: FeedStatus;
};

/** What one drawn item gave in a fetch, for the report (§4 Status). */
export type ItemReport = {
  itemId: number;
  name: string;
  /** Video IDs the search returned. */
  results: number;
  /** Videos that passed every rule. */
  passed: number;
  /** Videos that went into the feed. */
  selected: number;
  /** Why the item's search failed, or null. */
  error: string | null;
};

export type NewFetchLog = {
  startedAtMs: number;
  /** How long the fetch took, until the new list was saved. */
  durationMs: number;
  itemsPicked: ItemReport[];
  /** Videos videos.list returned, which the filters checked. */
  fetched: number;
  /** Videos that passed every rule. */
  passed: number;
  /** Each rejected video with the rule that rejected it (F5). */
  rejected: RejectedVideo[];
  quotaUsed: number;
  error: string | null;
};

export type FetchLog = NewFetchLog & { id: number };

export function isFeedStatus(value: string): value is FeedStatus {
  return (FEED_STATUSES as readonly string[]).includes(value);
}

function isRuleName(value: unknown): value is RuleName {
  return (RULE_NAMES as readonly unknown[]).includes(value);
}

function parseList(text: string): unknown[] | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  return Array.isArray(value) ? (value as unknown[]) : null;
}

function isRejectedVideo(value: unknown): value is RejectedVideo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { videoId, rule, detail } = value as Record<string, unknown>;
  return typeof videoId === 'string' && typeof detail === 'string' && isRuleName(rule);
}

/** The text stored in fetch_log.rejectedByRule: a JSON list of {videoId, rule, detail}. */
export function encodeRejections(rejected: readonly RejectedVideo[]): string {
  return JSON.stringify(rejected.map(({ videoId, rule, detail }) => ({ videoId, rule, detail })));
}

/** Reads fetch_log.rejectedByRule back. Returns null if the text isn't a valid list. */
export function decodeRejections(text: string): RejectedVideo[] | null {
  const items = parseList(text);
  if (items === null || !items.every(isRejectedVideo)) {
    return null;
  }
  return items.map(({ videoId, rule, detail }) => ({ videoId, rule, detail }));
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isItemReport(value: unknown): value is ItemReport {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { itemId, name, results, passed, selected, error } = value as Record<string, unknown>;
  return (
    typeof itemId === 'number' &&
    typeof name === 'string' &&
    isCount(results) &&
    isCount(passed) &&
    isCount(selected) &&
    (error === null || typeof error === 'string')
  );
}

/** The text stored in fetch_log.itemsPicked: a JSON list of ItemReport. */
export function encodeItemReports(reports: readonly ItemReport[]): string {
  return JSON.stringify(
    reports.map(({ itemId, name, results, passed, selected, error }) => ({
      itemId,
      name,
      results,
      passed,
      selected,
      error,
    })),
  );
}

/** Reads fetch_log.itemsPicked back. Returns null if the text isn't a valid list. */
export function decodeItemReports(text: string): ItemReport[] | null {
  const items = parseList(text);
  if (items === null || !items.every(isItemReport)) {
    return null;
  }
  return items.map(({ itemId, name, results, passed, selected, error }) => ({
    itemId,
    name,
    results,
    passed,
    selected,
    error,
  }));
}
