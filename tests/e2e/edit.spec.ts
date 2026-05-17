import { test, expect } from '@playwright/test';

test('edit: open article, edit content, save, verify update on detail page', async ({ page }) => {
  await page.goto('/articles');

  // Navigate to the first article in <main> (avoids CategoryNav links in the sidebar)
  await page.locator('main ul li a').first().click();
  await page.waitForURL(/\/articles\/[^/]+$/);

  // Click the Edit button/link
  await page.getByRole('link', { name: /edit/i }).click();
  await page.waitForURL(/\/articles\/.+\/edit/);

  // The title field is pre-populated
  const titleInput = page.getByLabel(/title/i);
  await expect(titleInput).not.toHaveValue('');

  // Fill the hidden textarea (synced with the MD editor state)
  const editorTextarea = page.locator('textarea[name="content"]');
  await editorTextarea.fill('# Updated Content\n\nThis was edited by the E2E test.');

  // Submit the form
  await page.getByRole('button', { name: /save changes/i }).click();

  // Redirected back to detail page (URL ends without /edit)
  await page.waitForURL(/\/articles\/[^/]+$/);
  await expect(page.locator('.prose')).toContainText('Updated Content');
});
