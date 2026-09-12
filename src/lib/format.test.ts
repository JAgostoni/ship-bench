import { describe, expect, it } from 'vitest';
import { absoluteTime, formatCount, relativeTime } from './format';

const NOW = new Date('2026-09-10T18:22:04.512Z');

/** Builds a timestamp `seconds` in the past relative to NOW. */
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

describe('relativeTime', () => {
  it('renders a 2-day-old timestamp as "2 days ago"', () => {
    expect(relativeTime(ago(2 * 24 * 60 * 60), NOW)).toBe('2 days ago');
  });

  it('renders anything under a minute as "just now"', () => {
    expect(relativeTime(ago(0), NOW)).toBe('just now');
    expect(relativeTime(ago(59), NOW)).toBe('just now');
  });

  it('picks the largest unit that yields a value >= 1', () => {
    expect(relativeTime(ago(60), NOW)).toBe('1 minute ago');
    expect(relativeTime(ago(4 * 60), NOW)).toBe('4 minutes ago');
    expect(relativeTime(ago(60 * 60), NOW)).toBe('1 hour ago');
    expect(relativeTime(ago(5 * 24 * 60 * 60), NOW)).toBe('5 days ago');
    expect(relativeTime(ago(21 * 24 * 60 * 60), NOW)).toBe('3 weeks ago');
    expect(relativeTime(ago(60 * 24 * 60 * 60), NOW)).toBe('2 months ago');
    expect(relativeTime(ago(400 * 24 * 60 * 60), NOW)).toBe('1 year ago');
  });

  it('describes future timestamps with the same ladder', () => {
    expect(relativeTime(new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000), NOW)).toBe('in 2 days');
    expect(relativeTime(new Date(NOW.getTime() + 30 * 1000), NOW)).toBe('just now');
  });

  it('defaults `now` to the current time', () => {
    const now = new Date();
    expect(relativeTime(new Date(now.getTime() - 3 * 60 * 60 * 1000))).toBe('3 hours ago');
  });

  it('never renders 0 as a unit value', () => {
    for (const seconds of [60, 3600, 86400, 604800, 2_629_746, 31_556_952]) {
      expect(relativeTime(ago(seconds), NOW)).not.toMatch(/\b0 /);
    }
  });
});

describe('absoluteTime', () => {
  it('formats a readable absolute timestamp', () => {
    const formatted = absoluteTime(new Date('2026-09-08T12:00:00.000Z'));
    expect(formatted).toContain('2026');
    expect(formatted).toMatch(/September|Sept/);
    expect(formatted).toMatch(/AM|PM/);
  });
});

describe('formatCount', () => {
  it('uses the singular form for exactly 1', () => {
    expect(formatCount(1, 'result', 'results')).toBe('1 result');
  });

  it('uses the plural form otherwise', () => {
    expect(formatCount(3, 'result', 'results')).toBe('3 results');
    expect(formatCount(0, 'result', 'results')).toBe('0 results');
    expect(formatCount(2, 'published', 'published')).toBe('2 published');
  });
});
