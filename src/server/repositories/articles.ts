import 'server-only';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { excerpt } from '@/lib/markdown';
import { err, ok, type Result } from '@/lib/result';
import { slugify, uniqueSlug } from '@/lib/slug';
import type { ListQuery } from '@/lib/validation/query';
import type { Database } from '@/server/db/create';
import { ARTICLE_STATUSES, articleRevisions, articles, categories } from '@/server/db/schema';
import type { ArticleDetail, ArticleListItem, CategoryRef, RevisionSummary } from '@/types/domain';
import { DEFAULT_REVISION_LIMIT, createRevisionRepository } from './revisions';
import { lazyRepository } from './runtime';

/** Newest revisions retained per article (`architecture.md` §8.2, D12). */
export const REVISION_RETENTION = 20;

/** Base slug for a title with nothing slug-worthy in it (`"???"`). */
const FALLBACK_SLUG_BASE = 'article';

/** `editor_name` fallback, mirroring the `kb_display_name` cookie's default (§8.2). */
const ANONYMOUS_EDITOR = 'Anonymous editor';

type ArticleStatus = (typeof ARTICLE_STATUSES)[number];
type EditableStatus = Extract<ArticleStatus, 'draft' | 'published'>;

/**
 * Write payloads are declared here rather than derived from the validation
 * schemas on purpose.
 *
 * `articleCreateSchema` ends in `.default()`/`.transform()`, so its **output**
 * type marks `summary`/`categoryId` as present-but-maybe-undefined while its
 * **input** type makes them optional — neither describes "the repository fills
 * the gaps". Declaring the shape explicitly documents exactly which fields the
 * repository defaults, and lets `src/lib/validation/**` change its messages
 * without silently re-typing the data layer.
 *
 * `editorName` is required because `article_revisions.editor_name` is `NOT NULL`
 * (§8.2). The cookie read belongs to the Server Action (iteration 6), so the
 * action resolves the display name and passes it down.
 */
export type ArticleCreatePayload = {
  title: string;
  bodyMd: string;
  summary?: string | null;
  categoryId?: number | null;
  status?: EditableStatus;
  editorName: string;
  /** Defaults to `'Initial version'`, matching `src/server/db/seed.ts`. */
  changeNote?: string | null;
};

export type UpdateArticleInput = {
  /** The version the client last read; the optimistic-concurrency token. */
  version: number;
  title: string;
  bodyMd: string;
  summary?: string | null;
  categoryId?: number | null;
  /** Defaults to the article's current status when omitted (§8.7 step 4). */
  status?: EditableStatus;
  changeNote?: string | null;
  editorName: string;
};

export type ArticleListPage = {
  items: ArticleListItem[];
  hasNext: boolean;
  /** Computed only when `page > 1`, per `architecture.md` §9.1. */
  total: number | null;
};

export type ArticleDetailResult = { article: ArticleDetail; revisions: RevisionSummary[] };

export type ArticleWriteResult = { id: number; slug: string; version: number; updatedAt: Date };

type ArticleRow = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  bodyMd: string;
  status: ArticleStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
};

const listColumns = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  summary: articles.summary,
  bodyMd: articles.bodyMd,
  status: articles.status,
  version: articles.version,
  createdAt: articles.createdAt,
  updatedAt: articles.updatedAt,
  publishedAt: articles.publishedAt,
  categoryId: categories.id,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

function toCategoryRef(row: {
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
}): CategoryRef | null {
  if (row.categoryId === null || row.categoryName === null || row.categorySlug === null)
    return null;
  return { id: row.categoryId, name: row.categoryName, slug: row.categorySlug };
}

function toListItem(row: ArticleRow): ArticleListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    excerpt: excerpt(row.bodyMd),
    status: row.status,
    category: toCategoryRef(row),
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

function toDetail(row: ArticleRow): ArticleDetail {
  return { ...toListItem(row), bodyMd: row.bodyMd };
}

