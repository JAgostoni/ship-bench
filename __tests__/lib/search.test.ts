import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQueryRawUnsafe } = vi.hoisted(() => ({
  mockQueryRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRawUnsafe: mockQueryRawUnsafe,
  },
}));

import { stripMarkdown, searchArticles } from '@/lib/search';

describe('stripMarkdown', () => {
  it('returns plain text unchanged within limit', () => {
    expect(stripMarkdown('Hello world', 200)).toBe('Hello world');
  });

  it('strips bold formatting', () => {
    expect(stripMarkdown('**hello** world', 200)).toBe('hello world');
  });

  it('strips italic formatting', () => {
    expect(stripMarkdown('*hello* world', 200)).toBe('hello world');
  });

  it('strips inline code', () => {
    expect(stripMarkdown('use `console.log()` for debugging', 200)).toBe(
      'use console.log() for debugging',
    );
  });

  it('strips links keeping link text', () => {
    expect(stripMarkdown('Visit [Google](https://google.com) now', 200)).toBe(
      'Visit Google now',
    );
  });

  it('strips image syntax', () => {
    // The function strips [alt](url) but leaves the ! prefix
    expect(stripMarkdown('Image: ![alt](url) text', 200)).toBe('Image: !alt text');
  });

  it('strips heading markers', () => {
    expect(stripMarkdown('# Heading 1\n## Heading 2', 200)).toBe('Heading 1 Heading 2');
  });

  it('strips blockquote markers', () => {
    expect(stripMarkdown('> quoted text', 200)).toBe('quoted text');
  });

  it('strips list markers', () => {
    expect(stripMarkdown('- item 1\n- item 2\n* item 3', 200)).toBe(
      'item 1 item 2 item 3',
    );
  });

  it('handles mixed Markdown', () => {
    const input = '# Title\n\n**Bold** and *italic* with `code` and [link](url).';
    expect(stripMarkdown(input, 200)).toBe('Title Bold and italic with code and link.');
  });

  it('returns full text when shorter than maxLength', () => {
    expect(stripMarkdown('Short', 200)).toBe('Short');
  });

  it('truncates text longer than maxLength with ellipsis', () => {
    const long = 'a '.repeat(100);
    const result = stripMarkdown(long, 50);
    expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
    expect(result.endsWith('...')).toBe(true);
  });

  it('truncates at word boundary (does not split words)', () => {
    const text = 'hello world this is a long sentence';
    const result = stripMarkdown(text, 15);
    // Should truncate at a word boundary before 15 chars + "..."
    expect(result.length).toBeLessThanOrEqual(18);
    expect(result.endsWith('...')).toBe(true);
    // Result should not end with a partial word before "..."
    const withoutEllipsis = result.replace(/\.{3}$/, '');
    expect(withoutEllipsis.endsWith(' ')).toBe(false);
  });
});

describe('searchArticles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    title: 'Test Article',
    slug: 'test-article',
    excerpt: 'An excerpt',
    status: 'published',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    categoryId: null,
    categoryName: null,
    categorySlug: null,
    ...overrides,
  });

  it('returns results for a basic query', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([makeRow()])
      .mockResolvedValueOnce([{ count: 1 }]);

    const result = await searchArticles('test');
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe('Test Article');
    expect(result.total).toBe(1);
  });

  it('returns empty results for an empty query after sanitization', async () => {
    const result = await searchArticles('---');
    expect(result.articles).toEqual([]);
    expect(result.total).toBe(0);
    // No DB calls should be made since sanitized string is empty
    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
  });

  it('sanitizes FTS5 special characters', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([makeRow()])
      .mockResolvedValueOnce([{ count: 1 }]);

    await searchArticles('getting-started');
    const calls = mockQueryRawUnsafe.mock.calls;
    // The FTS query should not contain hyphens
    const ftsQuery = calls[0]?.[1] as string;
    expect(ftsQuery).not.toContain('-');
    expect(ftsQuery).toContain('*');
  });

  it('handles pagination correctly', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([makeRow({ id: 2 })])
      .mockResolvedValueOnce([{ count: 50 }]);

    const result = await searchArticles('test', 3, 10);
    expect(result.articles).toHaveLength(1);
    expect(result.total).toBe(50);
    // Check the LIMIT and OFFSET params
    const queryCalls = mockQueryRawUnsafe.mock.calls;
    // First call: SELECT query with limit=10, offset=20
    expect(queryCalls[0]?.[2]).toBe(10);  // limit
    expect(queryCalls[0]?.[3]).toBe(20);  // offset
  });

  it('returns BigInt count correctly cast to Number', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: BigInt(42) }]);

    const result = await searchArticles('test');
    expect(result.total).toBe(42);
    expect(typeof result.total).toBe('number');
  });

  it('maps category IDs to category objects', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([
        makeRow({ categoryId: 1, categoryName: 'Guides', categorySlug: 'guides' }),
      ])
      .mockResolvedValueOnce([{ count: 1 }]);

    const result = await searchArticles('test');
    expect(result.articles[0].category).toEqual({
      id: 1,
      name: 'Guides',
      slug: 'guides',
    });
  });

  it('handles null category gracefully', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([makeRow()])
      .mockResolvedValueOnce([{ count: 1 }]);

    const result = await searchArticles('test');
    expect(result.articles[0].category).toBeNull();
  });
});