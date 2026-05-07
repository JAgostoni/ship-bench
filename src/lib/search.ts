import Database from 'better-sqlite3';
import path from 'path';

export interface SearchResult {
  id: string;
  title: string;
  status: 'draft' | 'published';
  categoryName: string | null;
  contentSnippet: string;
  rank: number;
}

export interface SearchArticlesResult {
  results: SearchResult[];
  query: string;
}

export function searchArticles(
  query: string,
  opts?: { limit?: number },
): SearchArticlesResult {
  const limit = opts?.limit ?? 20;
  const dbPath = path.resolve(process.cwd(), 'data', 'knowledge-base.db');
  const sqlite = new Database(dbPath);

  try {
    const rawResults = sqlite
      .prepare(
        `SELECT
          a.id,
          a.title,
          a.status,
          c.name as category_name,
          a.content
        FROM articles a
        LEFT JOIN article_categories ac ON a.id = ac.article_id
        LEFT JOIN categories c ON ac.category_id = c.id
        WHERE a.title LIKE ? OR a.content LIKE ?
        ORDER BY
          CASE WHEN a.title LIKE ? THEN 0 ELSE 1 END,
          a.updated_at DESC
        LIMIT ?`,
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`, limit) as Array<{
        id: string;
        title: string;
        status: string;
        category_name: string | null;
        content: string;
      }>;

    const results: SearchResult[] = rawResults.map((row) => {
      const contentSnippet = truncateText(row.content, 100);
      const searchLower = query.toLowerCase();
      const titleLower = row.title.toLowerCase();
      const titleIdx = titleLower.indexOf(searchLower);
      const highlightedTitle = titleIdx >= 0
        ? row.title.slice(0, titleIdx) + '<mark>' + row.title.slice(titleIdx, titleIdx + query.length) + '</mark>' + row.title.slice(titleIdx + query.length)
        : row.title;

      return {
        id: row.id,
        title: highlightedTitle,
        status: row.status as 'draft' | 'published',
        categoryName: row.category_name,
        contentSnippet,
        rank: titleIdx >= 0 ? 0 : 1,
      };
    });

    return { results, query };
  } finally {
    sqlite.close();
  }
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}
