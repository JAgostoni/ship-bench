import { describe, expect, it } from 'vitest';
import { MAX_QUERY_LENGTH, toFtsQuery } from './fts';

/** Every token in a well-formed query is quoted; only the final one is wildcarded. */
function isWellFormed(query: string): boolean {
  if (query === '') return true;
  return query.split(' ').every((token) => /^"[^"*():^-]+"\*?$/.test(token));
}

describe('toFtsQuery', () => {
  it('quotes each token and wildcards the final one', () => {
    expect(toFtsQuery('deploy api')).toBe('"deploy" "api"*');
  });

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(toFtsQuery('')).toBe('');
    expect(toFtsQuery('  ')).toBe('');
    expect(toFtsQuery('\t\n ')).toBe('');
  });

  it('strips the OR operator from `foo" OR bar`', () => {
    const query = toFtsQuery('foo" OR bar');
    expect(query).toBe('"foo" "bar"*');
    expect(query).not.toMatch(/\bOR\b/);
    expect(isWellFormed(query)).toBe(true);
  });

  it.each(['"', 'AND', 'foo AND', '(unclosed'])(
    'never emits an unquoted operator for %j',
    (input) => {
      const query = toFtsQuery(input);
      expect(query).not.toMatch(/\b(NEAR|AND|OR|NOT)\b/);
      expect(isWellFormed(query)).toBe(true);
    },
  );

  it('handles an embedded wildcard without throwing or emitting a wildcard-only query', () => {
    const query = toFtsQuery('a*b');
    expect(() => toFtsQuery('a*b')).not.toThrow();
    expect(query).toBe('"ab"*');
    expect(query).not.toBe('*');
    expect(isWellFormed(query)).toBe(true);
  });

  it('truncates a 300-plus-character input without throwing', () => {
    const input = 'term '.repeat(61);
    expect(input.length).toBeGreaterThan(300);
    const query = toFtsQuery(input);
    expect(query.length).toBeLessThan(input.length);
    expect(query.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH + 4);
    expect(isWellFormed(query)).toBe(true);
    for (const token of query.split(' ')) {
      expect(token).toMatch(/^"term"\*?$/);
    }
  });

  it('keeps a single over-long term instead of dropping it', () => {
    const query = toFtsQuery('x'.repeat(MAX_QUERY_LENGTH + 50));
    expect(query).toBe(`"${'x'.repeat(MAX_QUERY_LENGTH)}"*`);
    expect(isWellFormed(query)).toBe(true);
  });

  it('wildcards a single-token query', () => {
    expect(toFtsQuery('deploy')).toBe('"deploy"*');
  });

  it('collapses repeated whitespace between tokens', () => {
    expect(toFtsQuery('  deploy    the   api ')).toBe('"deploy" "the" "api"*');
  });

  it('strips parentheses and column filters', () => {
    expect(toFtsQuery('(title:deploy)')).toBe('"title" "deploy"*');
  });

  it('keeps lowercase operator-looking words as search terms', () => {
    expect(toFtsQuery('and')).toBe('"and"*');
  });
});
