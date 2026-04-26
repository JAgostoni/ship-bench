import { test, expect } from '@playwright/test';
import { setupTestDb } from './db-setup';

test.beforeAll(async () => {
  await setupTestDb();
});

test('Journey 1: Home -> Search -> Article Detail', async ({ page }) => {
  await page.goto('/');
  
  // Try finding the input by placeholder if aria-label is not working
  const searchInput = page.locator('input[placeholder="Search knowledge base..."]');
  await expect(searchInput).toBeVisible({ timeout: 15000 });
  await searchInput.fill('Next.js');
  
  // Wait for the redirect (due to debounce)
  await expect(page).toHaveURL(/.*q=next\.js/, { timeout: 15000 });
  
  await page.click('text=Next.js');
  
  await expect(page).toHaveURL(/\/articles\/next\.js/);
  await expect(page.locator('h1')).toContainText('Next.js');
});

test('Journey 3: Create New Article -> Save -> Verify in List', async ({ page }) => {
  await page.goto('/articles/new');
  
  // Use a more generic selector for the title input if placeholder is failing
  const titleInput = page.locator('input[type="text"]').first();
  await expect(titleInput).toBeVisible({ timeout: 15000 });
  
  const title = `Test Article ${Date.now()}`;
  const content = 'This is a test article content.';
  
  await titleInput.fill(title);
  await page.fill('textarea', content);
  await page.click('button:has-text("Save Article")');
  
  await expect(page).toHaveURL(/\/articles\/.*\//);
  await expect(page.locator('h1')).toContainText(title);
  
  await page.goto('/articles');
  await expect(page.locator('body')).toContainText(title);
});

test('Journey 2: Article Detail -> Edit -> Save -> Verify Change', async ({ page }) => {
  // First create an article to edit
  await page.goto('/articles/new');
  
  const titleInput = page.locator('input[type="text"]').first();
  await expect(titleInput).toBeVisible({ timeout: 15000 });
  
  const title = `Edit Test ${Date.now()}`;
  await titleInput.fill(title);
  await page.fill('textarea', 'Original content');
  await page.click('button:has-text("Save Article")');
  
  const currentUrl = page.url();
  const slug = currentUrl.split('/').filter(Boolean).pop();
  
  // Go to detail and edit
  await page.goto(`/articles/${slug}`);
  await page.click('button:has-text("Edit")');
  
  const editTitleInput = page.locator('input[type="text"]').first();
  await expect(editTitleInput).toBeVisible({ timeout: 15000 });
  
  const newTitle = `${title} Updated`;
  await editTitleInput.fill(newTitle);
  await page.click('button:has-text("Update Article")');
  
  await expect(page.locator('h1')).toContainText(newTitle);
});