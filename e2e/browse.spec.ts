import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers/a11y';
import { CODEX_ARTICLE_SLUG, DRAFT_ARTICLES, PUBLISHED_ARTICLES } from './helpers/fixture';
import { resetDb } from './helpers/reset-db';

/**
 * Journey 1 — browse (`architecture.md` §11.4).
 *
 * Open `/`, confirm the seeded published titles render and the drafts do not, click
 * an article, confirm the Markdown was actually rendered (a real `<h2>` and
 * `<table>`, not the literal `##` and `|` syntax), then go back and confirm the
 * previous view is preserved. The a11y smoke check runs on both routes.
 */
test.beforeEach(async ({ page }) => {
  await resetDb(page);
});

test('browse → detail → back', async ({ page }) => {
  await page.goto('/');

  // Every published seed title is present, and the count line agrees.
  for (const article of PUBLISHED_ARTICLES) {
    await expect(page.getByRole('heading', { level: 3, name: article.title })).toBeVisible();
  }
  await expect(page.getByRole('status').first()).toContainText(
    `${PUBLISHED_ARTICLES.length} published`,
  );

  // Drafts are excluded from the default view (design-spec.md §4.5).
  for (const draft of DRAFT_ARTICLES) {
    await expect(page.getByRole('heading', { level: 3, name: draft.title })).toHaveCount(0);
  }

  // A filter the back-navigation must restore.
  await page.goto('/?sort=title');
  await expect(
    page.getByRole('heading', { level: 3, name: PUBLISHED_ARTICLES[0].title }),
  ).toBeVisible();

  // Scroll a little so "position preserved" is a real assertion where the page allows it.
  await page.evaluate(() => window.scrollTo(0, 200));
  const scrollBefore = await page.evaluate(() => window.scrollY);

  const targetSlug = CODEX_ARTICLE_SLUG;
  const targetTitle = PUBLISHED_ARTICLES.find((a) => a.slug === targetSlug)?.title ?? '';
  expect(targetTitle, `fixture must contain ${targetSlug}`).not.toBe('');

  await page.getByRole('heading', { level: 3, name: targetTitle }).click();
  await page.waitForURL(`**/articles/${targetSlug}`);

  // --- detail: rendered Markdown, breadcrumb, h1, meta line -------------------
  await expect(page.getByRole('heading', { level: 1, name: targetTitle })).toBeVisible();

  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
  await expect(
    page.locator('nav[aria-label="Breadcrumb"] li[aria-current="page"]'),
  ).toHaveAttribute('title', targetTitle);

  // The meta line carries the reading time.
  await expect(page.getByText(/\d+ min read/)).toBeVisible();

  // Markdown is rendered, not shown as source: a real heading and a real table.
  const body = page.locator('article');
  await expect(body.locator('h2').first()).toBeVisible();
  await expect(body.locator('table').first()).toBeVisible();
  await expect(body.locator('pre code, code').first()).toBeVisible();

  // The literal Markdown syntax must not leak into the visible text. The table
  // syntax is the honest check for "was this rendered or dumped as source".
  const bodyText = await body.innerText();
  expect(bodyText).not.toContain('## ');
  expect(bodyText).not.toContain('| ---');

  await expectNoA11yViolations(page);

  // --- back: filters and scroll position preserved ---------------------------
  await page.goBack();
  await page.waitForURL('**/?sort=title');
  expect(new URL(page.url()).searchParams.get('sort')).toBe('title');

  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(2);

  await expect(page.getByRole('heading', { level: 3, name: targetTitle })).toBeVisible();
  await expectNoA11yViolations(page);
});
