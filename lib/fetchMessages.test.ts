import type { RejectedVideo } from './filterRules';
import {
  describeFetchOutcome,
  fetchLogError,
  fetchSummaryLines,
  formatError,
  formatSeconds,
  quotaLowMessage,
  rejectionLines,
  replacesList,
  toFetchLog,
} from './fetchMessages';
import type { FetchOutcome, SkippedItem } from './fetchPipeline';
import type { Item, ItemReport, NewFeedItem } from './records';
import type { YoutubeError } from './youtubeErrors';

const QUOTA: YoutubeError = { kind: 'quotaExceeded', status: 403, message: 'quota used up' };
const OFFLINE: YoutubeError = { kind: 'network', status: null, message: 'timed out after 15 s' };

function videos(count: number): NewFeedItem[] {
  return Array.from({ length: count }, (_, i) => ({
    videoId: `v${i}`,
    itemId: 1,
    itemName: 'Octopus',
    title: `Video ${i}`,
    durationSec: 30,
  }));
}

const DRAWN: Item[] = [1, 2].map((id) => ({
  id,
  name: id === 1 ? 'Octopus' : 'Iron',
  query: id === 1 ? 'octopus' : 'iron',
  removed: false,
  removedAtMs: null,
  lastPickedAtMs: null,
  pickCount: 0,
  createdAtMs: 0,
}));

const REPORTS: ItemReport[] = [
  { itemId: 1, name: 'Octopus', results: 25, passed: 9, selected: 5, error: null },
  { itemId: 2, name: 'Iron', results: 0, passed: 0, selected: 0, error: 'timed out after 15 s' },
];

const REJECTED: RejectedVideo[] = [
  { videoId: 'r1', rule: 'length', detail: '600 s' },
  { videoId: 'r2', rule: 'length', detail: '400 s' },
  { videoId: 'r3', rule: 'length', detail: '200 s' },
  { videoId: 'r4', rule: 'minViews', detail: '12 views' },
];

const SKIPPED: SkippedItem[] = [{ itemId: 2, name: 'Iron', error: OFFLINE }];

function done(feed: number, reserve: number, skipped: SkippedItem[] = []): FetchOutcome {
  return {
    ok: true,
    feed: videos(feed),
    reserve: videos(reserve),
    rejected: REJECTED,
    drawn: DRAWN,
    reports: REPORTS,
    skipped,
    counts: { drawn: 2, results: 25, toCheck: 20, fetched: 18, passed: 14 },
  };
}

function failed(error: YoutubeError, skipped: SkippedItem[] = []): FetchOutcome {
  return {
    ok: false,
    error,
    drawn: DRAWN,
    reports: REPORTS,
    skipped,
    counts: { drawn: 2, results: 0, toCheck: 0, fetched: 0, passed: 0 },
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

  it('names the failure, the skipped items and the extra error', () => {
    expect(fetchLogError(failed(QUOTA, SKIPPED), 'saving failed')).toBe(
      'failed: quotaExceeded (HTTP 403): quota used up; ' +
        'skipped Iron (item 2): network (HTTP -): timed out after 15 s; saving failed',
    );
  });
});

describe('toFetchLog', () => {
  it('keeps the item reports, the counts, the rejections and the units', () => {
    expect(toFetchLog(done(7, 2), 1000, 4200, 2010)).toEqual({
      startedAtMs: 1000,
      durationMs: 4200,
      itemsPicked: REPORTS,
      fetched: 18,
      passed: 14,
      rejected: REJECTED,
      quotaUsed: 2010,
      error: null,
    });
  });

  it('logs a failed fetch with no rejections', () => {
    const log = toFetchLog(failed(QUOTA), 1000, 300, 500);
    expect(log.rejected).toEqual([]);
    expect(log.itemsPicked).toEqual(REPORTS);
    expect(log.error).toBe('failed: quotaExceeded (HTTP 403): quota used up');
  });
});

describe('formatSeconds', () => {
  it('shows tenths of a second', () => {
    expect(formatSeconds(12_345)).toBe('12.3 s');
    expect(formatSeconds(0)).toBe('0.0 s');
  });

  it('shows a negative duration (clock moved back) as zero', () => {
    expect(formatSeconds(-50)).toBe('0.0 s');
  });
});

describe('quotaLowMessage', () => {
  it('says how many units are left and how many a fetch needs', () => {
    expect(quotaLowMessage(8500)).toEqual({
      title: 'Not enough quota today',
      message:
        '1,500 API units are left today, and a fetch needs 2,100. ' +
        'The quota resets at midnight Pacific time.',
    });
  });
});

describe('describeFetchOutcome', () => {
  it('reports a new list', () => {
    expect(describeFetchOutcome(done(7, 2))).toEqual({
      title: 'New list ready',
      message: '7 videos from 2 topics, plus 2 in reserve.',
    });
  });

  it('names skipped items', () => {
    expect(describeFetchOutcome(done(1, 0, SKIPPED)).message).toBe(
      "1 video from 2 topics, no reserve.\n\nSkipped 1 topic YouTube couldn't search: Iron.",
    );
  });

  it('says the list stays when nothing new passed', () => {
    expect(describeFetchOutcome(done(0, 0))).toEqual({
      title: 'No new videos found',
      message: 'The drawn topics have no new Shorts that pass the filters. Your current list stays.',
    });
  });

  it('explains a failure and that the list stays', () => {
    expect(describeFetchOutcome(failed(QUOTA))).toEqual({
      title: "Couldn't refresh",
      message:
        "Today's YouTube API quota is used up. It resets at midnight Pacific time. " +
        'Your current list stays.',
    });
  });
});

describe('fetchSummaryLines', () => {
  it('gives the counts, each item, the units and the time', () => {
    expect(fetchSummaryLines(done(7, 2), 2010, 8400)).toEqual([
      '2 topics drawn, 25 results, 20 to check, 18 fetched (2 private or deleted)',
      '14 passed, 4 rejected',
      '  Octopus: 25 results, 9 passed, 5 selected',
      '  Iron: 0 results, 0 passed, 0 selected',
      'new list: 7 + 2 reserve, 2010 units, 8.4 s',
    ]);
  });

  it('says when the list is kept', () => {
    expect(fetchSummaryLines(done(0, 0), 2010, 1000).at(-1)).toBe(
      'no new videos, list kept, 2010 units, 1.0 s',
    );
  });

  it('lists skipped items and the failure', () => {
    expect(fetchSummaryLines(failed(QUOTA, SKIPPED), 1, 200)).toEqual([
      'skipped Iron (item 2): network (HTTP -): timed out after 15 s',
      'failed: quotaExceeded (HTTP 403): quota used up, 1 unit, 0.2 s',
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
      'minViews: 1, e.g. r4 (12 views)',
      'queryMatch: 0',
    ]);
  });
});
