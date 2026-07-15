import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";

const FTS_INIT_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  article_id UNINDEXED,
  title,
  content,
  tokenize = 'unicode61'
);
`.trim();

/**
 * Ensure the FTS5 virtual table exists.
 * Prefers SQL file on disk; falls back to inline DDL.
 */
export async function ensureFtsSchema(): Promise<void> {
  try {
    const sqlPath = path.join(process.cwd(), "prisma/sql/fts_init.sql");
    let sql = FTS_INIT_SQL;
    try {
      sql = readFileSync(sqlPath, "utf8");
    } catch {
      // use inline fallback
    }
    // Strip SQL comments for executeRaw
    const statements = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim();
    if (statements) {
      await prisma.$executeRawUnsafe(statements);
    }
  } catch (err) {
    console.error("[fts] ensureFtsSchema failed:", err);
    throw err;
  }
}

/**
 * Upsert a row in articles_fts for the given article.
 * `plainContent` should already be stripped of HTML.
 */
export async function syncArticleToFts(
  articleId: string,
  title: string,
  plainContent: string,
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM articles_fts WHERE article_id = ?`,
      articleId,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO articles_fts(article_id, title, content) VALUES (?, ?, ?)`,
      articleId,
      title,
      plainContent,
    );
  } catch (err) {
    console.error(`[fts] syncArticleToFts failed for ${articleId}:`, err);
    throw err;
  }
}

/** Remove an article from the FTS index. */
export async function removeArticleFromFts(articleId: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM articles_fts WHERE article_id = ?`,
      articleId,
    );
  } catch (err) {
    console.error(`[fts] removeArticleFromFts failed for ${articleId}:`, err);
    throw err;
  }
}

/**
 * Build an FTS5 MATCH query from raw user input.
 * - trim + lowercase
 * - split on whitespace
 * - strip chars outside [a-z0-9_-]
 * - join with AND and suffix * for prefix match
 * Returns empty string if no valid tokens remain.
 */
export function toFtsQuery(raw: string): string {
  const tokens = raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9_-]/g, ""))
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return "";
  return tokens.map((t) => `${t}*`).join(" AND ");
}

/** Shared search hit DTO for API + SSR search page. */
export type SearchResultItem = {
  id: string;
  slug: string;
  title: string;
  /** Plain excerpt from Article.excerpt (typeahead / fallback). */
  excerpt: string;
  /** FTS snippet with `<mark>` wrappers (full results page). */
  snippet: string;
  status: "PUBLISHED" | "DRAFT";
  category: { name: string; slug: string } | null;
};

export type SearchArticlesResult = {
  query: string;
  results: SearchResultItem[];
};

type SearchArticlesOptions = {
  query: string;
  /** Default 10, max 20. */
  limit?: number;
};

type FtsSearchRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  categoryName: string | null;
  categorySlug: string | null;
  snippet: string;
  rank: number;
};

/**
 * Allow only text + `<mark>` / `</mark>` from FTS snippet output.
 * Strips any other tags so snippets are safe for dangerouslySetInnerHTML.
 */
export function sanitizeFtsSnippet(html: string): string {
  if (!html) return "";
  // Escape any residual angle brackets that aren't mark tags, then restore marks
  const withoutTags = html.replace(/<(?!\/?mark\b)[^>]*>/gi, "");
  // Normalize mark tags to lowercase form
  return withoutTags
    .replace(/<\/?mark\b[^>]*>/gi, (tag) =>
      tag.toLowerCase().startsWith("</") ? "</mark>" : "<mark>",
    );
}

function clampLimit(limit: number | undefined): number {
  const n = typeof limit === "number" && Number.isFinite(limit) ? limit : 10;
  return Math.min(20, Math.max(1, Math.floor(n)));
}

/**
 * Full-text search over published articles (title + content via FTS5).
 * Drafts are never returned.
 */
export async function searchArticles(
  options: SearchArticlesOptions,
): Promise<SearchArticlesResult> {
  const rawQuery = options.query ?? "";
  const query = rawQuery.trim();
  const limit = clampLimit(options.limit);
  const ftsQuery = toFtsQuery(query);

  if (!ftsQuery) {
    return { query, results: [] };
  }

  try {
    // snippet(column_index, start, end, ellipsis, tokens)
    // FTS columns: 0=article_id, 1=title, 2=content
    const rows = await prisma.$queryRawUnsafe<FtsSearchRow[]>(
      `
      SELECT
        a.id AS id,
        a.slug AS slug,
        a.title AS title,
        a.excerpt AS excerpt,
        a.status AS status,
        c.name AS categoryName,
        c.slug AS categorySlug,
        snippet(articles_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet,
        bm25(articles_fts) AS rank
      FROM articles_fts
      JOIN Article AS a ON a.id = articles_fts.article_id
      LEFT JOIN Category AS c ON c.id = a.categoryId
      WHERE articles_fts MATCH ?
        AND a.status = 'PUBLISHED'
      ORDER BY rank ASC
      LIMIT ?
      `,
      ftsQuery,
      limit,
    );

    const results: SearchResultItem[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt ?? "",
      snippet: sanitizeFtsSnippet(row.snippet ?? ""),
      status: "PUBLISHED",
      category:
        row.categoryName && row.categorySlug
          ? { name: row.categoryName, slug: row.categorySlug }
          : null,
    }));

    return { query, results };
  } catch (err) {
    console.error("[fts] searchArticles failed:", err);
    throw err;
  }
}
