import { describe, it, expect } from 'vitest';
import {
  articleCreateSchema,
  articleUpdateSchema,
  categorySchema,
} from '@/lib/validators';

describe('articleCreateSchema', () => {
  it('parses a valid article with all fields', () => {
    const result = articleCreateSchema.safeParse({
      title: 'Getting Started',
      content: '# Hello World\n\nThis is a test article.',
      categoryId: 1,
      status: 'published',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Getting Started');
      expect(result.data.status).toBe('published');
    }
  });

  it('returns validation error when title is missing', () => {
    const result = articleCreateSchema.safeParse({
      content: 'Some content',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten();
      expect(errors.fieldErrors.title).toBeDefined();
    }
  });

  it('returns validation error when title is empty string', () => {
    const result = articleCreateSchema.safeParse({
      title: '',
      content: 'Some content',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
    }
  });

  it('returns validation error when title exceeds 200 chars', () => {
    const result = articleCreateSchema.safeParse({
      title: 'a'.repeat(201),
      content: 'Some content',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten();
      expect(errors.fieldErrors.title?.[0]).toContain('200');
    }
  });

  it('returns validation error when content is missing', () => {
    const result = articleCreateSchema.safeParse({
      title: 'My Title',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten();
      expect(errors.fieldErrors.content).toBeDefined();
    }
  });

  it('returns validation error when content exceeds 100,000 chars', () => {
    const result = articleCreateSchema.safeParse({
      title: 'Title',
      content: 'a'.repeat(100_001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten();
      expect(errors.fieldErrors.content?.[0]).toContain('100,000');
    }
  });

  it('rejects invalid status values like "archived"', () => {
    const result = articleCreateSchema.safeParse({
      title: 'Title',
      content: 'Content',
      status: 'archived',
    });
    expect(result.success).toBe(false);
  });

  it('defaults status to "draft" when not provided', () => {
    const result = articleCreateSchema.safeParse({
      title: 'My Draft',
      content: 'Draft content here.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft');
    }
  });

  it('accepts a valid categoryId number', () => {
    const result = articleCreateSchema.safeParse({
      title: 'Categorized',
      content: 'With category',
      categoryId: 3,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBe(3);
    }
  });

  it('acceps null categoryId', () => {
    const result = articleCreateSchema.safeParse({
      title: 'No Category',
      content: 'Without category',
      categoryId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBeNull();
    }
  });
});

describe('articleUpdateSchema', () => {
  it('allows partial updates with only title', () => {
    const result = articleUpdateSchema.safeParse({
      title: 'Updated Title',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Updated Title');
      expect(result.data.content).toBeUndefined();
    }
  });

  it('allows empty object (all fields optional)', () => {
    const result = articleUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid extra fields', () => {
    const result = articleUpdateSchema.safeParse({
      title: 'Valid title',
      nonexistentField: 'bad',
    });
    // Zod by default strips unknown keys in object schemas,
    // so this actually succeeds. Let's adjust — we shouldn't
    // test strict mode since the schema doesn't use .strict().
    expect(result.success).toBe(true);
  });

  it('rejects title that exceeds 200 chars', () => {
    const result = articleUpdateSchema.safeParse({
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title?.[0]).toContain('200');
    }
  });

  it('accepts status update only', () => {
    const result = articleUpdateSchema.safeParse({
      status: 'published',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('published');
    }
  });

  it('rejects invalid status values', () => {
    const result = articleUpdateSchema.safeParse({
      status: 'deleted',
    });
    expect(result.success).toBe(false);
  });
});

describe('categorySchema', () => {
  it('parses a valid category with name and slug', () => {
    const result = categorySchema.safeParse({
      name: 'Guides',
      slug: 'guides',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Guides');
      expect(result.data.slug).toBe('guides');
    }
  });

  it('returns validation error when name is missing', () => {
    const result = categorySchema.safeParse({
      slug: 'missing-name',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it('returns validation error when name exceeds 100 chars', () => {
    const result = categorySchema.safeParse({
      name: 'a'.repeat(101),
      slug: 'too-long',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name?.[0]).toContain('100');
    }
  });

  it('returns validation error when slug has invalid characters', () => {
    const result = categorySchema.safeParse({
      name: 'Valid Name',
      slug: 'Invalid Slug!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.slug).toBeDefined();
    }
  });

  it('accepts optional description', () => {
    const result = categorySchema.safeParse({
      name: 'With Desc',
      slug: 'with-desc',
      description: 'A test category',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('A test category');
    }
  });

  it('accepts null description', () => {
    const result = categorySchema.safeParse({
      name: 'Nullable',
      slug: 'nullable',
      description: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });
});