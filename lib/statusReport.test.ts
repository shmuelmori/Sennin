import type { RejectedVideo } from './filterRules';
import type { FetchLog } from './records';
import {
  buildStatusReport,
  describeApiKeyStatus,
  formatAge,
  formatFetchTime,
  RULE_LABELS,
} from './statusReport';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Local-time dates, so the tests pass in any time zone.
const NOW = new Date(2026, 10, 6, 14, 37).getTime();

function log(overrides: Partial<FetchLog> = {}): FetchLog {
  return {
    id: 1,
    startedAtMs: new Date(2026, 10, 6, 14, 32).getTime(),
    durationMs: 12_400,
    itemsPicked: [
      { itemId: 1, name: 'Octopus', results: 25, passed: 9, selected: 5, error: null },
      { itemId: 2, name: 'Iron', results: 3, passed: 0, selected: 0, error: null },
    ],
    fetched: 100,
    passed: 97,
    rejected: [],
    quotaUsed: 2010,
    error: null,
    ...overrides,
  };
}

const REJECTED: RejectedVideo[] = [
  { videoId: 'a', rule: 'length', detail: '600 s' },
  { videoId: 'b', rule: 'length', detail: '400 s' },
  { videoId: 'c', rule: 'minViews', detail: '12 views' },
];

describe('formatAge', () => {
  it.each([
    [0, 'just now'],
    [59_999, 'just now'],
    [MIN, '1 min ago'],
    [59 * MIN, '59 min ago'],
    [HOUR, '1 h ago'],
    [23 * HOUR + 59 * MIN, '23 h ago'],
    [DAY, '1 day ago'],
    [3 * DAY + HOUR, '3 days ago'],
  ])('%d ms is "%s"', (ageMs, expected) => {
    expect(formatAge(ageMs)).toBe(expected);
  });
});

describe('formatFetchTime', () => {
  it('says Today for a fetch earlier the same day', () => {
    expect(formatFetchTime(new Date(2026, 10, 6, 14, 32).getTime(), NOW)).toBe(
      'Today 14:32 (5 min ago)',
    );
  });

  it('pads hours and minutes', () => {
    expect(formatFetchTime(new Date(2026, 10, 6, 9, 5).getTime(), NOW)).toBe(
      'Today 09:05 (5 h ago)',
    );
  });

  it('says Yesterday for a fetch the day before, even less than 24 h ago', () => {
    expect(formatFetchTime(new Date(2026, 10, 5, 23, 50).getTime(), NOW)).toBe(
      'Yesterday 23:50 (14 h ago)',
    );
  });

  it('shows the date for older fetches', () => {
    expect(formatFetchTime(new Date(2026, 10, 3, 18, 40).getTime(), NOW)).toBe(
      '2026-11-03 18:40 (2 days ago)',
    );
  });

  it('handles Yesterday across a month boundary', () => {
    const now = new Date(2026, 11, 1, 8, 0).getTime();
    expect(formatFetchTime(new Date(2026, 10, 30, 20, 0).getTime(), now)).toBe(
      'Yesterday 20:00 (12 h ago)',
    );
  });

  it('says just now if the clock moved back', () => {
    expect(formatFetchTime(NOW + MIN, NOW)).toBe('Today 14:38 (just now)');
  });
});

describe('buildStatusReport', () => {
  it('reports no fetch when there is no log', () => {
    expect(buildStatusReport(null, NOW, 0)).toEqual({ hasFetch: false });
  });

  it('shows the time, counts and units of the last fetch', () => {
    const report = buildStatusReport(log({ rejected: REJECTED }), NOW, 4020);
    if (!report.hasFetch) throw new Error('expected a fetch');
    expect(report.summary).toEqual([
      { label: 'Time', value: 'Today 14:32 (5 min ago)' },
      { label: 'Duration', value: '12.4 s' },
      { label: 'Topics drawn', value: '2' },
      { label: 'Videos fetched', value: '100' },
      { label: 'Passed the filters', value: '97' },
      { label: 'In the list', value: '5' },
      { label: 'Rejected', value: '3' },
      { label: 'API units used', value: '2,010' },
      { label: 'API units left today', value: '5,980' },
    ]);
    expect(report.error).toBeNull();
  });

  it('gives the same numbers as stats for the Refresh tab', () => {
    const report = buildStatusReport(log({ rejected: REJECTED }), NOW, 4020);
    if (!report.hasFetch) throw new Error('expected a fetch');
    expect(report.stats).toEqual({
      fetchedAt: 'Today 14:32 (5 min ago)',
      duration: '12.4 s',
      topicsDrawn: '2',
      fetched: '100',
      passed: '97',
      selected: '5',
      rejected: '3',
      unitsUsed: '2,010',
      unitsLeftToday: '5,980',
      usedTodayPercent: 40,
    });
  });

  it('leaves out the units left when today’s count is unknown', () => {
    const report = buildStatusReport(log(), NOW, null);
    if (!report.hasFetch) throw new Error('expected a fetch');
    expect(report.summary.map((row) => row.label)).not.toContain('API units left today');
    expect(report.stats.unitsLeftToday).toBeNull();
    expect(report.stats.usedTodayPercent).toBeNull();
  });

  it('lists each drawn item and flags one that gave no video', () => {
    const report = buildStatusReport(log(), NOW, 0);
    if (!report.hasFetch) throw new Error('expected a fetch');
    expect(report.items).toEqual([
      { itemId: 1, label: 'Octopus', value: '25 / 9 / 5', flagged: false },
      { itemId: 2, label: 'Iron', value: '3 / 0 / 0', flagged: true },
    ]);
  });

  it('lists every rule in the §5 order, with zeros', () => {
    const report = buildStatusReport(log({ rejected: REJECTED }), NOW, 0);
    if (!report.hasFetch) throw new Error('expected a fetch');
    expect(report.rules).toEqual([
      { rule: 'live', label: 'Live stream', count: 0 },
      { rule: 'length', label: 'Longer than 3 minutes', count: 2 },
      { rule: 'vertical', label: 'Not vertical', count: 0 },
      { rule: 'embeddable', label: "Can't be embedded", count: 0 },
      { rule: 'blockedWord', label: 'Blocked word', count: 0 },
      { rule: 'minViews', label: 'Under 1,000 views', count: 1 },
      { rule: 'queryMatch', label: 'No word from the topic', count: 0 },
    ]);
  });

  it('passes the error through for a failed fetch', () => {
    const error = 'failed: quotaExceeded (HTTP 403): quota used up';
    const report = buildStatusReport(log({ fetched: 0, passed: 0, quotaUsed: 1, error }), NOW, 0);
    if (!report.hasFetch) throw new Error('expected a fetch');
    expect(report.error).toBe(error);
    expect(report.summary.find((row) => row.label === 'Passed the filters')?.value).toBe('0');
  });

  it('has a label for every rule', () => {
    expect(Object.values(RULE_LABELS).every((label) => label.length > 0)).toBe(true);
  });
});

describe('describeApiKeyStatus', () => {
  it('shows the last 4 characters of a loaded key', () => {
    const key = `AIza${'x'.repeat(31)}WXYZ`;
    expect(describeApiKeyStatus({ ok: true, key })).toBe('Loaded (…WXYZ)');
  });

  it('explains a missing or malformed key', () => {
    expect(describeApiKeyStatus({ ok: false, reason: 'missing' })).toBe('Missing: add it to .env');
    expect(describeApiKeyStatus({ ok: false, reason: 'malformed' })).toBe(
      "Doesn't look valid: check .env",
    );
  });
});
