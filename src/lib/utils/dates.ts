/**
 * Date formatting helpers for list (relative) and detail (absolute).
 * English-only UI (design D7).
 */

const MS_MINUTE = 60_000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

/**
 * Relative label for list rows, e.g. "Updated 3d ago".
 */
export function formatRelativeUpdated(
  date: Date | string,
  now: Date = new Date(),
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return "Updated —";
  }

  const diffMs = Math.max(0, now.getTime() - d.getTime());

  if (diffMs < MS_MINUTE) {
    return "Updated just now";
  }
  if (diffMs < MS_HOUR) {
    const m = Math.floor(diffMs / MS_MINUTE);
    return `Updated ${m}m ago`;
  }
  if (diffMs < MS_DAY) {
    const h = Math.floor(diffMs / MS_HOUR);
    return `Updated ${h}h ago`;
  }
  if (diffMs < 30 * MS_DAY) {
    const days = Math.floor(diffMs / MS_DAY);
    return `Updated ${days}d ago`;
  }

  // Older than ~30 days: short absolute month/day for scanability
  const absolute = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  return `Updated ${absolute}`;
}

/**
 * Absolute label for detail meta, e.g. "Updated Jul 10, 2026, 2:14 PM".
 */
export function formatAbsoluteUpdated(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return "Updated —";
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);

  return `Updated ${formatted}`;
}
