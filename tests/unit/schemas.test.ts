import { describe, it, expect } from 'vitest';
import { createArticleSchema, articleQuerySchema } from '@/lib/schemas';

describe('createArticleSchema', () => {
  const validBase = {
    title: 'My Article',
    content: 'Some content here.',
    status: 'PUBLISHED' as const,
  };

  it('accepts a valid input with all fields', () => {
    expect(() =>
      createArticleSchema.parse({ ...validBase, categoryId: 'cat-123' }),
    ).not.toThrow();
  });

  it('accepts valid input with categoryId: null', () => {
    expect(() =>
      createArticleSchema.parse({ ...validBase, categoryId: null }),
    ).not.toThrow();
  });

  it('accepts valid input without categoryId (optional)', () => {
    expect(() => createArticleSchema.parse(validBase)).not.toThrow();
  });

  it('throws when title is missing', () => {
    const result = createArticleSchema.safeParse({ content: 'x', status: 'PUBLISHED' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('title');
    }
  });

  it('throws when title is empty string', () => {
    const result = createArticleSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('title');
    }
  });

  it('throws when title exceeds 200 characters', () => {
    const result = createArticleSchema.safeParse({
      ...validBase,
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('title');
    }
  });

  it('throws when content is missing', () => {
    const result = createArticleSchema.safeParse({ title: 'My Article', status: 'PUBLISHED' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('content');
    }
  });

  it('throws when status is invalid', () => {
    const result = createArticleSchema.safeParse({ ...validBase, status: 'ARCHIVED' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('status');
    }
  });

  it('categoryId: "" is valid (treated as a non-null string — form submission case)', () => {
    // The schema declares categoryId as z.string().nullable().optional()
    // An empty string "" passes as a string (not null). This is the form submission case.
    // Server Actions must coerce "" to null before calling createArticle.
    const result = createArticleSchema.safeParse({ ...validBase, categoryId: '' });
    expect(result.success).toBe(true);
  });

  it('default status is PUBLISHED when omitted', () => {
    const result = createArticleSchema.safeParse({
      title: 'My Article',
      content: 'Content',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('PUBLISHED');
    }
  });
});

describe('articleQuerySchema', () => {
  it('empty object is valid — all fields undefined', () => {
    const result = articleQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBeUndefined();
      expect(result.data.status).toBeUndefined();
      expect(result.data.category).toBeUndefined();
    }
  });

  it('{ q: "hello" } is valid', () => {
    const result = articleQuerySchema.safeParse({ q: 'hello' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe('hello');
    }
  });

  it('throws when status is invalid', () => {
    const result = articleQuerySchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('status');
    }
  });
});
