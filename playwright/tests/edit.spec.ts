import { test, expect } from '../fixtures';

test.describe('Edit Journey', () => {
  test('user clicks "+ New" and navigates to create view', async ({ page }) => {
    await page.goto('/');
    // "+ New" is in the header — link to /articles/new
    const newLink = page.getByRole('link', { name: /New$/i }).first();
    const href = await newLink.getAttribute('href');
    await page.goto(href!);
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/articles\/new$/);
  });

  test('user fills title and content and saves, redirected to detail', async ({ page }) => {
    await page.goto('/articles/new');

    const titleInput = page.getByRole('textbox', { name: 'Article title' });
    const contentTextarea = page.getByRole('textbox', { name: 'Article content' });

    await titleInput.fill('New Test Article');
    await contentTextarea.fill('This is the content of my test article.');

    const saveButton = page.getByRole('button', { name: /Create Article/i });
    await saveButton.click();

    // Wait for the redirect — use both URL check and heading appearance
    await page.waitForURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('New Test Article', { timeout: 10000 });
  });

  test('user attempts to save with empty title and sees validation error', async ({ page }) => {
    await page.goto('/articles/new');

    // Fill only content, leave title empty
    const contentTextarea = page.getByRole('textbox', { name: 'Article content' });
    await contentTextarea.fill('Some content');

    const saveButton = page.getByRole('button', { name: /Create Article/i });
    await saveButton.click();

    // Validation: the form should display an error about title
    await expect(page.getByText(/Title is required/i)).toBeVisible();
  });

  test('user clicks Edit on existing article and pre-filled content appears', async ({ page }) => {
    await page.goto('/');
    // Use a selector that selects real article links, excluding the "+ New" link
    const articleCards = page.locator('.group[href*="/articles/"]').and(
      page.locator('a:not([href="/articles/new"])')
    );
    await expect(articleCards.first()).toBeVisible();
    const href = await articleCards.first().getAttribute('href');
    await page.goto(href!);
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/);

    const editButton = page.getByRole('link', { name: 'Edit' });
    await expect(editButton).toBeVisible();
    const editHref = await editButton.getAttribute('href');
    await page.goto(editHref!);
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+\/edit$/);

    const titleInput = page.getByRole('textbox', { name: 'Article title' });
    await expect(titleInput).toHaveValue(/.+/);

    const contentTextarea = page.getByRole('textbox', { name: 'Article content' });
    await expect(contentTextarea).toHaveValue(/.+/);
  });

  test('user edits content, saves, and changes are visible', async ({ page }) => {
    await page.goto('/');
    const articleCards = page.locator('.group[href*="/articles/"]').and(
      page.locator('a:not([href="/articles/new"])')
    );
    await articleCards.first().click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/);

    const editButton = page.getByRole('link', { name: 'Edit' });
    await editButton.click();
    await page.waitForURL(/\/edit$/);

    const titleInput = page.getByRole('textbox', { name: 'Article title' });
    await titleInput.fill('');
    await titleInput.fill('Edited Title');

    const saveButton = page.getByRole('button', { name: /Save Changes/i });
    await saveButton.click();

    await page.waitForURL(/\/articles\/[a-f0-9-]+$/);
    await expect(page.locator('h1')).toContainText('Edited Title', { timeout: 10000 });
  });

  test('user clicks Discard and sees confirmation modal', async ({ page }) => {
    await page.goto('/articles/new');
    const titleInput = page.getByRole('textbox', { name: 'Article title' });
    await titleInput.fill('Unsaved changes');

    const discardButton = page.getByRole('button', { name: 'Discard' });
    await discardButton.click();

    // Confirmation modal should appear
    await expect(page.getByText(/unsaved changes/i)).toBeVisible();
  });
});
