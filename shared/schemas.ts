import { z } from 'zod';

const TagNameSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[a-zA-Z0-9-]+$/, 'Tags may only contain letters, numbers, and hyphens');

export const ArticleCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.number().int().positive().optional().nullable(),
  tagNames: z.array(TagNameSchema).max(10, 'Maximum 10 tags allowed').optional(),
});

export const ArticleUpdateSchema = ArticleCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type ArticleCreateInput = z.infer<typeof ArticleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof ArticleUpdateSchema>;

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; details?: unknown } };
