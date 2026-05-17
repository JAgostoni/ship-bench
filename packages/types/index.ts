import { z } from 'zod';

export const ArticleStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

export const ArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string(),
  excerpt: z.string().optional(),
  status: ArticleStatusSchema,
  categoryId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateArticleSchema = ArticleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  slug: true,
}).extend({
  slug: z.string().min(1).optional(),
});

export const UpdateArticleSchema = CreateArticleSchema.partial();

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export type Article = z.infer<typeof ArticleSchema>;
export type CreateArticle = z.infer<typeof CreateArticleSchema>;
export type UpdateArticle = z.infer<typeof UpdateArticleSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Tag = z.infer<typeof TagSchema>;
