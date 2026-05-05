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

/**
 * Escape special characters for FTS5 MATCH queries
 * FTS5 special chars: " ' - ( ) * AND OR NEAR ^
 */
function escapeFts5(query: string): string {
  // Wrap the query in double quotes and escape internal quotes
  return `"${query.replace(/"/g, '""')}"`;
}

export function searchArticles(
  query: string,
  opts?: { limit?: number },
): SearchArticlesResult {
  const limit = opts?.limit ?? 20;
  const escapedQuery = escapeFts5(query);

  const dbPath = path.resolve(process.cwd(), 'data', 'knowledge-base.db');
  const sqlite = new Database(dbPath);

  try {
    // Re-index: insert any articles not yet in FTS (seeds before migration was applied)
    sqlite.exec(
      `INSERT OR REPLACE INTO articles_fts (rowid, title, content)
       SELECT rowid, title, content FROM articles
       WHERE NOT EXISTS (SELECT 1 FROM articles_fts f WHERE f.rowid = articles.rowid)`,
    );

    const rawResults = sqlite
      .prepare(
        `SELECT 
          a.id,
          a.title,
          a.status,
          c.name as category_name,
          snippet(articles_fts, 0, '<mark>', '</mark>', '…', 64) AS title_snippet,
          snippet(articles_fts, 1, '<mark>', '</mark>', '…', 100) AS content_snippet,
          rank
        FROM articles_fts
        JOIN articles a ON articles_fts.rowid = a.rowid
        LEFT JOIN article_categories ac ON a.id = ac.article_id
        LEFT JOIN categories c ON ac.category_id = c.id
        WHERE articles_fts MATCH ?
        ORDER BY rank
        LIMIT ?`,
      )
      .all(escapedQuery, limit) as Array<{
        id: string;
        title: string;
        status: string;
        category_name: string | null;
        title_snippet: string;
        content_snippet: string;
        rank: number;
      }>;

    const results: SearchResult[] = rawResults.map((row) => ({
      id: row.id as string,
      title:
        row.title_snippet && row.title_snippet.includes('<mark>')
          ? row.title_snippet
          : (row.title as string),
      status: row.status as 'draft' | 'published',
      categoryName: row.category_name as string | null,
      contentSnippet: row.content_snippet as string,
      rank: row.rank as number,
    }));

    return { results, query };
  } finally {
    sqlite.close();
  }
}
