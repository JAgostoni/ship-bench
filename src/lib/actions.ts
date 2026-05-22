// src/lib/actions.ts
'use server';

import { db } from './db';
import { articles } from './schema';
import { eq, and, ne } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

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

export interface ActionResponse {
  success: boolean;
  errors?: Record<string, string[]>;
  slug?: string;
}

/**
 * Server action to create a new article in SQLite.
 * Automatically synchronizes with FTS5 index through database triggers.
 */
export async function createArticleAction(data: unknown): Promise<ActionResponse> {
  try {
    const parsed = articleSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const { title, slug, content, categoryId, status } = parsed.data;

    // Check if slug is unique
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1)
      .all();

    if (existing.length > 0) {
      return {
        success: false,
        errors: {
          slug: ['An article with this URL slug already exists.'],
        },
      };
    }

    // Insert article
    await db.insert(articles).values({
      title,
      slug,
      content,
      categoryId,
      status,
    });

    // Revalidate relevant pages
    revalidatePath('/articles');
    revalidatePath('/');

    return {
      success: true,
      slug,
    };
  } catch (err: any) {
    console.error('Error in createArticleAction:', err);
    return {
      success: false,
      errors: {
        global: [err.message || 'An unexpected database error occurred.'],
      },
    };
  }
}

/**
 * Server action to update an existing article in SQLite.
 * Automatically updates FTS5 index and updates the modified timestamp.
 */
export async function updateArticleAction(articleId: number, data: unknown): Promise<ActionResponse> {
  try {
    const parsed = articleSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const { title, slug, content, categoryId, status } = parsed.data;

    // Verify article exists
    const currentArticle = await db
      .select({ slug: articles.slug })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1)
      .all();

    if (currentArticle.length === 0) {
      return {
        success: false,
        errors: {
          global: ['Target article not found.'],
        },
      };
    }

    const oldSlug = currentArticle[0].slug;

    // Check if updated slug is unique (excluding this article)
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.slug, slug), ne(articles.id, articleId)))
      .limit(1)
      .all();

    if (existing.length > 0) {
      return {
        success: false,
        errors: {
          slug: ['An article with this URL slug already exists.'],
        },
      };
    }

    // Update the row
    await db.update(articles)
      .set({
        title,
        slug,
        content,
        categoryId,
        status,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, articleId));

    // Revalidate paths
    revalidatePath('/articles');
    revalidatePath('/');
    revalidatePath(`/articles/${slug}`);
    if (oldSlug !== slug) {
      revalidatePath(`/articles/${oldSlug}`);
    }

    return {
      success: true,
      slug,
    };
  } catch (err: any) {
    console.error('Error in updateArticleAction:', err);
    return {
      success: false,
      errors: {
        global: [err.message || 'An unexpected database error occurred.'],
      },
    };
  }
}
