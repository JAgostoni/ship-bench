import { test, expect } from '@playwright/test';

test('create: create new article and verify it appears in list', async ({ page }) => {
  const uniqueTitle = `Test Article ${Date.now()}`;

  await page.goto('/articles/new');

  // Fill in title
  await page.getByLabel(/title/i).fill(uniqueTitle);

  // Blur to trigger slug preview
  await page.getByLabel(/title/i).blur();
  await expect(page.getByText(/URL: \/articles\//)).toBeVisible();

  // Fill in content via the hidden textarea (mirrors MD editor state)
  await page.locator('textarea[name="content"]').fill('Hello from the E2E test.');

  // Submit
  await page.getByRole('button', { name: /create article/i }).click();

  // Redirected to the new article detail page (exclude /articles/new which pre-matches the pattern)
  await page.waitForURL(url => url.href.includes('/articles/') && !url.href.endsWith('/articles/new'));

  // First h1 in main is the article title (not a Markdown heading inside .prose)
  await expect(page.locator('main h1').first()).toContainText(uniqueTitle);

  // Navigate back to list and confirm the article appears
  await page.goto('/articles');
  await expect(page.getByText(uniqueTitle)).toBeVisible();
});

test('create: shows validation errors for empty submission', async ({ page }) => {
  await page.goto('/articles/new');

  // Submit with no data
  await page.getByRole('button', { name: /create article/i }).click();

  // Validation error alert should appear (title is required)
  const alert = page.getByRole('alert').first();
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/required/i);
});