function conflictError(expected: number, found: number): AppError {
  return new AppError('CONFLICT', 'Someone saved a newer version of this article.', {
    errors: [{ path: 'version', message: `Expected version ${expected}, found ${found}.` }],
  });
}

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Keeps only the newest `REVISION_RETENTION` revisions. Runs inside the calling
 * transaction, so a failure rolls the whole write back rather than quietly
 * leaving an unbounded history.
 */
function pruneRevisions(tx: Transaction, articleId: number): void {
  const boundary = tx
    .select({ revisionNumber: articleRevisions.revisionNumber })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, articleId))
    .orderBy(desc(articleRevisions.revisionNumber))
    .limit(1)
    .offset(REVISION_RETENTION - 1)
    .get();

  if (!boundary) return;

  tx.delete(articleRevisions)
    .where(
      and(
        eq(articleRevisions.articleId, articleId),
        lt(articleRevisions.revisionNumber, boundary.revisionNumber),
      ),
    )
    .run();
}

/**
 * The in-transaction guards make these unreachable in normal operation. They are
 * mapped anyway so no raw driver error can escape the repository: every caller
 * above only knows how to render an `AppError` (§10.5).
 */
function mapArticleWriteError(error: unknown): AppError {
  const code = (error as { code?: string } | undefined)?.code;
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return new AppError('CONFLICT', 'That slug is already in use.');
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return new AppError('VALIDATION_FAILED', 'That category does not exist.', {
      errors: [{ path: 'categoryId', message: 'Select an existing category.' }],
    });
  }
  return error instanceof AppError
    ? error
    : new AppError('INTERNAL', 'The article could not be saved.', { cause: String(error) });
}

