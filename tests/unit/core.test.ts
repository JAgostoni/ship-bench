import { describe, it, expect } from 'vitest';
import { ArticleSchema } from '@/lib/validation';
import { generateSlug } from '@/lib/utils';

describe('ArticleSchema', () => {
  it('should validate correct input', () => {
    const input = { title: 'Test Title', content: 'Test Content' };
    expect(ArticleSchema.safeParse(input).success).toBe(true);
  });

  it('should fail if title is missing', () => {
    const input = { title: '', content: 'Test Content' };
    const result = ArticleSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toContain('Title is required');
    }
  });

  it('should fail if content is missing', () => {
    const input = { title: 'Test Title', content: '' };
    const result = ArticleSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.content).toContain('Content is required');
    }
  });

  it('should fail if title is too long', () => {
    const input = { title: 'a'.repeat(256), content: 'Test Content' };
    const result = ArticleSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toContain('Title is too long');
    }
  });
});

describe('generateSlug', () => {
  it('should convert to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('My First Article')).toBe('my-first-article');
  });

  it('should remove special characters', () => {
    expect(generateSlug('Hello @World!')).toBe('hello-world');
  });

  it('should handle multiple spaces and hyphens', () => {
    expect(generateSlug('Hello   World--Test')).toBe('hello-world-test');
  });

  it('should trim hyphens from ends', () => {
    expect(generateSlug('  Hello World  ')).toBe('hello-world');
    expect(generateSlug('-Hello World-')).toBe('hello-world');
  });
});