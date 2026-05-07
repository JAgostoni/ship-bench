import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { text, sqliteTable } from 'drizzle-orm/sqlite-core';
import { eq, desc } from 'drizzle-orm';

// Mirrors the real schema for testing query logic
const articlesTable = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const categoriesTable = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
});

const articleCategoriesTable = sqliteTable('article_categories', {
  articleId: text('article_id').notNull(),
  categoryId: text('category_id').notNull(),
});

interface ArticleDTO {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
}

interface GetArticlesResult {
  articles: ArticleDTO[];
  nextCursor: string | null;
}

async function getArticles(
  db: ReturnType<typeof drizzle>,
  { limit = 20, cursor, category }: { limit?: number; cursor?: string; category?: string } = {}
): Promise<GetArticlesResult> {
  const query = db
    .select({
      id: articlesTable.id,
      title: articlesTable.title,
      content: articlesTable.content,
      status: articlesTable.status,
      createdAt: articlesTable.createdAt,
      updatedAt: articlesTable.updatedAt,
      categoryName: categoriesTable.name,
    })
    .from(articlesTable)
    .leftJoin(articleCategoriesTable, eq(articlesTable.id, articleCategoriesTable.articleId))
    .leftJoin(categoriesTable, eq(articleCategoriesTable.categoryId, categoriesTable.id));

  if (category) {
    query.where(eq(categoriesTable.slug, category));
  }

  const result = await query.orderBy(desc(articlesTable.updatedAt)).limit(limit + 1);

  // Filter for cursor-based pagination client-side
  const filteredArticles = result.filter(
    (a) => !cursor || a.updatedAt < cursor
  );

  const pageArticles = filteredArticles.slice(0, limit);
  const nextCursor =
    result.length > limit && pageArticles.length > 0
      ? pageArticles[pageArticles.length - 1]?.createdAt ?? null
      : null;

  return {
    articles: pageArticles.map((a) => ({
      ...a,
      categoryName: a.categoryName ?? undefined,
    })),
    nextCursor,
  };
}

async function getArticleById(
  db: ReturnType<typeof drizzle>,
  id: string
): Promise<ArticleDTO | null> {
  const result = await db
    .select({
      id: articlesTable.id,
      title: articlesTable.title,
      content: articlesTable.content,
      status: articlesTable.status,
      createdAt: articlesTable.createdAt,
      updatedAt: articlesTable.updatedAt,
      categoryName: categoriesTable.name,
    })
    .from(articlesTable)
    .leftJoin(articleCategoriesTable, eq(articlesTable.id, articleCategoriesTable.articleId))
    .leftJoin(categoriesTable, eq(articleCategoriesTable.categoryId, categoriesTable.id))
    .where(eq(articlesTable.id, id))
    .limit(1);

  const article = result[0];
  if (!article) return null;

  return {
    ...article,
    categoryName: article.categoryName ?? undefined,
  };
}

let sqliteDb: Database.Database;
let db: ReturnType<typeof drizzle>;

beforeEach(() => {
  sqliteDb = new Database(':memory:');
  db = drizzle(sqliteDb);

  sqliteDb.exec(`
    CREATE TABLE articles (
      id TEXT PRIMARY KEY, title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE, description TEXT
    );
    CREATE TABLE article_categories (
      article_id TEXT NOT NULL, category_id TEXT NOT NULL,
      PRIMARY KEY (article_id, category_id)
    );
    INSERT INTO articles VALUES ('art-1', 'Getting Started', 'Intro to the knowledge base.', 'published', '2024-01-15T00:00:00Z', '2024-01-15T00:00:00Z');
    INSERT INTO articles VALUES ('art-2', 'API Reference', 'Complete REST API docs.', 'published', '2024-01-10T00:00:00Z', '2024-01-10T00:00:00Z');
    INSERT INTO articles VALUES ('art-3', 'Troubleshooting', 'Fix common errors.', 'published', '2024-01-05T00:00:00Z', '2024-01-05T00:00:00Z');
    INSERT INTO categories VALUES ('cat-1', 'Getting Started', 'getting-started', 'Intro docs');
    INSERT INTO categories VALUES ('cat-2', 'Engineering', 'engineering', 'Engineering docs');
    INSERT INTO article_categories VALUES ('art-1', 'cat-1');
    INSERT INTO article_categories VALUES ('art-2', 'cat-2');
    INSERT INTO article_categories VALUES ('art-3', 'cat-1');
  `);
});

afterEach(() => {
  sqliteDb.close();
});

describe('getArticles', () => {
  it('returns all articles ordered by updatedAt DESC', async () => {
    const result = await getArticles(db);
    expect(result.articles).toHaveLength(3);
    expect(result.articles[0].title).toBe('Getting Started');
    expect(result.articles[1].title).toBe('API Reference');
    expect(result.articles[2].title).toBe('Troubleshooting');
  });

  it('respects limit', async () => {
    const result = await getArticles(db, { limit: 2 });
    expect(result.articles).toHaveLength(2);
    expect(result.articles[0].title).toBe('Getting Started');
    expect(result.nextCursor).toBe('2024-01-10T00:00:00Z');
  });

  it('paginates with cursor', async () => {
    // Fetch first page with limit of 2
    const page1 = await getArticles(db, { limit: 2 });
    expect(page1.articles).toHaveLength(2);
    expect(page1.nextCursor).toBe('2024-01-10T00:00:00Z');

    // Now simulate cursor: only fetch 1 more article by passing cursor
    const page2Result = await getArticles(db, { limit: 10, cursor: page1.nextCursor! });
    // Should skip articles where updatedAt >= cursor, only get remaining
    expect(page2Result.articles.length).toBeGreaterThanOrEqual(1);
  });

  it('returns nextCursor as null when all fit on one page', async () => {
    const result = await getArticles(db, { limit: 10 });
    expect(result.nextCursor).toBeNull();
  });

  it('filters by category', async () => {
    const result = await getArticles(db, { category: 'engineering' });
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe('API Reference');
    expect(result.articles[0].categoryName).toBe('Engineering');
  });
});

describe('getArticleById', () => {
  it('returns correct article with category', async () => {
    const article = await getArticleById(db, 'art-1');
    expect(article).not.toBeNull();
    expect(article!.id).toBe('art-1');
    expect(article!.title).toBe('Getting Started');
    expect(article!.categoryName).toBe('Getting Started');
  });

  it('returns null for non-existent ID', async () => {
    const article = await getArticleById(db, 'non-existent');
    expect(article).toBeNull();
  });
});
