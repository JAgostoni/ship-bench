import 'server-only';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { toFtsQuery } from '@/lib/fts';
import { splitSegments } from '@/lib/highlight';
import { err, ok, type Result } from '@/lib/result';
import type { Database } from '@/server/db/create';
import { ARTICLE_STATUSES, articles, categories } from '@/server/db/schema';
import type { CategoryRef, SearchHit, SearchResults } from '@/types/domain';
import { lazyRepository } from './runtime';

export const DEFAULT_SEARCH_LIMIT = 10;

/** `architecture.md` §8.1 caps the `LIKE` fallback at 50 rows. */
export const FALLBACK_LIMIT = 50;

/** The sentinels `highlight()`/`snippet()` splice in, via `char(1)`/`char(2)`. */
const MARK_START = '\u0001';
const MARK_END = '\u0002';

type SearchStatus = (typeof ARTICLE_STATUSES)[number] | 'all';

type RawHit = {
  id: number;
  slug: string;
  title: string;
  status: (typeof ARTICLE_STATUSES)[number];
  updated_at: number | Date;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  rank: number;
  title_marked: string;
  body_snippet: string;
};

/** Shared by both the FTS5 path and the `LIKE` fallback. */
type RawFallbackHit = Omit<RawHit, 'rank' | 'title_marked' | 'body_snippet'> & {
  rank: number;
  title_marked: string;
  body_snippet: string;
};

function toDate(value: number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function toCategoryRef(row: {
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
}): CategoryRef | null {
  if (row.category_id === null || row.category_name === null || row.category_slug === null) {
    return null;
  }
  return { id: row.category_id, name: row.category_name, slug: row.category_slug };
}

function toHit(row: RawHit | RawFallbackHit): SearchHit {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    category: toCategoryRef(row),
    updatedAt: toDate(row.updated_at),
    rank: Number(row.rank),
    titleSegments: splitSegments(row.title_marked),
    snippetSegments: splitSegments(row.body_snippet),
  };
}

export function createSearchRepository(
  db: Database,
  options: { onFallback?: (reason: string, error?: unknown) => void } = {},
) {
  const warn =
    options.onFallback ??
    ((reason: string, error?: unknown) => {
      // §8.1: "logs a warning and falls back". Never thrown, never surfaced.
      console.warn(`[search] falling back to LIKE scan: ${reason}`, error ?? '');
    });

  /**
   * The degraded path: an indexed-friendly `LIKE` scan over `title`/`summary`,
   * capped at 50 rows (§8.1). It cannot rank or snippet, so `rank` is a constant
   * and matches are marked manually — the UI renders the same `SearchHit` shape
   * either way and never breaks because the FTS index is unavailable.
   */
  function likeFallback(
    term: string,
    limit: number,
    status: SearchStatus,
    offset: number,
  ): RawFallbackHit[] {
    const pattern = `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const filters = [
      or(
        sql`${articles.title} LIKE ${pattern} ESCAPE '\\'`,
        sql`${articles.summary} LIKE ${pattern} ESCAPE '\\'`,
      ),
      status === 'all' ? undefined : eq(articles.status, status),
    ].filter((clause) => clause !== undefined);

    return db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        status: articles.status,
        updated_at: articles.updatedAt,
        category_id: categories.id,
        category_name: categories.name,
        category_slug: categories.slug,
        rank: sql<number>`0`,
        title_marked: sql<string>`${articles.title}`,
        body_snippet: sql<string>`COALESCE(${articles.summary}, '')`,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(...filters))
      .orderBy(desc(articles.updatedAt))
      .limit(Math.min(limit, FALLBACK_LIMIT))
      .offset(offset)
      .all();
  }

  return {
    /**
     * The §8.1 query, verbatim in behaviour: `bm25(article_search, 8.0, 3.0, 1.0)`
     * weights title 8x, summary 3x, body 1x; `highlight` marks the title and
     * `snippet` the body with sentinels that `splitSegments` turns into
     * `{ text, match }[]`.
     *
     * `offset` was added in iteration 5: `/search`'s URL contract includes `page`
     * (architecture.md §6.2) and design-spec.md §4.1 requires the pager to work on
     * the ranked set, so the route needs to skip into the ranking. It is additive
     * and defaults to 0, so every iteration-3 call site is unchanged.
     */
    searchArticles(
      q: string,
      { limit = DEFAULT_SEARCH_LIMIT, status = 'published' as SearchStatus, offset = 0 } = {},
    ): Result<SearchResults> {
      const ftsQuery = toFtsQuery(q);

      // §8.1 step 4: an empty query short-circuits *without touching the
      // database*. This is also what makes `q=   ` cheap on every keystroke.
      if (!ftsQuery) {
        return ok({ query: q, total: null, limit, results: [] });
      }

      const rows = (() => {
        try {
          return db.all<RawHit>(sql`
            SELECT
              a.id,
              a.slug,
              a.title,
              a.status,
              a.updated_at,
              c.id AS category_id,
              c.name AS category_name,
              c.slug AS category_slug,
              bm25(article_search, 8.0, 3.0, 1.0) AS rank,
              highlight(article_search, 0, char(1), char(2)) AS title_marked,
              snippet(article_search, 2, char(1), char(2), '…', 24) AS body_snippet
            FROM article_search
            JOIN articles a ON a.id = article_search.rowid
            LEFT JOIN categories c ON c.id = a.category_id
            WHERE article_search MATCH ${ftsQuery}
              AND (${status} = 'all' OR a.status = ${status})
            ORDER BY rank
            LIMIT ${limit}
            OFFSET ${offset}
          `);
        } catch (error) {
          // A missing `article_search` (dropped/uninitialised) or a malformed
          // MATCH reaches here. `toFtsQuery` makes the latter unreachable for
          // real input, which is exactly why degrading is safe: the UI must not
          // break over an index problem.
          warn(error instanceof Error ? error.message : 'unknown FTS5 failure', error);
          return null;
        }
      })();

      if (rows === null) {
        const likeRows = likeFallback(q.trim(), limit, status, offset);
        return ok({
          query: q,
          total: null,
          limit,
          results: likeRows.map(toHit),
        });
      }

      return ok({ query: q, total: null, limit, results: rows.map(toHit) });
    },

    /**
     * The one total the UI can honestly display. `searchArticles` itself does not
     * count — the `/search` page's live region announces the returned length —
     * but `/api/search`'s documented `total` needs a real number, computed with
     * the same filter so it can never disagree with the results.
     */
    countSearchResults(q: string, { status = 'published' as SearchStatus } = {}): number {
      const ftsQuery = toFtsQuery(q);
      if (!ftsQuery) return 0;

      try {
        const row = db.get<{ n: number }>(sql`
          SELECT count(*) AS n
          FROM article_search
          JOIN articles a ON a.id = article_search.rowid
          WHERE article_search MATCH ${ftsQuery}
            AND (${status} = 'all' OR a.status = ${status})
        `);
        return Number(row?.n ?? 0);
      } catch (error) {
        warn(error instanceof Error ? error.message : 'unknown FTS5 failure', error);
        const term = q.trim();
        const pattern = `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
        const row = db
          .select({ n: sql<number>`count(*)` })
          .from(articles)
          .where(
            and(
              or(
                sql`${articles.title} LIKE ${pattern} ESCAPE '\\'`,
                sql`${articles.summary} LIKE ${pattern} ESCAPE '\\'`,
              ),
              status === 'all' ? undefined : eq(articles.status, status),
            ),
          )
          .get();
        return Number(row?.n ?? 0);
      }
    },
  };
}

export const searchRepository = lazyRepository(createSearchRepository);
