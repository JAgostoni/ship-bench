import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers/a11y';
import { EDITABLE_SLUG, SEED_ARTICLES } from './helpers/fixture';
import { waitForHydration } from './helpers/hydration';
import { resetDb } from './helpers/reset-db';

/**
 * Journey 3 — edit and persist (`architecture.md` §11.4).
 *
 * The load-bearing assertion is the **post-reload** one: it proves the change
 * reached SQLite rather than only React state. The spec also checks the redirect
 * and the new revision in History, and covers the create path with its toast.
 *
 * **Serialized (`mode: 'serial'`).** This is the one spec that mutates across
 * multiple requests in a single test, and `resetDb()` truncates the shared E2E
 * database. With `fullyParallel: true` a sibling test's `beforeEach` reset can run
 * between this spec's save and its reload, deleting the row the reload is about to
 * assert on — which is exactly what produced a spurious "article not found" failure.
 * `architecture.md` §9.7 anticipates this ("SQLite tolerates the write contention,
 * but serializing removes flakiness at negligible cost"); serial mode applies that
 * reasoning within the spec while leaving the other, read-only specs parallel.
 */
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await resetDb(page);
});

const seeded = SEED_ARTICLES.find((a) => a.slug === EDITABLE_SLUG);
if (!seeded) throw new Error(`The fixture must contain ${EDITABLE_SLUG}`);

test('editing an article persists across a full reload and adds a revision', async ({ page }) => {
  const newTitle = `${seeded.title} (edited)`;
  const bodyMarker = 'E2E body change marker';

  // A multi-revision article is what makes the History assertion meaningful.
  const revisionsBefore = seeded.revisions;

  await page.goto(`/articles/${EDITABLE_SLUG}`);
  await expect(page.getByRole('heading', { level: 1, name: seeded.title })).toBeVisible();
  await waitForHydration(page);

  await page.getByRole('link', { name: 'Edit' }).first().click();
  await page.waitForURL(`**/articles/${EDITABLE_SLUG}/edit`);
  await waitForHydration(page);

  await expectNoA11yViolations(page);

  // The form is seeded from the stored article.
  await expect(page.locator('#title')).toHaveValue(seeded.title);
  await page.locator('#bodyMd').waitFor({ state: 'visible' });

  await page.locator('#title').fill(newTitle);
  await page.locator('#bodyMd').fill(`## ${bodyMarker}\n\nA paragraph added by the E2E run.`);

  await page.getByRole('button', { name: 'Save changes' }).first().click();

  // Success redirects to the detail page. The URL carries `?toast=saved`, which is
  // stripped by a `router.replace` shortly after landing, so the pattern accepts an
  // optional query string instead of pinning one moment in that sequence.
  await page.waitForURL(new RegExp(`/articles/${EDITABLE_SLUG}(\\?|$)`));
  await expect(page.getByRole('heading', { level: 1, name: newTitle })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: bodyMarker })).toBeVisible();

  // --- the real proof: a full reload keeps the change ------------------------
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: newTitle })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: bodyMarker })).toBeVisible();

  // History gained exactly one revision, and the newest row is the new version
  // number. (Rows show `#N · editor · time · note`, not the body, so the revision
  // number is what proves the save wrote history.)
  const history = page.locator('details').filter({ hasText: 'History' });
  if (!(await history.evaluate((node) => (node as HTMLDetailsElement).open))) {
    await history.locator('summary').click();
  }
  await expect(history.locator('summary')).toContainText(`${revisionsBefore + 1} revision`);
  await expect(history.locator(`text=#${revisionsBefore + 1}`).first()).toBeVisible();

  // The newest revision's View dialog renders the body we just saved, which is the
  // second independent proof the write reached storage.
  await history.getByRole('button', { name: /View/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 2, name: bodyMarker })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await expectNoA11yViolations(page);
});

test('creating an article redirects to its detail page with the created toast', async ({
  page,
}) => {
  await resetDb(page);

  await page.goto('/articles/new');
  await page.locator('#bodyMd').waitFor({ state: 'visible' });
  await waitForHydration(page);

  await page.locator('#title').fill('E2E Created Article');
  await page.locator('#bodyMd').fill('## Created by the E2E suite\n\nBody text.');

  await page.getByRole('button', { name: 'Save article' }).first().click();

  // The redirect target carries `?toast=created`, which `ToastFromQuery` strips with a
  // `router.replace` a moment later — so match the path with or without a query string
  // rather than pinning the exact URL.
  await page.waitForURL(/\/articles\/e2e-created-article(\?|$)/);
  await waitForHydration(page);

  // The toast is rendered from `?toast=created`, and `ToastFromQuery` strips the
  // parameter with a `router.replace` right after. Assert the copy while it is on
  // screen, then wait for the parameter to actually leave the URL before reloading —
  // a reload fired mid-replace lands on the pre-strip URL and replays the notice,
  // which makes the reload assertion about the toast rather than the article.
  await expect(page.getByText('Article created.')).toBeVisible();
  await page.waitForFunction(() => !window.location.search.includes('toast='));

  await expect(page.getByRole('heading', { level: 1, name: 'E2E Created Article' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'E2E Created Article' })).toBeVisible();
});
