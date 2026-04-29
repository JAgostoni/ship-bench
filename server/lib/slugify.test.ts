import { test, expect, vi } from 'vitest';
import { slugify, generateUniqueSlug } from './slugify';

describe('slugify', () => {
  test('slugify lowercases and replaces spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  test('slugify strips special characters', () => {
    expect(slugify('Café & Co.!')).toBe('caf-co');
  });

  test('slugify trims hyphens', () => {
    expect(slugify('  Leading  ')).toBe('leading');
  });

  test('slugify collapses multiple hyphens', () => {
    expect(slugify('Hello---World')).toBe('hello-world');
  });

  test('slugify strips leading and trailing hyphens', () => {
    expect(slugify('!Hello World!')).toBe('hello-world');
  });

  test('slugify handles empty-ish strings', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('generateUniqueSlug', () => {
  test('returns base slug when no collision', async () => {
    const prisma = {
      article: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const result = await generateUniqueSlug(prisma, 'Hello World');
    expect(result).toBe('hello-world');
    expect(prisma.article.findUnique).toHaveBeenCalledWith({ where: { slug: 'hello-world' } });
  });

  test('appends -2 when base slug exists', async () => {
    const prisma = {
      article: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ slug: 'hello-world' })
          .mockResolvedValueOnce(null),
      },
    } as any;

    const result = await generateUniqueSlug(prisma, 'Hello World');
    expect(result).toBe('hello-world-2');
  });

  test('appends -3 when base and -2 exist', async () => {
    const prisma = {
      article: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ slug: 'hello-world' })
          .mockResolvedValueOnce({ slug: 'hello-world-2' })
          .mockResolvedValueOnce(null),
      },
    } as any;

    const result = await generateUniqueSlug(prisma, 'Hello World');
    expect(result).toBe('hello-world-3');
  });

  test('falls back to article-N for empty slug', async () => {
    const prisma = {
      article: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const result = await generateUniqueSlug(prisma, '!!!');
    expect(result).toBe('article');
  });
});
