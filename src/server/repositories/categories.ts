import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { AppError } from '@/lib/errors';
import { err, ok, type Result } from '@/lib/result';
import { slugify, uniqueSlug } from '@/lib/slug';
import type { categoryCreateSchema } from '@/lib/validation/category';
import type { Database } from '@/server/db/create';
import { articles, categories } from '@/server/db/schema';
import type { CategoryDetail, CategoryRef, CategorySummary } from '@/types/domain';
import { lazyRepository } from './runtime';

/**
 * The **input** side of `categoryCreateSchema`, not its output.
 *
 * `z.infer` (the output type) marks `description` as present-but-maybe-undefined
 * because the schema ends in `.transform`, which makes `{ name }` alone fail to
 * typecheck. Callers hold unparsed data at this boundary — routes and actions run
 * the schema, per `architecture.md` §7.2's layering — so the input shape is the
 * honest signature.
 */
export type CategoryCreatePayload = z.input<typeof categoryCreateSchema>;

/**
 * Base slug used when a name contains nothing slug-worthy (`"???"`). Without
 * this, `slugify` returns `''` and the row would be stored with an empty slug,
 * which is not a usable URL segment.
 */
const FALLBACK_SLUG_BASE = 'category';

export function createCategoryRepository(db: Database) {
  const detailColumns = {
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
    description: categories.description,
  };

  /**
   * Every category with its **published** article count in a single query
   * (`architecture.md` §14.3) — no N+1, and drafts never inflate a count.
   */
  function listWithCounts(): CategorySummary[] {
    return db
      .select({
        ...detailColumns,
        articleCount: sql<number>`count(${articles.id})`,
      })
      .from(categories)
      .leftJoin(
        articles,
        and(eq(articles.categoryId, categories.id), eq(articles.status, 'published')),
      )
      .groupBy(categories.id)
      .orderBy(sql`${categories.name} COLLATE NOCASE ASC`)
      .all();
  }

  /** The `CategoryRef`-shaped list the editor's select and the filter chips render. */
  function listOptions(): CategoryRef[] {
    return db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .orderBy(sql`${categories.name} COLLATE NOCASE ASC`)
      .all();
  }

  return {
    listWithCounts,
    listOptions,

    getBySlug(slug: string): Result<CategoryDetail> {
      const row = db.select(detailColumns).from(categories).where(eq(categories.slug, slug)).get();
      if (!row) return err(new AppError('NOT_FOUND', `No category with slug "${slug}".`));
      return ok(row);
    },

    getById(id: number): Result<CategoryDetail> {
      const row = db.select(detailColumns).from(categories).where(eq(categories.id, id)).get();
      if (!row) return err(new AppError('NOT_FOUND', `No category with id ${id}.`));
      return ok(row);
    },

    create(input: CategoryCreatePayload): Result<CategoryDetail> {
      const name = input.name.trim();
      const description = input.description?.trim() || null;
      const now = new Date();

      try {
        // `better-sqlite3` runs this callback synchronously; there must be no
        // `await` inside it (architecture.md §8.7).
        return db.transaction((tx): Result<CategoryDetail> => {
          // Explicit guard rather than relying only on the `lower(name)`
          // expression index: §8.3 allows that index to be dropped, and the
          // duplicate must still surface as a clean 409 instead of a raw
          // constraint failure.
          const duplicate = tx
            .select({ id: categories.id })
            .from(categories)
            .where(sql`lower(${categories.name}) = lower(${name})`)
            .get();
          if (duplicate) {
            return err(new AppError('CONFLICT', `A category named "${name}" already exists.`));
          }

          const base = slugify(name) || FALLBACK_SLUG_BASE;

          // `uniqueSlug` probes candidate by candidate, so the lookup has to be a
          // real query rather than a pre-loaded set — a category could be added
          // between reads in another connection.
          const slug = uniqueSlug(
            base,
            (candidate) =>
              tx
                .select({ id: categories.id })
                .from(categories)
                .where(eq(categories.slug, candidate))
                .get() !== undefined,
          );

          const created = tx
            .insert(categories)
            .values({ name, slug, description, createdAt: now, updatedAt: now })
            .returning(detailColumns)
            .get();

          return ok(created);
        });
      } catch (error) {
        // The guards above make a constraint failure unreachable in normal
        // operation, so this is a last-resort translation that keeps any raw
        // driver error from escaping: every caller only renders `AppError`
        // (§10.5). v8 lines 126-142 stay uncovered by design.
        return err(mapCategoryWriteError(error, name));
      }
    },
  };
}

/**
 * The in-transaction guard above makes this unreachable in normal operation. It
 * is mapped anyway so a constraint failure can never escape the repository as a
 * raw driver error: the API layer only knows how to render `AppError`.
 */
function mapCategoryWriteError(error: unknown, name: string): AppError {
  const code = (error as { code?: string } | undefined)?.code;
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return new AppError('CONFLICT', `A category named "${name}" already exists.`);
  }
  return error instanceof AppError
    ? error
    : new AppError('INTERNAL', 'The category could not be created.', { cause: String(error) });
}

export const categoryRepository = lazyRepository(createCategoryRepository);
