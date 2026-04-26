import { test, expect } from '@playwright/test';

test.describe('Article Creation and Editing', () => {
  test('Journey 3: Create a new article', async ({ page }) => {
    // 1. Navigate to the new article page
    await page.goto('/');
    await page.click('text=New Article');
    await expect(page).toHaveURL('/articles/new');

    // 2. Fill in the title and content
    const uniqueTitle = `Test Article ${Date.now()}`;
    await page.fill('input[name="title"]', uniqueTitle);
    await page.fill('textarea[name="content"]', '# This is a test article\n\nIt has some **bold** text.');

    // 3. Submit the form
    await page.click('button[type="submit"]:has-text("Save")');

    // 4. Verify redirection and new content
    // We should be redirected to the new article's detail page.
    await expect(page).toHaveURL(/\/articles\/test-article-/);
    
    // Verify the title is visible in the h1
    await expect(page.locator('h1').filter({ hasText: uniqueTitle })).toBeVisible();

    // Verify the rendered markdown content is visible
    // The markdown viewer parses the `#` into an h1 element
    await expect(page.locator('h1', { hasText: 'This is a test article' })).toBeVisible();
    await expect(page.locator('strong', { hasText: 'bold' })).toBeVisible();
  });
});