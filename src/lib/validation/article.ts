import { z } from 'zod';

export const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;
export const EDITABLE_STATUSES = ['draft', 'published'] as const;

export const articleCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(200, 'Title must be 200 characters or fewer.'),
  summary: z
    .string()
    .trim()
    .max(300, 'Summary must be 300 characters or fewer.')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  bodyMd: z
    .string()
    .min(1, 'Article body cannot be empty.')
    .max(200_000, 'Article body is too large (200,000 character limit).'),
  categoryId: z.coerce.number().int().positive().nullable().default(null),
  status: z.enum(EDITABLE_STATUSES).default('draft'),
});
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;

export const articleUpdateSchema = articleCreateSchema.extend({
  version: z.coerce.number().int().nonnegative(),
  changeNote: z.string().trim().max(200).optional(),
});
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
