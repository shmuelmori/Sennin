import {
  canFetch,
  DAILY_QUOTA,
  MIN_UNITS_TO_FETCH,
  pacificDate,
  pacificDayNumber,
  pacificOffsetHours,
  quotaUsedPercent,
  unitsLeft,
} from './quota';

const utc = (iso: string) => Date.parse(`${iso}Z`);

describe('pacificOffsetHours', () => {
  it('is -8 in winter and -7 in summer', () => {
    expect(pacificOffsetHours(utc('2026-01-15T12:00:00'))).toBe(-8);
    expect(pacificOffsetHours(utc('2026-07-01T12:00:00'))).toBe(-7);
  });

  it('switches to daylight time at 2:00 PST on the second Sunday of March', () => {
    // 2026-03-08 is the second Sunday of March 2026.
    expect(pacificOffsetHours(utc('2026-03-08T09:59:59'))).toBe(-8);
    expect(pacificOffsetHours(utc('2026-03-08T10:00:00'))).toBe(-7);
  });

  it('switches back at 2:00 PDT on the first Sunday of November', () => {
    // 2026-11-01 is the first Sunday of November 2026.
    expect(pacificOffsetHours(utc('2026-11-01T08:59:59'))).toBe(-7);
    expect(pacificOffsetHours(utc('2026-11-01T09:00:00'))).toBe(-8);
  });
});

describe('pacificDate', () => {
  it('rolls over at midnight Pacific, not UTC', () => {
    // 07:59 UTC on Nov 8 is 23:59 PST on Nov 7.
    expect(pacificDate(utc('2026-11-08T07:59:00'))).toBe('2026-11-07');
    expect(pacificDate(utc('2026-11-08T08:00:00'))).toBe('2026-11-08');
  });

  it('uses the daylight offset in summer', () => {
    expect(pacificDate(utc('2026-07-02T06:59:00'))).toBe('2026-07-01');
    expect(pacificDate(utc('2026-07-02T07:00:00'))).toBe('2026-07-02');
  });
});

describe('pacificDayNumber', () => {
  it('is the same within a Pacific day and goes up by one at midnight', () => {
    const morning = pacificDayNumber(utc('2026-11-08T16:00:00'));
    expect(pacificDayNumber(utc('2026-11-09T07:59:00'))).toBe(morning);
    expect(pacificDayNumber(utc('2026-11-09T08:00:00'))).toBe(morning + 1);
  });
});

describe('quotaUsedPercent', () => {
  it('rounds today’s used share to a whole percent', () => {
    expect(quotaUsedPercent(0)).toBe(0);
    expect(quotaUsedPercent(2010)).toBe(20);
    expect(quotaUsedPercent(4050)).toBe(41);
    expect(quotaUsedPercent(DAILY_QUOTA)).toBe(100);
  });

  it('stays between 0 and 100', () => {
    expect(quotaUsedPercent(-5)).toBe(0);
    expect(quotaUsedPercent(12_000)).toBe(100);
  });
});

describe('unitsLeft and canFetch', () => {
  it('counts down from the daily quota and never goes below 0', () => {
    expect(unitsLeft(0)).toBe(DAILY_QUOTA);
    expect(unitsLeft(2010)).toBe(7990);
    expect(unitsLeft(12_000)).toBe(0);
  });

  it('allows a fetch only with at least 2,100 units left', () => {
    expect(canFetch(DAILY_QUOTA - MIN_UNITS_TO_FETCH)).toBe(true);
    expect(canFetch(DAILY_QUOTA - MIN_UNITS_TO_FETCH + 1)).toBe(false);
  });
});
