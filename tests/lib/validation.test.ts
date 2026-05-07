import { describe, it, expect } from 'vitest';
import { createArticleSchema, updateArticleSchema, searchQuerySchema } from '@/src/lib/validation';

describe('createArticleSchema', () => {
  it('passes with valid data', () => {
    const result = createArticleSchema.safeParse({
      title: 'Test Article',
      content: 'Some content here.',
    });
    expect(result.success).toBe(true);
  });

  it('fails with missing title', () => {
    const result = createArticleSchema.safeParse({
      title: '',
      content: 'Some content.',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'title')).toBe(true);
    }
  });

  it('fails with missing content', () => {
    const result = createArticleSchema.safeParse({
      title: 'Title',
      content: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'content')).toBe(true);
    }
  });

  it('fails with overly long title', () => {
    const result = createArticleSchema.safeParse({
      title: 'a'.repeat(201),
      content: 'Content',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'title')).toBe(true);
    }
  });

  it('fails with missing both title and content', () => {
    const result = createArticleSchema.safeParse({
      title: '',
      content: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
    }
  });
});

describe('updateArticleSchema', () => {
  it('passes with valid data', () => {
    const result = updateArticleSchema.safeParse({
      title: 'Updated Title',
      content: 'Updated content.',
    });
    expect(result.success).toBe(true);
  });

  it('fails with empty title', () => {
    const result = updateArticleSchema.safeParse({
      title: '',
      content: 'Content',
    });
    expect(result.success).toBe(false);
  });

  it('fails with empty content', () => {
    const result = updateArticleSchema.safeParse({
      title: 'Title',
      content: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('searchQuerySchema', () => {
  it('passes with short query', () => {
    const result = searchQuerySchema.safeParse({ q: 'test' });
    expect(result.success).toBe(true);
  });

  it('fails with empty query', () => {
    const result = searchQuerySchema.safeParse({ q: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('required');
    }
  });

  it('fails with missing query', () => {
    const result = searchQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails with overly long query', () => {
    const result = searchQuerySchema.safeParse({ q: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('defaults limit to 20', () => {
    const result = searchQuerySchema.safeParse({ q: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });
});
