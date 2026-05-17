import { test, expect } from '@playwright/test';

test.describe('Edit Journey', () => {
  test('should create, edit, and delete an article', async ({ page }) => {
    // 1. Create
    await page.goto('/articles/new');
    
    const titleInput = page.locator('#title');
    const contentTextArea = page.locator('textarea');
    
    const uniqueTitle = `Test Article ${Date.now()}`;
    await titleInput.fill(uniqueTitle);
    await contentTextArea.fill('This is a test article content.');
    
    await page.getByText('Create Article').click();
    
    // Should navigate to detail page
    await expect(page).toHaveURL(/\/articles\/.+/);
    await expect(page.locator('h1')).toContainText(uniqueTitle);
    
    // 2. Edit
    await page.getByText('Edit').click();
    await expect(page.locator('h1')).toContainText('Edit Article');
    
    const updatedTitle = `${uniqueTitle} (Updated)`;
    await titleInput.fill(updatedTitle);
    await contentTextArea.fill('Updated content.');
    
    await page.getByText('Save Changes').click();
    
    // Should navigate back to detail page
    await expect(page).toHaveURL(/\/articles\/.+/);
    await expect(page.locator('h1')).toContainText(updatedTitle);
    await expect(page.locator('article')).toContainText('Updated content.');
    
    // 3. Delete
    await page.getByText('Edit').click();
    
    // Handle dialog
    page.once('dialog', dialog => dialog.accept());
    await page.getByText('Delete').click();
    
    // Should navigate back to home
    await expect(page).toHaveURL(/http:\/\/127.0.0.1:3000\/?/);
    await expect(page.locator('h1')).toContainText('Latest Articles');
    await expect(page.locator('body')).not.toContainText(updatedTitle);
  });
});
