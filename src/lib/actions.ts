// src/lib/actions.ts
'use server';

import { db } from './db';
import { articles, categories } from './schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { articleSchema } from './validation';

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

/**
 * Server action to get the total number of articles (both draft and published)
 * in a category before deletion.
 */
export async function getCategoryArticleCountAction(categoryId: number): Promise<{ count: number }> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.categoryId, categoryId))
      .all();
    return { count: result[0]?.count || 0 };
  } catch (err) {
    console.error('Error in getCategoryArticleCountAction:', err);
    return { count: 0 };
  }
}

/**
 * Server action to delete a category.
 * Updates all matching articles to categoryId = null (handled by SQLite ON DELETE SET NULL).
 */
export async function deleteCategoryAction(categoryId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Perform delete on categories table
    await db.delete(categories).where(eq(categories.id, categoryId));
    
    // Revalidate paths
    revalidatePath('/articles');
    revalidatePath('/');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteCategoryAction:', err);
    return { success: false, error: err.message || 'An unexpected database error occurred.' };
  }
}

/**
 * Server action to delete an article.
 * Automatically handles SQLite FTS5 trigger deletion.
 */
export async function deleteArticleAction(articleId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(articles).where(eq(articles.id, articleId));
    
    revalidatePath('/articles');
    revalidatePath('/');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteArticleAction:', err);
    return { success: false, error: err.message || 'An unexpected database error occurred.' };
  }
}


