import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('Journey 2: Enter query and view search results', async ({ page }) => {
    // 1. Create a unique article to ensure a known search result exists
    await page.goto('/articles/new');
    const uniqueString = `Searchable ${Date.now()}`;
    await page.fill('input[name="title"]', uniqueString);
    await page.fill('textarea[name="content"]', `This content contains ${uniqueString}`);
    await page.click('button[type="submit"]:has-text("Save")');
    await expect(page).toHaveURL(/\/articles\//);

    // 2. Perform a search using the unique string
    const searchInput = page.getByPlaceholder('Search articles...');
    await searchInput.fill(uniqueString);
    await searchInput.press('Enter');

    // 3. Verify the URL and search results page
    await expect(page).toHaveURL(new RegExp(`/search\\?q=${encodeURIComponent(uniqueString)}`));
    await expect(page.locator('h1').filter({ hasText: `Search results for '${uniqueString}'` })).toBeVisible();

    // 4. Verify the created article appears in the results
    const resultLink = page.getByRole('link', { name: new RegExp(uniqueString) }).first();
    await expect(resultLink).toBeVisible();
    
    // 5. Click the result and verify it navigates correctly
    await resultLink.click();
    await expect(page.locator('h1').filter({ hasText: uniqueString })).toBeVisible();
  });
});
