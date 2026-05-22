// src/lib/validation.ts
import { z } from 'zod';

// Article Zod Validation Schema
export const articleSchema = z.object({
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title must be under 100 characters'),
  slug: z.string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly (lowercase letters, numbers, and hyphens only, e.g. "my-article-slug")'),
  content: z.string()
    .min(5, 'Content must be at least 5 characters'),
  categoryId: z.preprocess(
    (val) => (val === '' || val === undefined || val === 'none' || val === null ? null : Number(val)),
    z.number().nullable()
  ),
  status: z.enum(['draft', 'published']),
});

export type ArticleFormValues = z.infer<typeof articleSchema>;
