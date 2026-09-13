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

/**
 * The properties the Playwright specs assert on, computed from the dataset rather
 * than asserted by hand (`docs/iterations/iteration-7.md` task 7.1).
 *
 * These are emitted into the fixture so a spec's assumption and the fixture's
 * content cannot drift silently: change the seed in a way that breaks one of them
 * and `npm run db:fixture` records the new number, but the specs that assert the
 * old one fail loudly rather than passing against a different dataset.
 */
const published = SEED_ARTICLES.filter((article) => article.status === 'published');
const deployMatches = published.filter((article) =>
  /\bdeploy/i.test(`${article.title}\n${article.summary ?? ''}\n${article.bodyMd}`),
);
const deployByTitleWeight = [...deployMatches].sort((a, b) => {
  // `bm25` weights the title 8×, so a title match outranks a body-only match. The
  // comparator mirrors that: title hits first, then the shorter title (an exact
  // term in a short title is the stronger signal).
  const aTitle = /\bdeploy/i.test(a.title) ? 0 : 1;
  const bTitle = /\bdeploy/i.test(b.title) ? 0 : 1;
  return aTitle - bTitle || a.title.length - b.title.length;
})[0];

const assertions = {
  categories: SEED_CATEGORIES.length,
  articles: SEED_ARTICLES.length,
  published: published.length,
  drafts: SEED_ARTICLES.length - published.length,
  /** `search.spec.ts` asserts this exact count for the query `deploy`. */
  deployMatchCount: deployMatches.length,
  /** `search.spec.ts` asserts this is the top-ranked result for `deploy`. */
  topDeployResultSlug: deployByTitleWeight?.slug ?? null,
  /** `browse.spec.ts` asserts rendered Markdown (a real `<h2>` and `<table>`). */
  articleWithCodeTableAndTaskList: SEED_ARTICLES.find(
    (article) =>
      article.bodyMd.includes('```') &&
      /^\|/m.test(article.bodyMd) &&
      /^- \[[ x]\]/m.test(article.bodyMd),
  )?.slug,
  /** `empty-states.spec.ts` and the category assertions depend on a null category. */
  uncategorizedSlug: SEED_ARTICLES.find((article) => article.categorySlug === null)?.slug,
  /** A category with no articles, for the empty-category state. */
  emptyCategorySlug:
    SEED_CATEGORIES.find(
      (category) =>
        !SEED_ARTICLES.some(
          (article) => article.categorySlug === category.slug && article.status === 'published',
        ),
    )?.slug ?? null,
  /** `edit.spec.ts` asserts a new revision is listed after a save. */
  articleWithTwoOrMoreRevisions: SEED_ARTICLES.find((article) => (article.revisions ?? 1) >= 2)
    ?.slug,
};

const fixture = {
  /**
   * The documentation the brief asks to be "at the top of seed.json"
   * (`docs/iterations/iteration-7.md` task 7.1), expressed as a JSON string field
   * rather than `//` comments: a file named `.json` that no parser can read would
   * break `JSON.parse`, editors, and the specs that consume it. Key order puts this
   * first, so it reads as the file's header.
   */
  _comment: [
    'Generated file — do not edit by hand. Regenerate with `npm run db:fixture`.',
    '',
    'The deterministic E2E dataset from architecture.md §9.7: 4 categories and 9',
    'articles (7 published, 2 draft) with fixed titles, slugs, and statuses. The',
    '`assertions` block records the properties the Playwright specs rely on:',
    '',
    `  - exactly ${assertions.deployMatchCount} published articles match \`deploy\` (what search.spec.ts asserts)`,
    `  - \`${assertions.topDeployResultSlug}\` is the top-ranked result for \`deploy\` (title weighting 8x)`,
    `  - \`${assertions.articleWithCodeTableAndTaskList}\` has a fenced code block, a GFM table, and a task list`,
    `  - \`${assertions.uncategorizedSlug}\` has category_id: null (empty-states / category assertions)`,
    `  - \`${assertions.articleWithTwoOrMoreRevisions}\` has 2+ revisions (the history assertion in edit.spec.ts)`,
  ].join('\n'),
  // Recorded so a reader can tell which source produced this file.
  generatedFrom: 'src/server/db/seed.ts',
  assertions,
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

console.log(
  `Wrote ${target}: ${fixture.categories.length} categories, ${fixture.articles.length} articles ` +
    `(${published.length} published, ${fixture.articles.length - published.length} draft), ` +
    `${assertions.deployMatchCount} matching \`deploy\`.`,
);
