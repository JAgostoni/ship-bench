import { test, expect, request } from '@playwright/test';
import { deleteTestArticles } from './fixtures/test-data';

test.describe('Edit flow', () => {
  const createdIds: number[] = [];

  test.afterAll(async () => {
    const apiContext = await request.newContext();
    await deleteTestArticles(apiContext, createdIds);
  });

  test('create, edit, and delete an article', async ({ page }) => {
    const uniqueTitle = `E2E Test Article ${Date.now()}`;

    // 1. Navigate to create page
    await page.goto('/articles/new');
    await expect(page.locator('form[aria-label="Create article"]')).toBeVisible();

    // 2. Fill in the form
    await page.fill('[data-testid="article-title-input"]', uniqueTitle);
    await page.fill(
      '[data-testid="article-content-textarea"]',
      '# Hello World\n\nThis is a test article.',
    );

    // Select a category
    await page.selectOption('[data-testid="article-category-select"]', { label: 'Guides' });

    // 3. Publish
    await page.click('[data-testid="article-publish-button"]');

    // 4. Verify redirect to article detail
    await expect(page.locator('h1').first()).toContainText(uniqueTitle);
    await expect(page.locator('.prose')).toContainText('Hello World');

    // Track the created article for cleanup
    const slug = page.url().split('/').pop();
    if (slug) {
      const apiContext = await request.newContext();
      const article = await import('./fixtures/test-data').then((m) =>
        m.getArticleBySlug(apiContext, slug),
      );
      if (article) {
        createdIds.push(article.id);
      }
    }

    // 5. Navigate to edit
    await page.click('text=Edit');
    await expect(page.locator('[data-testid="article-title-input"]')).toHaveValue(uniqueTitle);

    // 6. Modify content
    const updatedContent = '# Updated\n\nContent has been modified.';
    await page.fill('[data-testid="article-content-textarea"]', updatedContent);

    // 7. Save
    await page.click('[data-testid="article-save-button"]');

    // 8. Verify updated content
    await expect(page.locator('.prose')).toContainText('Content has been modified');

    // 9. Delete the article
    await page.click('text=Edit');

    // Handle the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('[data-testid="article-delete-button"]');

    // 10. Verify redirected to home
    await expect(page).toHaveURL(/\/\?deleted=1/);
  });

  test('form validation shows errors', async ({ page }) => {
    await page.goto('/articles/new');

    // Try to publish without filling anything
    await page.click('[data-testid="article-publish-button"]');

    // Verify validation errors
    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Content cannot be empty')).toBeVisible();
  });
});