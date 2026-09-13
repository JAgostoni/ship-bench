import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The deterministic E2E dataset (`architecture.md` §9.7) as a typed value.
 *
 * The file is read with `node:fs` rather than `import ... with { type: 'json' }`:
 * the repository is `"type": "module"`, and a static JSON import needs an import
 * attribute that Playwright's loader does not add for the specs. Reading and
 * parsing once at module load keeps a single source of truth — a seeded title,
 * slug, or count appears here and nowhere else, so a spec cannot assert a string
 * the fixture does not contain.
 *
 * `assertions` carries the properties the specs depend on, recorded by
 * `scripts/export-fixture.ts` at generation time.
 */
export type SeedArticle = {
  title: string;
  slug: string;
  summary: string | null;
  bodyMd: string;
  status: 'draft' | 'published';
  categorySlug: string | null;
  revisions: number;
};

export type SeedCategory = { name: string; slug: string; description: string };

type SeedFixture = {
  generatedFrom: string;
  assertions: {
    categories: number;
    articles: number;
    published: number;
    drafts: number;
    deployMatchCount: number;
    topDeployResultSlug: string | null;
    articleWithCodeTableAndTaskList: string | null;
    uncategorizedSlug: string | null;
    emptyCategorySlug: string | null;
    articleWithTwoOrMoreRevisions: string | null;
  };
  categories: SeedCategory[];
  articles: SeedArticle[];
};

// Playwright runs specs with `process.cwd()` set to the config file's directory
// (the repository root), so this resolves regardless of where the runner was invoked.
const FIXTURE_PATH = resolve(process.cwd(), 'e2e', 'fixtures', 'seed.json');

const seed = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as SeedFixture;

export const SEED = seed;
export const SEED_CATEGORIES = seed.categories;
export const SEED_ARTICLES = seed.articles;
export const SEED_ASSERTIONS = seed.assertions;

/** Every published article, in fixture order. */
export const PUBLISHED_ARTICLES = SEED_ARTICLES.filter((a) => a.status === 'published');

/** Every draft article, in fixture order. */
export const DRAFT_ARTICLES = SEED_ARTICLES.filter((a) => a.status === 'draft');

/** Narrows a documented-by-generation assertion to a string, failing loudly if null. */
export function requireAssertion(value: string | null, name: string): string {
  if (value === null) {
    throw new Error(
      `The fixture's \`assertions.${name}\` is null, but a spec depends on it. ` +
        'Regenerate with `npm run db:fixture` and check the seed data.',
    );
  }
  return value;
}

/** The article the browse spec opens (fenced code block, GFM table, task list). */
export const CODEX_ARTICLE_SLUG = requireAssertion(
  SEED_ASSERTIONS.articleWithCodeTableAndTaskList,
  'articleWithCodeTableAndTaskList',
);

/** The article the deploy search ranks first. */
export const TOP_DEPLOY_SLUG = requireAssertion(
  SEED_ASSERTIONS.topDeployResultSlug,
  'topDeployResultSlug',
);

/** The multi-revision article the edit spec saves over. */
export const EDITABLE_SLUG = requireAssertion(
  SEED_ASSERTIONS.articleWithTwoOrMoreRevisions,
  'articleWithTwoOrMoreRevisions',
);
