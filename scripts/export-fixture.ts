// Generates `e2e/fixtures/seed.json` from the single source of truth in
// `src/server/db/seed.ts` (architecture.md §9.7).
//
// The fixture exists because `POST /api/test/reset` re-seeds the E2E database from a
// JSON file rather than from the `seed()` function: the route handler runs inside the
// Next.js server bundle, and importing the seed module there would pull its whole body
// text into the route's bundle. Generating the JSON from the same arrays keeps the two
// datasets identical without a second hand-maintained copy to drift.
//
// Run: `npm run db:fixture`
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { SEED_ARTICLES, SEED_CATEGORIES } from '../src/server/db/seed';

const target = './e2e/fixtures/seed.json';

const fixture = {
  // Recorded so a reader can tell which source produced this file.
  generatedFrom: 'src/server/db/seed.ts',
  categories: SEED_CATEGORIES.map((category) => ({
    name: category.name,
    slug: category.slug,
    description: category.description,
  })),
  articles: SEED_ARTICLES.map((article) => ({
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    bodyMd: article.bodyMd,
    status: article.status,
    categorySlug: article.categorySlug,
    revisions: article.revisions ?? 1,
  })),
};

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');

const published = fixture.articles.filter((a) => a.status === 'published').length;
console.log(
  `Wrote ${target}: ${fixture.categories.length} categories, ${fixture.articles.length} articles ` +
    `(${published} published, ${fixture.articles.length - published} draft).`,
);
