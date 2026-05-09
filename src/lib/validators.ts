import { z } from 'zod';

export const articleCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(100_000, 'Content must be 100,000 characters or less'),
  categoryId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  status: z
    .enum(['draft', 'published'])
    .default('draft'),
});

export const articleUpdateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(100_000, 'Content must be 100,000 characters or less')
    .optional(),
  categoryId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  status: z
    .enum(['draft', 'published'])
    .optional(),
});

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z
    .string()
    .optional()
    .nullable(),
});

// Inferred TypeScript types
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;