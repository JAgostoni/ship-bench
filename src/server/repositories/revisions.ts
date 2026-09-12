import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { err, ok, type Result } from '@/lib/result';
import type { Database } from '@/server/db/create';
import { articleRevisions } from '@/server/db/schema';
import type { RevisionSummary } from '@/types/domain';
import { lazyRepository } from './runtime';

/** Revisions `listForArticle` returns by default — `design-spec.md` §3.4's five. */
export const DEFAULT_REVISION_LIMIT = 5;

export function createRevisionRepository(db: Database) {
  const columns = {
    id: articleRevisions.id,
    revisionNumber: articleRevisions.revisionNumber,
    title: articleRevisions.title,
    summary: articleRevisions.summary,
    bodyMd: articleRevisions.bodyMd,
    editorName: articleRevisions.editorName,
    changeNote: articleRevisions.changeNote,
    createdAt: articleRevisions.createdAt,
  };

  return {
    /**
     * The most recent revisions, newest first — exactly the fields
     * `design-spec.md` §3.4 renders (`#12 · Jason · 2 days ago · "…"`).
     */
    listForArticle(articleId: number, limit = DEFAULT_REVISION_LIMIT): RevisionSummary[] {
      return db
        .select(columns)
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, articleId))
        .orderBy(desc(articleRevisions.revisionNumber))
        .limit(limit)
        .all();
    },

    getById(id: number): Result<RevisionSummary> {
      const row = db
        .select(columns)
        .from(articleRevisions)
        .where(eq(articleRevisions.id, id))
        .get();

      if (!row) return err(new AppError('NOT_FOUND', `No revision with id ${id}.`));
      return ok(row);
    },
  };
}

export const revisionRepository = lazyRepository(createRevisionRepository);
