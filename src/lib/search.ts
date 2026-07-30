// Search service using SQLite FTS5
import prisma from '@/lib/prisma';
import { Article } from '@prisma/client';

/**
 * Perform full‑text search over article titles and content.
 * Returns up to 50 most relevant articles ordered by BM25 rank.
 */
export async function searchArticles(query: string): Promise<Article[]> {
  if (!query) return [];
  // Parameterized raw query to avoid injection
  const sql = `
    SELECT a.* , bm25(article_fts) AS rank
    FROM article_fts
    JOIN "Article" a ON a.id = article_fts.rowid
    WHERE article_fts MATCH ?
    ORDER BY rank ASC
    LIMIT 50;
  `;
  const results = await prisma.$queryRawUnsafe(sql, query);
  // Prisma returns rows typed as any; cast to Article
  return results as Article[];
}
