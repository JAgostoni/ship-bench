import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/time";

// Built via the local-time Date constructor so assertions hold in any TZ.
const localNoon = new Date(2026, 5, 8, 12, 2).getTime();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatDate / formatDateTime", () => {
  it("formats the absolute date per design §8.3", () => {
    expect(formatDate(localNoon)).toBe("Jun 8, 2026");
  });

  it("formats the tooltip date-time with 24h clock", () => {
    expect(formatDateTime(localNoon)).toBe("Jun 8, 2026, 12:02");
  });
});

describe("formatRelativeTime", () => {
  const now = localNoon;

  it("returns 'just now' under one minute", () => {
    expect(formatRelativeTime(now, now)).toBe("just now");
    expect(formatRelativeTime(now - 59_000, now)).toBe("just now");
  });

  it("returns minutes under one hour, with pluralization", () => {
    expect(formatRelativeTime(now - MINUTE, now)).toBe("1 minute ago");
    expect(formatRelativeTime(now - 5 * MINUTE, now)).toBe("5 minutes ago");
    expect(formatRelativeTime(now - HOUR + MINUTE, now)).toBe("59 minutes ago");
  });

  it("returns hours under one day", () => {
    expect(formatRelativeTime(now - HOUR, now)).toBe("1 hour ago");
    expect(formatRelativeTime(now - 23 * HOUR, now)).toBe("23 hours ago");
  });

  it("returns days under one week", () => {
    expect(formatRelativeTime(now - DAY, now)).toBe("1 day ago");
    expect(formatRelativeTime(now - 6 * DAY, now)).toBe("6 days ago");
  });

  it("falls back to the absolute date at one week and beyond", () => {
    const old = now - 7 * DAY;
    expect(formatRelativeTime(old, now)).toBe(formatDate(old));
  });
});
