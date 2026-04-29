import type { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface SearchResult {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  updatedAt: Date;
  category: { id: number; name: string; description: string } | null;
  tags: { id: number; name: string }[];
}

function escapeFtsQuery(query: string): string {
  // Strip characters that have meaning in FTS5 MATCH syntax:
  // - " - phrase grouping  (^ " -)
  // - * - prefix match
  // - NEAR/n, AND, OR, NOT
  // - ^ - column filter
  // - ( ) - grouping
  // Also remove single quotes and NUL for SQL safety.
  // We keep only letters, numbers, and spaces.
  const cleaned = query
    .replace(/\x00/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

export async function searchArticles(
  query: string,
  db: PrismaClient = prisma
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const safeQuery = escapeFtsQuery(trimmed);

  const rawRows = await db.$queryRawUnsafe<
    { rowid: number; slug: string; title: string; excerpt: string; updatedAt: string }[]
  >(
    `SELECT
      a.id AS rowid,
      a.slug,
      a.title,
      a.excerpt,
      a.updatedAt
    FROM ArticleFts AS fts
    JOIN Article AS a ON fts.rowid = a.id
    WHERE ArticleFts MATCH '${safeQuery}'
    ORDER BY rank
    LIMIT 50`
  );

  const results: SearchResult[] = [];
  for (const row of rawRows) {
    const article = await db.article.findUnique({
      where: { id: row.rowid },
      include: {
        category: true,
        tags: true,
      },
    });

    if (article) {
      results.push({
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        updatedAt: article.updatedAt,
        category: article.category,
        tags: article.tags,
      });
    }
  }

  return results;
}
