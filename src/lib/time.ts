/**
 * Date formatting shared by the home list, article detail, and (iteration 4)
 * search results. Server-rendered only, fixed en-US formats per design §8.3:
 * list meta "Updated {relative}", detail meta absolute "Jun 8, 2026".
 */

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "Jun 8, 2026" */
export function formatDate(epochMs: number): string {
  return dateFormat.format(epochMs);
}

/** "Jun 8, 2026, 14:02" — used for `<time title>` tooltips. */
export function formatDateTime(epochMs: number): string {
  return dateTimeFormat.format(epochMs);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Relative format per design §1.3/S1: `just now` (<1 min), `N minutes/hours
 * ago` (<24 h), `N days ago` (<7 d), else the absolute date.
 */
export function formatRelativeTime(
  epochMs: number,
  now: number = Date.now(),
): string {
  const diff = now - epochMs;
  if (diff < MINUTE) {
    return "just now";
  }
  if (diff < HOUR) {
    return plural(Math.floor(diff / MINUTE), "minute");
  }
  if (diff < DAY) {
    return plural(Math.floor(diff / HOUR), "hour");
  }
  if (diff < WEEK) {
    return plural(Math.floor(diff / DAY), "day");
  }
  return formatDate(epochMs);
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}
