import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './helpers/a11y';
import { SEED_ASSERTIONS, TOP_DEPLOY_SLUG } from './helpers/fixture';
import { waitForHydration } from './helpers/hydration';
import { resetDb } from './helpers/reset-db';

/**
 * Journey 2 — search (`architecture.md` §11.4).
 *
 * Typing in the header field must drive the URL (not a client-side list), the
 * fixture's three `deploy` matches must render with `<mark>` highlights, the count
 * must be announced in a live region with the exact copy, and opening the top
 * result must load its detail page. A nonsense query must render the 0-results
 * empty state with the `Clear search` action.
 */
test.beforeEach(async ({ page }) => {
  await resetDb(page);
});

/** Types into the header search field and waits for the debounced navigation. */
async function searchFor(page: Page, term: string) {
  // The field is a controlled input, so typing before React hydrates is discarded
  // silently — worst on WebKit (see helpers/hydration.ts).
  await waitForHydration(page);

  const field = page.getByRole('searchbox', { name: 'Search articles' });
  await expect(field).toBeVisible();
  await field.fill(term);
  await page.waitForURL(new RegExp(`/search\\?q=${encodeURIComponent(term)}$`));
}

test('search ranks and highlights the fixture matches', async ({ page }) => {
  await page.goto('/');
  await searchFor(page, 'deploy');

  // Exactly the fixture's documented number of results.
  const results = page.locator('main a[href^="/articles/"]');
  await expect(results).toHaveCount(SEED_ASSERTIONS.deployMatchCount);

  // The count is announced in a live region, with the exact copy from §3.3 rule 2.
  await expect(
    page.getByRole('status').filter({ hasText: `3 results for “deploy”` }).first(),
  ).toBeVisible();

  // `<mark>` highlights the term in the title and/or snippet (§10.6 rule 3).
  const marks = page.locator('main mark');
  expect(await marks.count()).toBeGreaterThan(0);
  await expect(marks.first()).toContainText(/deploy/i);

  // Title weighting (8×) puts the runbook first — the property task 7.1 records.
  await expect(results.first()).toHaveAttribute('href', `/articles/${TOP_DEPLOY_SLUG}`);

  await expectNoA11yViolations(page);

  // Opening the top result loads its detail page.
  await results.first().click();
  await page.waitForURL(`**/articles/${TOP_DEPLOY_SLUG}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('article h2').first()).toBeVisible();
});

test('a nonsense query renders the zero-results empty state', async ({ page }) => {
  await page.goto('/');
  await searchFor(page, 'zzzzqqq');

  await expect(page.locator('main a[href^="/articles/"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `No results for “zzzzqqq”` })).toBeVisible();
  // Two "Clear search" links exist on a zero-result page: the results header's ghost
  // link and the empty state's primary action. The empty state's is the last one.
  await expect(page.getByRole('link', { name: 'Clear search' }).last()).toHaveAttribute(
    'href',
    '/',
  );
  await expect(
    page.getByRole('status').filter({ hasText: `0 results for “zzzzqqq”` }).first(),
  ).toBeVisible();

  await expectNoA11yViolations(page);
});
