import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Clean search query to prevent SQLite FTS5 crashes
 */
export function sanitizeSearchQuery(queryStr: string): string {
  return queryStr.replace(/[^\w\s]/g, '').trim();
}

/**
 * Executes a high-performance full-text search against the articles_fts virtual table,
 * joins standard articles, filters out drafts, and ranks results by BM25.
 */
export async function searchArticles(queryStr: string) {
  const sanitizedQuery = sanitizeSearchQuery(queryStr);
  if (!sanitizedQuery) {
    return [];
  }

  // Boost title matches by 3x over content matches
  const ftsQuery = `title:(${sanitizedQuery})^3 OR content:(${sanitizedQuery})`;

  // We perform raw SQL query using Drizzle since articles_fts is a virtual table not managed by standard drizzle models
  const results = await db.all<any>(sql`
    SELECT 
      a.id,
      a.title,
      a.slug,
      a.content,
      a.status,
      a.category_id as categoryId,
      a.created_at as createdAt,
      a.updated_at as updatedAt,
      c.name as categoryName
    FROM articles_fts fts
    JOIN articles a ON a.id = fts.id
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE articles_fts MATCH ${ftsQuery} AND a.status = 'published'
    ORDER BY bm25 ASC
  `);

  // Map dates since raw SQL results return raw timestamps in milliseconds
  return results.map((row) => ({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}
