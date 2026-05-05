'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/src/db';
import { articles } from '@/src/db/schema';
import { createArticleSchema, updateArticleSchema } from '@/src/lib/validation';

export interface ActionError {
  field: string;
  message: string;
}

export interface ActionResult<T> {
  success: boolean;
  article?: T;
  errors?: ActionError[];
}

export async function createArticle(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const result = createArticleSchema.safeParse({ title, content });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path[0] as string,
        message: issue.message,
      })),
    };
  }

  try {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const [article] = await db
      .insert(articles)
      .values({
        id,
        title: result.data.title,
        content: result.data.content,
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: articles.id });

    return { success: true, article };
  } catch (error) {
    console.error('Failed to create article:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to save article. Please try again.' }],
    };
  }
}

export async function updateArticle(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const result = updateArticleSchema.safeParse({ title, content });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path[0] as string,
        message: issue.message,
      })),
    };
  }

  try {
    const [article] = await db
      .update(articles)
      .set({
        title: result.data.title,
        content: result.data.content,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(articles.id, id))
      .returning({ id: articles.id });

    if (!article) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Article not found.' }],
      };
    }

    return { success: true, article };
  } catch (error) {
    console.error('Failed to update article:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to save article. Please try again.' }],
    };
  }
}
