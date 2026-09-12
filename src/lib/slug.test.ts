import { describe, expect, it, vi } from 'vitest';
import { MAX_SLUG_LENGTH, slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('slugifies a simple title', () => {
    expect(slugify('Deploying the API')).toBe('deploying-the-api');
  });

  it('strips diacritics to ASCII', () => {
    const slug = slugify('Café Déploiement');
    expect(slug).toBe('cafe-deploiement');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('collapses punctuation and repeated whitespace to single hyphens', () => {
    expect(slugify('  Hello,   World!  ')).toBe('hello-world');
    // `slugify` drops runs of mixed separators rather than collapsing them to a
    // single hyphen; the spec's requirement is only single hyphens between words
    // and no leading/trailing hyphen, which still holds.
    expect(slugify('a---b')).toBe('a-b');
    expect(slugify('a  --  b')).toBe('a-b');
    expect(slugify('-leading and trailing-')).toBe('leading-and-trailing');
  });

  it('never emits a leading or trailing hyphen', () => {
    expect(slugify('---leading')).toBe('leading');
    expect(slugify('trailing---')).toBe('trailing');
    expect(slugify('!!!')).toBe('');
  });

  it('truncates a 120-character title to 80 characters without a trailing hyphen', () => {
    const slug = slugify('word '.repeat(24));
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug).not.toMatch(/^[-\s]/);
  });
});

describe('uniqueSlug', () => {
  it('uses the base slug when it is free', () => {
    expect(uniqueSlug('deploying-the-api', () => false)).toBe('deploying-the-api');
  });

  it('does not loop forever when every candidate is taken', () => {
    const predicate = vi.fn(() => true);
    const slug = uniqueSlug('deploying-the-api', predicate);
    expect(predicate).toHaveBeenCalledTimes(50);
    expect(slug).toMatch(/^deploying-the-api-[0-9a-f]{6}$/);
  });

  it('returns the first free `-n` candidate', () => {
    expect(
      uniqueSlug('deploying-the-api', (candidate) => candidate !== 'deploying-the-api-3'),
    ).toBe('deploying-the-api-3');
  });

  it('falls back to a six-character random suffix when the base is exhausted', () => {
    const slug = uniqueSlug('deploying-the-api', () => true);
    const suffix = slug.slice('deploying-the-api-'.length);
    expect(suffix).toHaveLength(6);
    expect(suffix).toMatch(/^[0-9a-f]{6}$/);
  });

  it('random suffixes differ across calls', () => {
    const first = uniqueSlug('x', () => true);
    const second = uniqueSlug('x', () => true);
    expect(first).not.toBe(second);
  });
});
