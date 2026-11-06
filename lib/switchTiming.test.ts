import {
  formatOpenLine,
  formatSkippedLine,
  formatSwitchLine,
  formatSwitchSummary,
  summarizeSwitchTimes,
} from './switchTiming';

describe('summarizeSwitchTimes', () => {
  it('returns zeros and an unmet target for no switches', () => {
    expect(summarizeSwitchTimes([])).toEqual({
      count: 0,
      underTarget: 0,
      shareUnderTarget: 0,
      medianMs: 0,
      slowestMs: 0,
      meetsTarget: false,
    });
  });

  it('takes the middle value as the median for an odd count', () => {
    expect(summarizeSwitchTimes([900, 300, 500]).medianMs).toBe(500);
  });

  it('averages the two middle values for an even count', () => {
    expect(summarizeSwitchTimes([400, 300, 800, 600]).medianMs).toBe(500);
  });

  it('reports the slowest switch', () => {
    expect(summarizeSwitchTimes([400, 1500, 300]).slowestMs).toBe(1500);
  });

  it('counts only switches strictly under 1 s', () => {
    const summary = summarizeSwitchTimes([999, 1000, 1001, 200]);
    expect(summary.underTarget).toBe(2);
    expect(summary.shareUnderTarget).toBe(0.5);
  });

  it('meets the target at exactly 80% under 1 s', () => {
    expect(summarizeSwitchTimes([100, 200, 300, 400, 1200]).meetsTarget).toBe(true);
  });

  it('misses the target below 80% under 1 s', () => {
    expect(summarizeSwitchTimes([100, 200, 300, 1100, 1200]).meetsTarget).toBe(false);
  });

  it('does not reorder the input', () => {
    const times = [900, 300, 500];
    summarizeSwitchTimes(times);
    expect(times).toEqual([900, 300, 500]);
  });
});

describe('log lines', () => {
  it('formats one switch', () => {
    expect(formatSwitchLine(3, 'abc', 640, 250)).toBe(
      '[switch] #3 abc: 640 ms (page picked after 250 ms)',
    );
  });

  it('formats a skipped switch', () => {
    expect(formatSkippedLine('abc', 1800)).toBe(
      '[switch] abc: swiped away after 1800 ms, before it started playing',
    );
  });

  it('formats the summary', () => {
    const summary = summarizeSwitchTimes([100, 200, 300, 400, 1200]);
    expect(formatSwitchSummary(summary, 1)).toBe(
      '[switch] 5 switches: 4 under 1 s (80%), median 300 ms, slowest 1200 ms, ' +
        '1 skipped. Target (80% under 1 s): met',
    );
  });

  it('rounds the median and percentage', () => {
    const summary = summarizeSwitchTimes([100, 1101, 1200]);
    expect(formatSwitchSummary(summary, 0)).toBe(
      '[switch] 3 switches: 1 under 1 s (33%), median 1101 ms, slowest 1200 ms, ' +
        '0 skipped. Target (80% under 1 s): not met',
    );
  });
});

describe('formatOpenLine', () => {
  it('reports the open time and whether it met the 2 s target', () => {
    expect(formatOpenLine('abc', 1450)).toBe(
      '[open] first video abc playing 1450 ms after the app started. Target (under 2 s): met',
    );
    expect(formatOpenLine('abc', 2000)).toContain('not met');
  });
});
