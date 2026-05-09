import { type APIRequestContext } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

export interface TestArticle {
  id: number;
  title: string;
  slug: string;
}

/**
 * Create a test article via the REST API.
 */
export async function seedTestArticle(
  context: APIRequestContext,
  title: string,
  content: string,
  categoryId?: number,
  status: 'draft' | 'published' = 'published',
): Promise<TestArticle> {
  const res = await context.post(`${BASE_URL}/api/articles`, {
    data: {
      title,
      content,
      categoryId: categoryId ?? null,
      status,
    },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to seed test article: ${res.status()} ${body}`);
  }

  const article = await res.json();
  return { id: article.id, title: article.title, slug: article.slug };
}

/**
 * Delete all articles with IDs matching the given list.
 */
export async function deleteTestArticles(
  context: APIRequestContext,
  ids: number[],
): Promise<void> {
  for (const id of ids) {
    await context.delete(`${BASE_URL}/api/articles/${id}`);
  }
}

/**
 * Get an article by slug via a search.
 */
export async function getArticleBySlug(
  context: APIRequestContext,
  slug: string,
): Promise<TestArticle | null> {
  const res = await context.get(`${BASE_URL}/api/articles`);
  const data = await res.json();
  const found = data.articles.find((a: { slug: string }) => a.slug === slug);
  return found ? { id: found.id, title: found.title, slug: found.slug } : null;
}