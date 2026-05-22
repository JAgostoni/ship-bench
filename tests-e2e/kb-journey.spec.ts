// tests-e2e/kb-journey.spec.ts
import { test, expect } from '@playwright/test';
import { db } from '../src/lib/db';
import { categories, articles } from '../src/lib/schema';

test.describe('Knowledge Base Primary User Journey', () => {
  // Reset and seed the database before running E2E tests to ensure clean consistent states
  test.beforeEach(async () => {
    // We can run the seed logic here programmatically using the DB instance
    // Clean database
    await db.delete(articles);
    await db.delete(categories);

    // Seed Categories
    const [catEng] = await db.insert(categories).values({
      name: "Engineering",
      slug: "engineering",
      description: "Technical specifications, environment setups, and coding guidelines.",
    }).returning();

    const [catProd] = await db.insert(categories).values({
      name: "Product",
      slug: "product",
      description: "Product roadmaps, release specifications, and client briefs.",
    }).returning();

    // Seed Articles
    await db.insert(articles).values([
      {
        title: "Setup Node.js Development Environment",
        slug: "setup-nodejs-development-environment",
        categoryId: catEng.id,
        status: "published",
        content: `# Getting Started with Node.js Setup
Follow these basic guidelines to configure your project structure and libraries:

## Required Tools
* Node.js v24.x or higher
* npm v10.x or higher
`,
      },
      {
        title: "Core System Architecture Overview",
        slug: "core-system-architecture-overview",
        categoryId: catEng.id,
        status: "published",
        content: `# Core System Architecture
An overview of our application stack.
`,
      }
    ]);
  });

  test('should execute the critical user journey: browse, search, select, edit, and save', async ({ page }) => {
    // 1. Load the home page `/` and assert that categories are active in the sidebar.
    await page.goto('/');
    
    // Assert categories exist in the sidebar navigation
    const engineeringLink = page.locator('nav[aria-label="Main Category Navigation"] >> text=Engineering');
    await expect(engineeringLink).toBeVisible();
    
    // 2. Focus and input "Node" into the global search bar.
    const searchInput = page.locator('#global-search');
    await expect(searchInput).toBeVisible();
    await searchInput.focus();
    await searchInput.fill('Node');
    
    // 3. Assert that the URL navigates to `/articles?search=Node`.
    // The search-as-you-type debounces by 200ms and performs soft navigation.
    await page.waitForURL(url => url.pathname === '/articles' && url.searchParams.get('search') === 'Node');
    
    // 4. Click on the first article card and verify the detail view loads.
    const articleCard = page.locator('a[class*="card"]').first();
    await expect(articleCard).toBeVisible();
    await articleCard.click();
    
    // Verify detail page has loaded
    await page.waitForURL(url => url.pathname.startsWith('/articles/'));
    const heading = page.locator('h1[class*="articleTitle"]');
    await expect(heading).toHaveText('Setup Node.js Development Environment');
    
    // 5. Click the "Edit Article" button, type "Adding custom notes for production build logs." in the editor, and select "published" status.
    const editBtn = page.locator('a[class*="editBtn"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    // Verify editor has loaded
    await page.waitForURL(url => url.pathname.endsWith('/edit'));
    const textarea = page.locator('#markdown-textarea');
    await expect(textarea).toBeVisible();
    
    // Append content to editor
    await textarea.focus();
    // Move cursor to the end and type the text
    await textarea.press('Control+A');
    await textarea.press('Backspace');
    await textarea.fill('Adding custom notes for production build logs.');
    
    // Select 'published' status from dropdown
    const statusSelect = page.locator('#editor-status');
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption('published');
    
    // 6. Save changes and verify redirection back to the detail view showing updated contents.
    const saveBtn = page.locator('button[type="submit"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    
    // Redirection back to detail view
    await page.waitForURL(url => url.pathname === '/articles/setup-nodejs-development-environment');
    
    // Verify updated content in details view
    const renderedBody = page.locator('div[class*="markdownBody"]');
    await expect(renderedBody).toContainText('Adding custom notes for production build logs.');
  });
});
