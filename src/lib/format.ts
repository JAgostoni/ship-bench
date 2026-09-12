const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

const absoluteFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeStyle: 'short',
});

/** Thresholds in seconds for each unit in the ladder, ascending. */
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30.44 * DAY;
const YEAR = 365.24 * DAY;

type Unit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

const UNITS: { unit: Unit; seconds: number }[] = [
  { unit: 'year', seconds: YEAR },
  { unit: 'month', seconds: MONTH },
  { unit: 'week', seconds: WEEK },
  { unit: 'day', seconds: DAY },
  { unit: 'hour', seconds: HOUR },
  { unit: 'minute', seconds: MINUTE },
];

/**
 * Human-readable relative time such as `2 days ago` or `3 weeks ago`.
 *
 * Picks the largest unit whose value is ≥ 1 (design-spec.md §4.1's count line
 * reads `updated 4 minutes ago`), and returns `just now` for anything under a
 * minute, where "43 seconds ago" would be noise.
 *
 * @param date the timestamp to describe
 * @param now  the reference point; defaults to the current time
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const deltaSeconds = (date.getTime() - now.getTime()) / 1000;
  const magnitude = Math.abs(deltaSeconds);

  if (magnitude < MINUTE) return 'just now';

  // `minute` is the last entry in the ladder and the guard above already
  // rejected anything shorter, so the ladder always matches.
  const { unit, seconds: unitSeconds } = UNITS.find((entry) => magnitude >= entry.seconds)!;
  const value = Math.max(1, Math.round(magnitude / unitSeconds));
  return relativeFormatter.format(Math.sign(deltaSeconds) * value, unit);
}

/** Absolute timestamp for the `<time title>` attribute, e.g. `September 8, 2026 at 12:00 PM`. */
export function absoluteTime(date: Date): string {
  return absoluteFormatter.format(date);
}

/** `formatCount(1, 'result', 'results')` → `1 result`; `3` → `3 results`. */
export function formatCount(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