export function createArticleRepository(db: Database) {
  const revisions = createRevisionRepository(db);

  function filtersFor(q: ListQuery) {
    return [
      q.status === 'all' ? undefined : eq(articles.status, q.status),
      q.category ? eq(categories.slug, q.category) : undefined,
    ].filter((clause) => clause !== undefined);
  }

  function findDetail(
    column: typeof articles.slug | typeof articles.id,
    value: string | number,
  ): ArticleDetail | undefined {
    const row = db
      .select(listColumns)
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(eq(column, value))
      .get();
    return row ? toDetail(row as ArticleRow) : undefined;
  }

  /**
   * Inserts the revision that matches the article row after a write. Both write
   * paths call it, so `revision_number` tracks `version` identically.
   */
  function writeRevision(
    tx: Transaction,
    row: {
      id: number;
      version: number;
      title: string;
      summary: string | null;
      bodyMd: string;
    },
    editorName: string,
    changeNote: string | null,
    createdAt: Date,
  ): void {
    tx.insert(articleRevisions)
      .values({
        articleId: row.id,
        revisionNumber: row.version,
        title: row.title,
        summary: row.summary,
        bodyMd: row.bodyMd,
        editorName: editorName.trim() || ANONYMOUS_EDITOR,
        changeNote: changeNote?.trim() || null,
        createdAt,
      })
      .run();
  }

  return {
    /**
     * The §14.3 browse query. `.limit(pageSize + 1)` makes `hasNext` free; the
     * exact `total` is a second query, run only when `page > 1` so page 1 keeps
     * its single-query budget (§9.1, §13.1).
     */
    listArticles(q: ListQuery): ArticleListPage {
      const filters = filtersFor(q);
      const where = filters.length > 0 ? and(...filters) : undefined;

      const rows = db
        .select(listColumns)
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .where(where)
        .orderBy(
          q.sort === 'title'
            ? sql`${articles.title} COLLATE NOCASE ASC`
            : q.sort === 'created'
              ? desc(articles.createdAt)
              : desc(articles.updatedAt),
        )
        .limit(q.pageSize + 1)
        .offset((q.page - 1) * q.pageSize)
        .all();

      const hasNext = rows.length > q.pageSize;
      const items = rows.slice(0, q.pageSize).map((row) => toListItem(row as ArticleRow));

      let total: number | null = null;
      if (q.page > 1) {
        const counted = db
          .select({ value: sql<number>`count(*)` })
          .from(articles)
          .leftJoin(categories, eq(articles.categoryId, categories.id))
          .where(where)
          .get();
        total = Number(counted?.value ?? 0);
      }

      return { items, hasNext, total };
    },

    /**
     * Two queries total, never N+1 (`architecture.md` §9.1): the article with
     * its category, then the most recent revisions. Archived articles resolve
     * normally, so their links do not rot.
     */
    getArticleBySlug(
      slug: string,
      revisionLimit = DEFAULT_REVISION_LIMIT,
    ): Result<ArticleDetailResult> {
      const article = findDetail(articles.slug, slug);
      if (!article) return err(new AppError('NOT_FOUND', `No article with slug "${slug}".`));
      return ok({ article, revisions: revisions.listForArticle(article.id, revisionLimit) });
    },

    getArticleById(
      id: number,
      revisionLimit = DEFAULT_REVISION_LIMIT,
    ): Result<ArticleDetailResult> {
      const article = findDetail(articles.id, id);
      if (!article) return err(new AppError('NOT_FOUND', `No article with id ${id}.`));
      return ok({ article, revisions: revisions.listForArticle(article.id, revisionLimit) });
    },

    /** Used by `/api/health` (`architecture.md` §7.3). */
    countArticles(): number {
      const row = db
        .select({ value: sql<number>`count(*)` })
        .from(articles)
        .get();
      return Number(row?.value ?? 0);
    },

    /**
     * `architecture.md` §8.7. The `articles_search_ai` trigger indexes the new
     * row — `article_search` is never written to directly.
     */
    createArticle(input: ArticleCreatePayload): Result<ArticleWriteResult> {
      const title = input.title.trim();
      const summary = input.summary?.trim() || null;
      const status = input.status ?? 'draft';
      const now = new Date();

      try {
        return db.transaction((tx): Result<ArticleWriteResult> => {
          const base = slugify(title) || FALLBACK_SLUG_BASE;
          const slug = uniqueSlug(
            base,
            (candidate) =>
              tx
                .select({ id: articles.id })
                .from(articles)
                .where(eq(articles.slug, candidate))
                .get() !== undefined,
          );

          const created = tx
            .insert(articles)
            .values({
              title,
              slug,
              summary,
              bodyMd: input.bodyMd,
              status,
              categoryId: input.categoryId ?? null,
              version: 1,
              publishedAt: status === 'published' ? now : null,
              createdAt: now,
              updatedAt: now,
            })
            .returning({
              id: articles.id,
              version: articles.version,
              title: articles.title,
              summary: articles.summary,
              bodyMd: articles.bodyMd,
            })
            .get();

          // Revision 1 is the created state. Its `change_note` is not fixed by any
          // spec; the seed's `'Initial version'` convention is reused so the two
          // datasets read identically in History.
          writeRevision(tx, created, input.editorName, input.changeNote || 'Initial version', now);

          return ok({ id: created.id, slug, version: created.version, updatedAt: now });
        });
      } catch (error) {
        return err(mapArticleWriteError(error));
      }
    },

    /**
     * Optimistic concurrency, per `architecture.md` §8.7. The `AND version = ?`
     * guard makes the check-and-increment atomic even though the driver is
     * synchronous.
     *
     * **Revision numbering.** §8.7 step 3 numbers the inserted row
     * `revision_number = row.version` and calls it the *previous* state. Taken
     * literally that is unimplementable: `createArticle` has already written
     * revision 1 for version 1, so a first save would insert a second row with
     * `revision_number = 1` and trip the `(article_id, revision_number)` unique
     * index.
     *
     * Resolved with the model every other part of the spec assumes — revision
     * `#N` is the state as of version `N`, so `revision_number` always equals
     * `version`:
     *
     *   - `createArticle` writes `#1` (the created state) and sets `version = 1`.
     *   - each save bumps `version` and writes `#(version + 1)` (the new state).
     *
     * `src/server/db/seed.ts` encodes exactly this (`version: revisions ?? 1`,
     * newest revision holding the current `body_md`), and design-spec §3.4's
     * `#12` row renders correctly under it. §9.4's real requirement — that the
     * pre-save state stays recoverable — still holds: it is revision `#version`,
     * written by the previous save.
     */
    updateArticle(id: number, input: UpdateArticleInput): Result<ArticleWriteResult> {
      const now = new Date();

      try {
        return db.transaction((tx): Result<ArticleWriteResult> => {
          const current = tx
            .select({ version: articles.version, status: articles.status })
            .from(articles)
            .where(eq(articles.id, id))
            .get();

          if (!current) return err(new AppError('NOT_FOUND', `No article with id ${id}.`));

          if (input.version !== current.version) {
            return err(conflictError(input.version, current.version));
          }

          // An omitted `status` keeps the article's current one. An archived
          // article has no editable status, so it returns to `draft` — the only
          // choice that cannot silently republish what someone archived.
          const nextStatus: EditableStatus =
            input.status ?? (current.status === 'published' ? 'published' : 'draft');

          const publishedRow = tx
            .select({ publishedAt: articles.publishedAt })
            .from(articles)
            .where(eq(articles.id, id))
            .get();

          // `published_at` is stamped on the first transition to published and
          // never overwritten afterwards (§8.2).
          const publishedAt =
            nextStatus === 'published'
              ? (publishedRow?.publishedAt ?? now)
              : (publishedRow?.publishedAt ?? null);

          const updated = tx
            .update(articles)
            .set({
              title: input.title.trim(),
              summary: input.summary?.trim() || null,
              bodyMd: input.bodyMd,
              status: nextStatus,
              categoryId: input.categoryId ?? null,
              version: sql`${articles.version} + 1`,
              publishedAt,
              // A save always carries an editable status, so it clears
              // `archived_at`. That is what makes design-spec §4.6's "Undo" (a
              // `PATCH { status: 'published' }` on an archived article) restore it
              // fully rather than leave a stale timestamp behind.
              archivedAt: null,
              updatedAt: now,
            })
            .where(and(eq(articles.id, id), eq(articles.version, current.version)))
            .returning({
              id: articles.id,
              slug: articles.slug,
              version: articles.version,
              title: articles.title,
              summary: articles.summary,
              bodyMd: articles.bodyMd,
            })
            .get();

          // Unreachable while the transaction holds the write lock, but this guard
          // is what makes "two writers cannot both win" structural rather than
          // incidental.
          if (!updated) return err(conflictError(input.version, current.version));

          writeRevision(tx, updated, input.editorName, input.changeNote ?? null, now);
          pruneRevisions(tx, id);

          return ok({
            id: updated.id,
            slug: updated.slug,
            version: updated.version,
            updatedAt: now,
          });
        });
      } catch (error) {
        return err(mapArticleWriteError(error));
      }
    },

    /**
     * Soft archive: `status = 'archived'`, `archived_at` stamped, revisions
     * retained. Hard delete is not exposed in v1 (§7.3, design-spec U9).
     *
     * Bumps `version` like any other write, so an editor holding the old version
     * gets a `CONFLICT` instead of silently resurrecting an archived article, and
     * writes the matching revision to keep the numbering invariant exact.
     */
    archiveArticle(id: number, editorName = ANONYMOUS_EDITOR): Result<ArticleWriteResult> {
      const now = new Date();

      try {
        return db.transaction((tx): Result<ArticleWriteResult> => {
          const updated = tx
            .update(articles)
            .set({
              status: 'archived',
              archivedAt: now,
              updatedAt: now,
              version: sql`${articles.version} + 1`,
            })
            .where(eq(articles.id, id))
            .returning({
              id: articles.id,
              slug: articles.slug,
              version: articles.version,
              title: articles.title,
              summary: articles.summary,
              bodyMd: articles.bodyMd,
            })
            .get();

          if (!updated) return err(new AppError('NOT_FOUND', `No article with id ${id}.`));

          writeRevision(tx, updated, editorName, 'Archived', now);
          pruneRevisions(tx, id);

          return ok({
            id: updated.id,
            slug: updated.slug,
            version: updated.version,
            updatedAt: now,
          });
        });
      } catch (error) {
        return err(mapArticleWriteError(error));
      }
    },
  };
}

export const articleRepository = lazyRepository(createArticleRepository);
