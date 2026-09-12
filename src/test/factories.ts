// Test-only payload builders (architecture.md §11.5). Pure: no database access,
// and the only shared state is a monotonically increasing counter, so every
// payload a test receives is valid and unique without any test having to
// coordinate with another.
import type { articles, categories } from '@/server/db/schema';

export type ArticleInsert = typeof articles.$inferInsert;
export type CategoryInsert = typeof categories.$inferInsert;

/**
 * Fixed epoch for generated timestamps. Deterministic (not `Date.now()`) so
 * ordering assertions are stable, and offset by `n` so every successive payload
 * sorts after the previous one.
 */
const BASE_TIMESTAMP = Date.UTC(2026, 0, 1, 0, 0, 0);

let articleCounter = 0;
let categoryCounter = 0;

/** Resets the counters so a test file's payloads start from a known value. */
export function resetFactoryCounters(): void {
  articleCounter = 0;
  categoryCounter = 0;
}

/** A valid `articles` insert payload. `title`/`slug` are unique per call. */
export function makeArticle(overrides: Partial<ArticleInsert> = {}): ArticleInsert {
  const n = ++articleCounter;
  const timestamp = new Date(BASE_TIMESTAMP + n * 60_000);
  const title = `Test Article ${n}`;

  return {
    title,
    slug: `test-article-${n}`,
    summary: null,
    bodyMd: `## ${title}\n\nBody text for ${title}.`,
    status: 'published',
    categoryId: null,
    version: 1,
    publishedAt: timestamp,
    archivedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

/** A valid `categories` insert payload. `name`/`slug` are unique per call. */
export function makeCategory(overrides: Partial<CategoryInsert> = {}): CategoryInsert {
  const n = ++categoryCounter;
  const timestamp = new Date(BASE_TIMESTAMP + n * 60_000);
  const name = `Test Category ${n}`;

  return {
    name,
    slug: `test-category-${n}`,
    description: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}
