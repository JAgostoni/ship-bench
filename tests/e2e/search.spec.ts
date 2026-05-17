import { test, expect } from '@playwright/test';

test.describe('Search Journey', () => {
  test('should search for articles and filter the list', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByPlaceholder('Search articles...');
    await searchInput.fill('React');
    
    // Wait for debounced search to trigger navigation
    await expect(page).toHaveURL(/search=React/);
    
    // Verify results
    await expect(page.locator('h1')).toContainText('Search: "React"');
    
    const articleCards = page.locator('a[href^="/articles/"]');
    await expect(articleCards.first()).toBeVisible();
    
    // Check for highlights
    const highlight = page.locator('mark').first();
    await expect(highlight).toBeVisible();
    await expect(highlight).toContainText(/React/i);
  });

  test('should show empty state for non-existent terms', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByPlaceholder('Search articles...');
    await searchInput.fill('NonExistentTermXYZ');
    
    await expect(page).toHaveURL(/search=NonExistentTermXYZ/);
    await expect(page.getByText(/No results found for "NonExistentTermXYZ"/)).toBeVisible();
  });
});
