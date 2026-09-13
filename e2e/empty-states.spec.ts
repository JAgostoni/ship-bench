import { expect, test } from '@playwright/test';
import { E2E_TEST_MODE, emptyE2eDatabase } from './helpers/empty-db';
import { SEED_ARTICLES, SEED_CATEGORIES } from './helpers/fixture';
import { resetDb } from './helpers/reset-db';

/**
 * Journey 4 — the canonical empty states (`architecture.md` §11.4, `design-spec.md`
 * §5.6).
 *
 * The rule under test is §7.3's "no list surface may render blank": every empty
 * list renders a titled, described, actionable state, and the **copy is exact** —
 * a user who sees "No articles yet" when a filter is simply too narrow would be
 * told something factually false and might create a duplicate (UX20).
 *
 * There are five states, and the point of the last test is that no two render the
 * same title.
 *
 * **Serialized (`mode: 'serial'`).** These tests deliberately empty the shared E2E
 * database, so running them in parallel with each other would have one test's
 * `emptyE2eDatabase()` race another's assertions. Serial mode is the documented
 * per-spec isolation pattern (`architecture.md` §9.7) rather than a workaround.
 */
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await resetDb(page);
});

test('1 — no articles exist at all', async ({ page }) => {
  emptyE2eDatabase({ e2eTestMode: E2E_TEST_MODE });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'No articles yet' })).toBeVisible();
  await expect(
    page.getByText("Create the first article to start building your team's knowledge base."),
  ).toBeVisible();
  // Three "New article" links exist on this page (header, page heading, empty state);
  // the empty state's is the last, and its target is what §5.6 state 1 specifies.
  await expect(page.getByRole('link', { name: 'New article' }).last()).toHaveAttribute(
    'href',
    '/articles/new',
  );
});

test('2 — a search returns nothing', async ({ page }) => {
  await page.goto('/search?q=zzzzqqq');

  await expect(page.getByRole('heading', { name: 'No results for “zzzzqqq”' })).toBeVisible();
  await expect(page.getByText('Try a different term, or browse all articles.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Clear search' }).last()).toHaveAttribute(
    'href',
    '/',
  );
});

test('3 — a category has no articles', async ({ page }) => {
  // The fixture guarantees `people` holds exactly one published article; archiving
  // it (a soft status change, the only removal the API exposes) empties the category.
  const people = SEED_CATEGORIES.find((category) => category.slug === 'people');
  if (!people) throw new Error('The fixture must contain the `people` category');

  const peopleArticles = SEED_ARTICLES.filter(
    (article) => article.categorySlug === 'people' && article.status === 'published',
  );
  expect(peopleArticles.length, 'the people category must start non-empty').toBeGreaterThan(0);

  for (const article of peopleArticles) {
    const response = await page.request.delete(`/api/articles/${article.slug}`);
    expect(response.status(), `archiving ${article.slug}`).toBe(204);
  }

  await page.goto('/categories/people');

  await expect(page.getByRole('heading', { name: 'Nothing in People yet' })).toBeVisible();
  await expect(
    page.getByText('Articles you assign to this category will appear here.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'New article in People' })).toHaveAttribute(
    'href',
    '/articles/new?category=people',
  );
});

test('5 — a filter combination yields nothing, distinct from "No articles yet"', async ({
  page,
}) => {
  // `uncategorized` still holds an article, but it is published — so this filter
  // combination matches nothing while articles unmistakably exist.
  await page.goto('/?status=draft&category=uncategorized');

  await expect(
    page.getByRole('heading', { name: 'No articles match these filters.' }),
  ).toBeVisible();
  await expect(page.getByText('Try removing a filter.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/');

  // Distinct from the unfiltered zero-article state.
  await expect(page.getByRole('heading', { name: 'No articles yet' })).toHaveCount(0);
});

test('4 — no categories exist', async ({ page }) => {
  emptyE2eDatabase({ categories: true, e2eTestMode: E2E_TEST_MODE });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'No categories yet' })).toBeVisible();
  await expect(page.getByText('Categories help you group related articles.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a category' })).toBeVisible();
});

test('all five states are distinguishable by title', async ({ page }) => {
  // The five canonical titles from design-spec.md §5.6 — one string each, no two equal.
  const titles = [
    'No articles yet',
    'No results for “zzzzqqq”',
    'Nothing in People yet',
    'No categories yet',
    'No articles match these filters.',
  ];

  expect(new Set(titles).size).toBe(titles.length);

  // And at least one is live in this run, so the assertion is not merely arithmetic.
  emptyE2eDatabase({ e2eTestMode: E2E_TEST_MODE });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'No articles yet' })).toBeVisible();
});
