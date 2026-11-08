// The daily YouTube quota (spec §5 "Quota"): 10,000 units a day, reset at
// midnight Pacific Time like YouTube's own counter. A fetch costs about 2,010
// units, so Refresh needs at least 2,100 left.
//
// Pacific Time is worked out by hand from the US daylight saving rules (since
// 2007), so it doesn't depend on the phone's Intl time zone support.

export const DAILY_QUOTA = 10_000;
export const MIN_UNITS_TO_FETCH = 2_100;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The day of the month of the `nth` Sunday (1-based) of a month, in UTC. */
function nthSunday(year: number, month: number, nth: number): number {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - firstDay) % 7) + (nth - 1) * 7;
}

/**
 * Hours from UTC to Pacific Time at `ms`: -7 during daylight saving time
 * (second Sunday of March, 2:00 PST, to the first Sunday of November, 2:00 PDT),
 * otherwise -8.
 */
export function pacificOffsetHours(ms: number): -7 | -8 {
  const year = new Date(ms).getUTCFullYear();
  const start = Date.UTC(year, 2, nthSunday(year, 2, 2), 10); // 2:00 PST = 10:00 UTC
  const end = Date.UTC(year, 10, nthSunday(year, 10, 1), 9); // 2:00 PDT = 09:00 UTC
  return ms >= start && ms < end ? -7 : -8;
}

function toPacific(ms: number): number {
  return ms + pacificOffsetHours(ms) * HOUR_MS;
}

/** The Pacific Time date at `ms`, as "YYYY-MM-DD": the key of quota_day. */
export function pacificDate(ms: number): string {
  return new Date(toPacific(ms)).toISOString().slice(0, 10);
}

/** Whole Pacific days since 1970-01-01, so two times can be compared by day. */
export function pacificDayNumber(ms: number): number {
  return Math.floor(toPacific(ms) / DAY_MS);
}

/** Units left today, never below 0. */
export function unitsLeft(unitsUsedToday: number): number {
  return Math.max(0, DAILY_QUOTA - unitsUsedToday);
}

/** Today's used share of the daily quota, as a whole percent from 0 to 100. */
export function quotaUsedPercent(unitsUsedToday: number): number {
  const share = Math.min(1, Math.max(0, unitsUsedToday / DAILY_QUOTA));
  return Math.round(share * 100);
}

/** Whether there is enough quota left today for a fetch. */
export function canFetch(unitsUsedToday: number): boolean {
  return unitsLeft(unitsUsedToday) >= MIN_UNITS_TO_FETCH;
}
