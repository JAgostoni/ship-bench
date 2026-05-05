import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required.').max(200, 'Search query is too long.'),
  limit: z.number().optional().default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

export const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200, 'Title is too long.'),
  content: z.string().min(1, 'Article content is required.'),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200, 'Title is too long.'),
  content: z.string().min(1, 'Article content is required.'),
});

export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
