import type { RejectedVideo } from './filterRules';
import {
  describeFetchOutcome,
  fetchLogError,
  fetchSummaryLines,
  formatError,
  formatSeconds,
  rejectionLines,
  replacesList,
  toFetchLog,
} from './fetchMessages';
import type { FetchOutcome, SkippedChannel } from './fetchPipeline';
import type { NewFeedItem } from './records';
import type { YoutubeError } from './youtubeErrors';

const QUOTA: YoutubeError = { kind: 'quotaExceeded', status: 403, message: 'quota used up' };
const GONE: YoutubeError = { kind: 'notFound', status: 404, message: 'playlist not found' };
const OFFLINE: YoutubeError = { kind: 'network', status: null, message: 'timed out after 15 s' };

function items(count: number): NewFeedItem[] {
  return Array.from({ length: count }, (_, i) => ({
    videoId: `v${i}`,
    channelId: 'a',
    channelTitle: 'A',
    title: `Video ${i}`,
    durationSec: 30,
  }));
}

const REJECTED: RejectedVideo[] = [
  { videoId: 'r1', rule: 'length', detail: '600 s' },
  { videoId: 'r2', rule: 'length', detail: '400 s' },
  { videoId: 'r3', rule: 'length', detail: '200 s' },
  { videoId: 'r4', rule: 'minViews', detail: '12 views' },
];

const SKIPPED: SkippedChannel[] = [{ channelId: 'UCgone', title: 'Gone', error: GONE }];

function done(feed: number, reserve: number, skipped: SkippedChannel[] = []): FetchOutcome {
  return {
    ok: true,
    feed: items(feed),
    reserve: items(reserve),
    rejected: REJECTED,
    skipped,
    counts: { channelsRead: 3, uploads: 150, toCheck: 120, fetched: 118 },
  };
}

function failed(error: YoutubeError, skipped: SkippedChannel[] = []): FetchOutcome {
  return {
    ok: false,
    error,
    skipped,
    counts: { channelsRead: 0, uploads: 0, toCheck: 0, fetched: 0 },
  };
}

describe('replacesList', () => {
  it('is true only when the fetch found videos', () => {
    expect(replacesList(done(15, 10))).toBe(true);
    expect(replacesList(done(0, 0))).toBe(false);
    expect(replacesList(failed(QUOTA))).toBe(false);
  });
});

describe('formatError', () => {
  it('shows the kind, the HTTP status and the message', () => {
    expect(formatError(QUOTA)).toBe('quotaExceeded (HTTP 403): quota used up');
    expect(formatError(OFFLINE)).toBe('network (HTTP -): timed out after 15 s');
  });
});

describe('fetchLogError', () => {
  it('is null for a clean fetch', () => {
    expect(fetchLogError(done(15, 10))).toBeNull();
  });

  it('names the failure, the skipped channels and the extra error', () => {
    expect(fetchLogError(failed(QUOTA, SKIPPED), 'saving failed')).toBe(
      'failed: quotaExceeded (HTTP 403): quota used up; ' +
        'skipped Gone (UCgone): notFound (HTTP 404): playlist not found; saving failed',
    );
  });
});

describe('toFetchLog', () => {
  it('keeps the rejections, the fetched count and the units', () => {
    expect(toFetchLog(done(15, 10, SKIPPED), 1000, 13_400, 34)).toEqual({
      startedAtMs: 1000,
      finishedAtMs: 13_400,
      fetched: 118,
      rejected: REJECTED,
      quotaUsed: 34,
      error: 'skipped Gone (UCgone): notFound (HTTP 404): playlist not found',
    });
  });

  it('logs a failed fetch with no rejections', () => {
    expect(toFetchLog(failed(QUOTA), 1000, 2000, 5)).toEqual({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      fetched: 0,
      rejected: [],
      quotaUsed: 5,
      error: 'failed: quotaExceeded (HTTP 403): quota used up',
    });
  });
});

describe('formatSeconds', () => {
  it('shows tenths of a second', () => {
    expect(formatSeconds(12_345)).toBe('12.3 s');
    expect(formatSeconds(0)).toBe('0.0 s');
    expect(formatSeconds(65_000)).toBe('65.0 s');
  });

  it('shows a negative duration (clock moved back) as zero', () => {
    expect(formatSeconds(-500)).toBe('0.0 s');
  });
});

describe('describeFetchOutcome', () => {
  it('reports a new list', () => {
    expect(describeFetchOutcome(done(15, 10))).toEqual({
      title: 'New list ready',
      message: '15 videos, plus 10 in reserve.',
    });
    expect(describeFetchOutcome(done(1, 0)).message).toBe('1 video, no reserve.');
  });

  it('names skipped channels', () => {
    expect(describeFetchOutcome(done(15, 2, SKIPPED)).message).toBe(
      "15 videos, plus 2 in reserve.\n\nSkipped 1 channel YouTube couldn't read: Gone.",
    );
  });

  it('says the list stays when nothing new passed', () => {
    expect(describeFetchOutcome(done(0, 0))).toEqual({
      title: 'No new videos found',
      message: 'Your channels have no new Shorts that pass the filters. Your current list stays.',
    });
  });

  it('explains a failure and that the list stays', () => {
    expect(describeFetchOutcome(failed(QUOTA))).toEqual({
      title: "Couldn't refresh",
      message:
        "Today's YouTube API quota is used up. It resets at midnight Pacific time. Your current list stays.",
    });
    expect(describeFetchOutcome(failed(GONE)).message).toBe(
      "YouTube couldn't find your channels' uploads. Your current list stays.",
    );
  });
});

describe('fetchSummaryLines', () => {
  it('gives the counts, the units and the time', () => {
    expect(fetchSummaryLines(done(15, 10), 3, 6, 4321)).toEqual([
      '3 of 3 channels read, 150 uploads, 120 to check, 118 fetched (2 private or deleted)',
      '114 passed, 4 rejected',
      'new list: 15 + 10 reserve, 6 units, 4.3 s',
    ]);
  });

  it('says when the list is kept', () => {
    expect(fetchSummaryLines(done(0, 0), 3, 4, 1000).at(-1)).toBe(
      'no new videos, list kept, 4 units, 1.0 s',
    );
  });

  it('lists skipped channels and the failure', () => {
    expect(fetchSummaryLines(failed(QUOTA, SKIPPED), 2, 1, 500)).toEqual([
      'skipped Gone (UCgone): notFound (HTTP 404): playlist not found',
      'failed: quotaExceeded (HTTP 403): quota used up, 1 unit, 0.5 s',
    ]);
  });
});

describe('rejectionLines', () => {
  it('gives every rule with its count and a few examples', () => {
    expect(rejectionLines(REJECTED)).toEqual([
      'live: 0',
      'length: 3, e.g. r1 (600 s), r2 (400 s)',
      'vertical: 0',
      'embeddable: 0',
      'blockedWord: 0',
      'keyword: 0',
      'minViews: 1, e.g. r4 (12 views)',
    ]);
  });
});
