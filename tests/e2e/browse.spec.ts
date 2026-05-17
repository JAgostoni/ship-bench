import { test, expect } from '@playwright/test';

test.describe('Browse Journey', () => {
  test('should display article list and navigate to details', async ({ page }) => {
    await page.goto('/');
    
    // Check for heading
    await expect(page.locator('h1')).toContainText('Latest Articles');
    
    // Check for articles
    const articleCards = page.locator('a[href^="/articles/"]').filter({ has: page.locator('h2') });
    await expect(articleCards.first()).toBeVisible();
    
    // Click the first article
    const firstArticle = articleCards.first();
    const title = await firstArticle.locator('h2').textContent();
    await firstArticle.click();
    
    // Verify navigation
    await expect(page).toHaveURL(/\/articles\/.+/);
    
    // Verify content
    await expect(page.locator('h1')).toContainText(title || '');
    await expect(page.locator('article')).toBeVisible();
  });
});
