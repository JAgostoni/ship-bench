import { prisma } from '@/lib/prisma';

interface SearchArticleRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
}

interface SearchArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  category: { id: number; name: string; slug: string } | null;
}

function mapRowToArticle(row: SearchArticleRow): SearchArticle {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: row.categoryId
      ? {
          id: row.categoryId,
          name: row.categoryName!,
          slug: row.categorySlug!,
        }
      : null,
  };
}

export async function searchArticles(
  query: string,
  page = 1,
  limit = 20
): Promise<{ articles: SearchArticle[]; total: number }> {
  const offset = (page - 1) * limit;

  // Strip FTS5 special characters: hyphens are column prefix operators,
  // quotes/parens/operators can break the query.
  const sanitized = query
    .replace(/['"]/g, '')
    .replace(/[-():+*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) {
    return { articles: [], total: 0 };
  }
  const ftsQuery = sanitized
    .split(/\s+/)
    .map((term) => `${term}*`)
    .join(' ');

  const results = await prisma.$queryRawUnsafe<SearchArticleRow[]>(
    `SELECT a.id, a.title, a.slug, a.excerpt, a.status, a.createdAt, a.updatedAt,
            c.id as categoryId, c.name as categoryName, c.slug as categorySlug
     FROM article_fts f
     JOIN Article a ON a.id = f.rowid
     LEFT JOIN Category c ON a.categoryId = c.id
     WHERE article_fts MATCH ?
     ORDER BY rank
     LIMIT ? OFFSET ?`,
    ftsQuery,
    limit,
    offset
  );

  // Get total count for pagination
  const countResult = await prisma.$queryRawUnsafe<[{ count: number }]>(
    `SELECT COUNT(*) as count
     FROM article_fts f
     JOIN Article a ON a.id = f.rowid
     WHERE article_fts MATCH ?`,
    ftsQuery
  );

  return {
    articles: results.map(mapRowToArticle),
    total: Number(countResult[0]?.count ?? 0),
  };
}

/**
 * Strip Markdown formatting from a string, useful for generating excerpts
 * from content that doesn't have a pre-computed excerpt.
 */
export function stripMarkdown(markdown: string, maxLength = 200): string {
  const text = markdown
    .replace(/#{1,6}\s/g, '') // Remove heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images
    .replace(/>\s/g, '') // Blockquotes
    .replace(/[-*+]\s/g, '') // List markers
    .replace(/\n/g, ' ') // Newlines to spaces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
