import { describe, expect, it } from 'vitest';
import { listQuerySchema } from './query';

describe('listQuerySchema', () => {
  it('applies the documented defaults for an empty query string', () => {
    expect(listQuerySchema.parse({})).toEqual({
      q: '',
      status: 'published',
      sort: 'updated',
      page: 1,
      pageSize: 20,
    });
  });

  it('keeps valid values as given', () => {
    expect(
      listQuerySchema.parse({
        q: 'deploy',
        category: 'engineering',
        status: 'all',
        sort: 'title',
        page: '3',
        pageSize: '10',
      }),
    ).toEqual({
      q: 'deploy',
      category: 'engineering',
      status: 'all',
      sort: 'title',
      page: 3,
      pageSize: 10,
    });
  });

  it('never throws on a malformed page parameter', () => {
    expect(() => listQuerySchema.parse({ page: 'abc' })).not.toThrow();
    expect(listQuerySchema.parse({ page: 'abc' }).page).toBe(1);
    expect(listQuerySchema.parse({ page: '0' }).page).toBe(1);
    expect(listQuerySchema.parse({ page: '-5' }).page).toBe(1);
    expect(listQuerySchema.parse({ page: '2.5' }).page).toBe(1);
  });

  it('falls back to published/updated for unknown enum values', () => {
    const parsed = listQuerySchema.parse({ status: 'bogus', sort: 'bogus' });
    expect(parsed.status).toBe('published');
    expect(parsed.sort).toBe('updated');
  });

  it('clamps pageSize into 1..50 instead of rejecting', () => {
    expect(listQuerySchema.parse({ pageSize: '999' }).pageSize).toBe(50);
    expect(listQuerySchema.parse({ pageSize: '0' }).pageSize).toBe(1);
    expect(listQuerySchema.parse({ pageSize: '-3' }).pageSize).toBe(1);
    expect(listQuerySchema.parse({ pageSize: '50' }).pageSize).toBe(50);
  });

  it('falls back to the default pageSize for a non-numeric value', () => {
    expect(listQuerySchema.parse({ pageSize: 'abc' }).pageSize).toBe(20);
    expect(listQuerySchema.parse({ pageSize: '1.5' }).pageSize).toBe(20);
    expect(listQuerySchema.parse({ pageSize: '' }).pageSize).toBe(20);
  });

  it('discards an over-long search term rather than searching for it', () => {
    expect(listQuerySchema.parse({ q: 'a'.repeat(201) }).q).toBe('');
    expect(listQuerySchema.parse({ q: 'a'.repeat(200) }).q).toBe('a'.repeat(200));
  });

  it('discards an over-long category slug', () => {
    expect(listQuerySchema.parse({ category: 'a'.repeat(81) }).category).toBeUndefined();
    expect(listQuerySchema.parse({ category: 'a'.repeat(80) }).category).toBe('a'.repeat(80));
  });

  it('trims the search term', () => {
    expect(listQuerySchema.parse({ q: '  deploy  ' }).q).toBe('deploy');
  });

  it('accepts every enum combination', () => {
    for (const status of ['published', 'draft', 'all'] as const) {
      for (const sort of ['updated', 'created', 'title'] as const) {
        const parsed = listQuerySchema.parse({ status, sort });
        expect(parsed.status).toBe(status);
        expect(parsed.sort).toBe(sort);
      }
    }
  });
});
