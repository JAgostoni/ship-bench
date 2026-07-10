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
