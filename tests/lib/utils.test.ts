import { describe, it, expect } from 'vitest';
import { formatDistanceToNow } from 'date-fns';

describe('Date formatting (date-fns formatDistanceToNow)', () => {
  it('returns relative time for recent date', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const result = formatDistanceToNow(twoHoursAgo, { addSuffix: true });
    expect(result).toBe('about 2 hours ago');
  });

  it('returns relative time for past day', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const result = formatDistanceToNow(yesterday, { addSuffix: true });
    expect(result).toBe('1 day ago');
  });

  it('returns relative time for 3 days ago', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const result = formatDistanceToNow(threeDaysAgo, { addSuffix: true });
    expect(result).toBe('3 days ago');
  });

  it('handles dates in the future', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 5 * 60 * 1000);
    const result = formatDistanceToNow(futureDate, { addSuffix: true });
    // date-fns v4 returns "in 5 minutes" for near-future dates
    expect(result).toMatch(/in/);
  });
});

describe('Text utilities', () => {
  function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '…';
  }

  it('truncates long text with ellipsis', () => {
    const result = truncate('This is a long piece of text that should be truncated.', 20);
    expect(result.length).toBe(21); // 20 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns short text unchanged', () => {
    const result = truncate('Short text', 100);
    expect(result).toBe('Short text');
  });

  it('truncates at exact boundary', () => {
    const result = truncate('Hello', 5);
    expect(result).toBe('Hello');
  });
});
