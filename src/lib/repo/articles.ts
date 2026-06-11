import { desc, eq } from "drizzle-orm";
import { getDb, getSqlite } from "@/lib/db/client";
import { articles, type Article } from "@/lib/db/schema";
import type { ArticleInput } from "@/lib/validation/article";

export type ArticleListItem = Pick<Article, "id" | "title" | "updatedAt">;

export type SearchResult = {
  id: number;
  title: string;
  snippet: string;
  updatedAt: number;
};

export const SEARCH_LIMIT_DEFAULT = 20;
export const SEARCH_LIMIT_MAX = 50;

export function listArticles(): ArticleListItem[] {
  return getDb()
    .select({
      id: articles.id,
      title: articles.title,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .orderBy(desc(articles.updatedAt))
    .all();
}

export function getArticle(id: number): Article | null {
  return (
    getDb().select().from(articles).where(eq(articles.id, id)).get() ?? null
  );
}

export function createArticle(input: ArticleInput): Article {
  const now = Date.now();
  return getDb()
    .insert(articles)
    .values({ ...input, createdAt: now, updatedAt: now })
    .returning()
    .get();
}

export function updateArticle(id: number, input: ArticleInput): Article | null {
  return (
    getDb()
      .update(articles)
      .set({ ...input, updatedAt: Date.now() })
      .where(eq(articles.id, id))
      .returning()
      .get() ?? null
  );
}

export function deleteArticle(id: number): boolean {
  return getDb().delete(articles).where(eq(articles.id, id)).run().changes > 0;
}

/**
 * Turn raw user input into a safe FTS5 prefix query (architecture §5.1):
 * split on non-alphanumerics, drop empties, wrap each term as `"term"*`,
 * join with spaces (implicit AND). Returns null when no usable terms remain —
 * the caller must skip the query and return zero results. Never throws.
 */
export function sanitizeFtsQuery(input: string): string | null {
  const terms = input.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (terms.length === 0) {
    return null;
  }
  return terms.map((term) => `"${term}"*`).join(" ");
}

export function searchArticles(
  q: string,
  limit: number = SEARCH_LIMIT_DEFAULT,
): { results: SearchResult[]; total: number } {
  const match = sanitizeFtsQuery(q);
  if (match === null) {
    return { results: [], total: 0 };
  }

  const cappedLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), SEARCH_LIMIT_MAX)
    : SEARCH_LIMIT_DEFAULT;

  // Raw SQL per architecture §11: Drizzle cannot model FTS5 virtual tables.
  // The repo guarantees <mark>/</mark> are the only markup ever injected into
  // snippets — iteration 4's whitelist renderer splits on exactly these tokens.
  const sqlite = getSqlite();
  const results = sqlite
    .prepare<[string, number], SearchResult>(
      `SELECT a.id, a.title, a.updated_at AS updatedAt,
              snippet(articles_fts, 1, '<mark>', '</mark>', '…', 20) AS snippet
       FROM articles_fts
       JOIN articles a ON a.id = articles_fts.rowid
       WHERE articles_fts MATCH ?
       ORDER BY bm25(articles_fts, 5.0, 1.0)
       LIMIT ?`,
    )
    .all(match, cappedLimit);

  const { total } = sqlite
    .prepare<
      [string],
      { total: number }
    >("SELECT COUNT(*) AS total FROM articles_fts WHERE articles_fts MATCH ?")
    .get(match) ?? { total: 0 };

  return { results, total };
}
