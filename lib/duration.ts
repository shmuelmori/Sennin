// Parses the ISO 8601 durations YouTube returns in contentDetails.duration,
// e.g. "PT1M5S" -> 65. Live and upcoming streams report "P0D" (0 seconds).

// Weeks, days, then a time part with hours, minutes and seconds, each optional.
// Years and months are left out on purpose: their length in seconds is ambiguous,
// and YouTube doesn't use them.
const DURATION_PATTERN = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

const SECONDS_PER = {
  week: 7 * 24 * 60 * 60,
  day: 24 * 60 * 60,
  hour: 60 * 60,
  minute: 60,
} as const;

/** Duration in whole seconds, or null if `raw` isn't a duration this parser understands. */
export function parseDurationSec(raw: string): number | null {
  const text = raw.trim().toUpperCase();
  const match = DURATION_PATTERN.exec(text);
  if (match === null) {
    return null;
  }
  const [, weeks, days, hours, minutes, seconds] = match;

  // "P" and "PT" on their own, or a "T" with no time after it, aren't valid.
  const hasDate = weeks !== undefined || days !== undefined;
  const hasTime = hours !== undefined || minutes !== undefined || seconds !== undefined;
  if (!hasDate && !hasTime) {
    return null;
  }
  if (text.includes('T') && !hasTime) {
    return null;
  }

  return (
    toInt(weeks) * SECONDS_PER.week +
    toInt(days) * SECONDS_PER.day +
    toInt(hours) * SECONDS_PER.hour +
    toInt(minutes) * SECONDS_PER.minute +
    toInt(seconds)
  );
}

function toInt(part: string | undefined): number {
  return part === undefined ? 0 : Number(part);
}
