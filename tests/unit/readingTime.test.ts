import { describe, it, expect } from 'vitest';
import { readingTimeMinutes } from '@/lib/readingTime';

function wordsOf(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
}

describe('readingTimeMinutes', () => {
  it('200 words → 1 minute', () => {
    expect(readingTimeMinutes(wordsOf(200))).toBe(1);
  });

  it('201 words → 2 minutes', () => {
    expect(readingTimeMinutes(wordsOf(201))).toBe(2);
  });

  it('400 words → 2 minutes', () => {
    expect(readingTimeMinutes(wordsOf(400))).toBe(2);
  });

  it('empty string → 1 (minimum)', () => {
    expect(readingTimeMinutes('')).toBe(1);
  });

  it('1 word → 1 minute', () => {
    expect(readingTimeMinutes('hello')).toBe(1);
  });

  it('1000 words → 5 minutes', () => {
    expect(readingTimeMinutes(wordsOf(1000))).toBe(5);
  });
});
