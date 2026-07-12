import { describe, expect, it } from "vitest";
import {
  formatAbsoluteUpdated,
  formatRelativeUpdated,
} from "@/lib/utils/dates";

describe("formatRelativeUpdated", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");

  it("returns just now for < 1 minute", () => {
    const d = new Date(now.getTime() - 30_000);
    expect(formatRelativeUpdated(d, now)).toBe("Updated just now");
  });

  it("returns minutes ago", () => {
    const d = new Date(now.getTime() - 5 * 60_000);
    expect(formatRelativeUpdated(d, now)).toBe("Updated 5m ago");
  });

  it("returns hours ago", () => {
    const d = new Date(now.getTime() - 3 * 60 * 60_000);
    expect(formatRelativeUpdated(d, now)).toBe("Updated 3h ago");
  });

  it("returns days ago", () => {
    const d = new Date(now.getTime() - 3 * 24 * 60 * 60_000);
    expect(formatRelativeUpdated(d, now)).toBe("Updated 3d ago");
  });

  it("handles invalid date", () => {
    expect(formatRelativeUpdated("not-a-date", now)).toBe("Updated —");
  });
});

describe("formatAbsoluteUpdated", () => {
  it("includes Updated prefix and date parts", () => {
    const d = new Date("2026-07-10T14:14:00.000Z");
    const result = formatAbsoluteUpdated(d);
    expect(result.startsWith("Updated ")).toBe(true);
    expect(result).toMatch(/2026/);
  });
});
