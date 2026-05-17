import { describe, it, expect } from 'vitest';
import { CreateArticleSchema, UpdateArticleSchema } from './index';

describe('Zod Schemas', () => {
  describe('CreateArticleSchema', () => {
    it('should validate a valid article', () => {
      const validArticle = {
        title: 'Test Article',
        content: 'This is a test article.',
        status: 'PUBLISHED',
      };
      const result = CreateArticleSchema.safeParse(validArticle);
      expect(result.success).toBe(true);
    });

    it('should fail if title is missing', () => {
      const invalidArticle = {
        content: 'This is a test article.',
        status: 'PUBLISHED',
      };
      const result = CreateArticleSchema.safeParse(invalidArticle);
      expect(result.success).toBe(false);
    });

    it('should allow optional slug', () => {
      const articleWithSlug = {
        title: 'Test Article',
        content: 'This is a test article.',
        status: 'PUBLISHED',
        slug: 'custom-slug',
      };
      const result = CreateArticleSchema.safeParse(articleWithSlug);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe('custom-slug');
      }
    });
  });

  describe('UpdateArticleSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        title: 'Updated Title',
      };
      const result = UpdateArticleSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should fail on invalid status', () => {
      const invalidUpdate = {
        status: 'INVALID_STATUS',
      };
      const result = UpdateArticleSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
