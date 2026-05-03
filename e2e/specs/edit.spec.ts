import { test, expect } from '@playwright/test';

test.describe('Create / Edit / Delete Articles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('create article, save, verify detail page', async ({ page }) => {
    await page.getByRole('link', { name: 'New Article' }).click();
    await expect(page).toHaveURL('/articles/new');

    await page.getByRole('textbox', { name: 'Article title' }).fill('E2E Test Article');
    await page.getByRole('combobox', { name: 'Category' }).selectOption('Engineering');
    await page.getByRole('textbox', { name: 'Add tag' }).fill('e2e-tag');
    await page.getByRole('textbox', { name: 'Add tag' }).press('Enter');

    await page.locator('textarea[aria-label=\"Article content\"]').fill('# E2E Test\n\nThis is an end-to-end test article created by Playwright.');

    await page.getByTestId('editor-save').click();

    await expect(page).toHaveURL('/articles/e2e-test-article');
    await expect(page.getByRole('heading', { name: 'E2E Test Article', level: 1 }).first()).toBeVisible();
    await expect(page.getByText('This is an end-to-end test article created by Playwright.')).toBeVisible();
    await expect(page.getByText('#e2e-tag')).toBeVisible();
  });

  test('attempt to save with empty title shows validation error', async ({ page }) => {
    await page.getByRole('link', { name: 'New Article' }).click();
    const titleInput = page.getByRole('textbox', { name: 'Article title' });
    await titleInput.fill('temp');
    await titleInput.clear();
    await page.locator('textarea[aria-label=\"Article content\"]').fill('Some content');
    await titleInput.blur();
    await expect(page.getByText('Title is required')).toBeVisible();
  });

  test('create article then search for it by content keyword', async ({ page }) => {
    await page.getByRole('link', { name: 'New Article' }).click();
    await page.getByRole('textbox', { name: 'Article title' }).fill('Searchable E2E Article');
    await page.locator('textarea[aria-label=\"Article content\"]').fill('Unique content phrase xyzzy12345 for search verification.');
    await page.getByTestId('editor-save').click();
    await expect(page).toHaveURL('/articles/searchable-e2e-article');

    await page.goto('/');
    const searchInput = page.getByRole('textbox', { name: 'Search articles' });
    await searchInput.fill('xyzzy12345');
    await expect(page.getByTestId('article-card').filter({ hasText: 'Searchable E2E Article' })).toBeVisible();
  });

  test('edit existing article and verify updated content', async ({ page }) => {
    // Use a unique title with a timestamp to avoid collisions on retry
    const uniqueTitle = 'Edit Test ' + Date.now();
    await page.getByRole('link', { name: 'New Article' }).click();
    await page.getByRole('textbox', { name: 'Article title' }).fill(uniqueTitle);
    await page.locator('textarea[aria-label=\"Article content\"]').fill('Original content.');
    await page.getByTestId('editor-save').click();

    // Wait for navigation away from /articles/new before extracting slug
    await expect(page).not.toHaveURL('/articles/new');
    const detailUrl = new URL(page.url()).pathname;
    const slug = detailUrl.replace(/^\/articles\//, '').replace(/\/$/, '');

    await page.getByRole('link', { name: 'Edit' }).click();
    await expect(page).toHaveURL('/articles/' + slug + '/edit');

    const contentTextarea = page.locator('textarea[aria-label=\"Article content\"]');
    await contentTextarea.fill('Updated content from E2E test.');

    await page.getByTestId('editor-save').click();
    await expect(page).toHaveURL('/articles/' + slug);
    // Use a scoped locator to avoid matching the textarea (React StrictMode double render)
    await expect(page.locator('article p').filter({ hasText: 'Updated content from E2E test.' })).toBeVisible();
  });

  test('verify slug does not change after editing title', async ({ page }) => {
    await page.getByTestId('article-card').filter({ hasText: 'Benefits Overview' }).click();
    const originalSlug = page.url();

    await page.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('textbox', { name: 'Article title' }).fill('Benefits Overview Updated Title');
    await page.getByTestId('editor-save').click();

    await expect(page).toHaveURL(originalSlug);
    await expect(page.getByRole('heading', { name: 'Benefits Overview Updated Title', level: 1 }).first()).toBeVisible();
  });

  test('delete article from detail page with confirmation', async ({ page }) => {
    const uniqueTitle = 'Delete Test ' + Date.now();
    await page.getByRole('link', { name: 'New Article' }).click();
    await page.getByRole('textbox', { name: 'Article title' }).fill(uniqueTitle);
    await page.locator('textarea[aria-label=\"Article content\"]').fill('This article will be deleted.');
    await page.getByTestId('editor-save').click();
    const detailUrl = page.url();
    await page.waitForSelector('[data-testid=\"detail-delete\"]');

    await page.getByTestId('detail-delete').click();
    await expect(page.getByRole('dialog', { name: 'Delete article' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Delete article' }).getByRole('button', { name: 'Delete' }).click();

    await page.waitForURL('/', { timeout: 5000 });
    await page.waitForSelector('[data-testid=\"article-card\"]');
    await expect(page.getByText(uniqueTitle)).not.toBeVisible();
  });
});