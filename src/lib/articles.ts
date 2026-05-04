import { eq, lt, desc } from 'drizzle-orm';
import { db } from '@/src/db';
import { articles, articleCategories, categories } from '@/src/db/schema';

export interface ArticleDTO {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
}

export interface GetArticlesResult {
  articles: ArticleDTO[];
  nextCursor: string | null;
}

export interface GetArticlesOptions {
  limit?: number;
  cursor?: string;
  category?: string;
}

export async function getArticles(
  opts: GetArticlesOptions = {},
): Promise<GetArticlesResult> {
  const limit = opts.limit ?? 20;

  const baseArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      content: articles.content,
      status: articles.status,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      categoryName: categories.name,
    })
    .from(articles)
    .leftJoin(
      articleCategories,
      eq(articles.id, articleCategories.articleId),
    )
    .leftJoin(
      categories,
      eq(articleCategories.categoryId, categories.id),
    )
    .where(opts.category
      ? eq(categories.slug, opts.category)
      : undefined
    )
    .orderBy(desc(articles.updatedAt))
    .limit(limit + 1); // fetch one extra to check for next page

  const hasMore = baseArticles.length > limit;
  const pageArticles = hasMore ? baseArticles.slice(0, limit) : baseArticles;
  const nextCursor = hasMore
    ? pageArticles[pageArticles.length - 1]?.createdAt ?? null
    : null;

  return {
    articles: pageArticles.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      categoryName: a.categoryName ?? undefined,
    })),
    nextCursor,
  };
}

export async function getArticleById(id: string): Promise<ArticleDTO | null> {
  const result = await db
    .select({
      id: articles.id,
      title: articles.title,
      content: articles.content,
      status: articles.status,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      categoryName: categories.name,
    })
    .from(articles)
    .leftJoin(
      articleCategories,
      eq(articles.id, articleCategories.articleId),
    )
    .leftJoin(
      categories,
      eq(articleCategories.categoryId, categories.id),
    )
    .where(eq(articles.id, id))
    .limit(1);

  const article = result[0];
  if (!article) return null;

  return {
    id: article.id,
    title: article.title,
    content: article.content,
    status: article.status,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    categoryName: article.categoryName ?? undefined,
  };
}

export async function getCategories() {
  const allCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
    })
    .from(categories)
    .orderBy(categories.name);

  return allCategories;
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const allCategories = await db.select().from(categories);
  const counts: Record<string, number> = {};

  for (const cat of allCategories) {
    const result = await db
      .select({ count: db.$count(articleCategories) })
      .from(articleCategories)
      .where(eq(articleCategories.categoryId, cat.id))
      .limit(1);

    counts[cat.slug] = result[0]?.count ?? 0;
  }

  return counts;
}
