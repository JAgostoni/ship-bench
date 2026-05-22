// src/lib/actions.test.ts
import { describe, it, expect } from 'vitest';
import { articleSchema } from './validation';

describe('Article Schema Validation', () => {
  it('should validate complete and correct article inputs', () => {
    const validData = {
      title: 'Valid Title',
      slug: 'valid-title-123',
      content: 'This is a valid body of content.',
      categoryId: 1,
      status: 'published',
    };

    const result = articleSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject titles that are too short or too long', () => {
    const shortTitle = {
      title: 'a', // < 2 chars
      slug: 'valid-slug',
      content: 'Valid content body',
      categoryId: null,
      status: 'draft',
    };

    const longTitle = {
      title: 'a'.repeat(101), // > 100 chars
      slug: 'valid-slug',
      content: 'Valid content body',
      categoryId: null,
      status: 'draft',
    };

    const resShort = articleSchema.safeParse(shortTitle);
    const resLong = articleSchema.safeParse(longTitle);

    expect(resShort.success).toBe(false);
    expect(resLong.success).toBe(false);

    if (!resShort.success) {
      expect(resShort.error.flatten().fieldErrors.title?.[0]).toContain('at least 2 characters');
    }
  });

  it('should reject slugs that are not URL-friendly', () => {
    const badSlugs = [
      'Invalid Slug',
      'invalid_slug',
      'invalid/slug',
      'invalid.slug',
      '-invalid-slug',
      'invalid-slug-',
    ];

    badSlugs.forEach((slug) => {
      const data = {
        title: 'Valid Title',
        slug,
        content: 'Valid content body',
        categoryId: null,
        status: 'draft',
      };
      const res = articleSchema.safeParse(data);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.flatten().fieldErrors.slug?.[0]).toContain('URL-friendly');
      }
    });
  });

  it('should reject content that is too short', () => {
    const shortContent = {
      title: 'Valid Title',
      slug: 'valid-slug',
      content: '1234', // < 5 chars
      categoryId: null,
      status: 'draft',
    };

    const res = articleSchema.safeParse(shortContent);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.content?.[0]).toContain('at least 5 characters');
    }
  });

  it('should preprocess categoryId correctly', () => {
    const testCases = [
      { input: '', expected: null },
      { input: 'none', expected: null },
      { input: '12', expected: 12 },
      { input: 45, expected: 45 },
    ];

    testCases.forEach(({ input, expected }) => {
      const data = {
        title: 'Valid Title',
        slug: 'valid-slug',
        content: 'Valid content body',
        categoryId: input,
        status: 'draft',
      };

      const res = articleSchema.safeParse(data);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.categoryId).toBe(expected);
      }
    });
  });

  it('should reject invalid status options', () => {
    const data = {
      title: 'Valid Title',
      slug: 'valid-slug',
      content: 'Valid content body',
      categoryId: null,
      status: 'archived', // Not 'draft' or 'published'
    };

    const res = articleSchema.safeParse(data);
    expect(res.success).toBe(false);
  });
});
