# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-journeys.test.ts >> Journey 3: Create New Article -> Save -> Verify in List
- Location: tests\e2e\critical-journeys.test.ts:25:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[type="text"]').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('input[type="text"]').first()

```

# Page snapshot

```yaml
- generic:
  - generic [active]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - navigation [ref=e6]:
            - button "previous" [disabled] [ref=e7]:
              - img "previous" [ref=e8]
            - generic [ref=e10]:
              - generic [ref=e11]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e12]:
              - img "next" [ref=e13]
          - img
        - generic [ref=e15]:
          - generic [ref=e16]:
            - img [ref=e17]
            - generic "Latest available version is detected (16.2.4)." [ref=e19]: Next.js 16.2.4
            - generic [ref=e20]: Turbopack
          - img
      - dialog "Build Error" [ref=e22]:
        - generic [ref=e25]:
          - generic [ref=e26]:
            - generic [ref=e27]:
              - generic [ref=e29]: Build Error
              - generic [ref=e30]:
                - button "Copy Error Info" [ref=e31] [cursor=pointer]:
                  - img [ref=e32]
                - button "No related documentation found" [disabled] [ref=e34]:
                  - img [ref=e35]
                - button "Attach Node.js inspector" [ref=e37] [cursor=pointer]:
                  - img [ref=e38]
            - generic [ref=e47]: Export prisma doesn't exist in target module
          - generic [ref=e49]:
            - generic [ref=e51]:
              - img [ref=e53]
              - generic [ref=e57]: ./src/app/actions/articles.ts (3:1)
              - button "Open in editor" [ref=e58] [cursor=pointer]:
                - img [ref=e60]
            - generic [ref=e63]:
              - generic [ref=e64]: Export prisma doesn't exist in target module
              - generic [ref=e65]: 1 |
              - generic [ref=e66]: "'use server'"
              - generic [ref=e67]: ;
              - generic [ref=e68]: 2 |
              - text: ">"
              - generic [ref=e69]: 3 |
              - text: import
              - generic [ref=e70]: "{ prisma }"
              - text: from '@/lib/db'
              - generic [ref=e71]: ;
              - generic [ref=e72]: "|"
              - text: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
              - generic [ref=e73]: 4 |
              - text: import
              - generic [ref=e74]: "{"
              - text: ArticleSchema
              - generic [ref=e75]: "}"
              - text: from '@/lib/validation'
              - generic [ref=e76]: ;
              - generic [ref=e77]: 5 |
              - text: import
              - generic [ref=e78]: "{ revalidatePath }"
              - text: from 'next/cache'
              - generic [ref=e79]: ;
              - generic [ref=e80]: 6 |
              - text: import
              - generic [ref=e81]: "{ generateSlug }"
              - text: from '@/lib/utils'
              - generic [ref=e82]: "; The export prisma was not found in module [project]/src/lib/db.ts [app-rsc] (ecmascript). Did you mean to import db? All exports of the module are statically known (It doesn't have dynamic exports). So it's known statically that the requested export doesn't exist. Import trace: Server Component: ./src/app/actions/articles.ts ./src/app/articles/new/page.tsx"
        - generic [ref=e83]: "1"
        - generic [ref=e84]: "2"
    - generic [ref=e89] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e90]:
        - img [ref=e91]
      - button "Open issues overlay" [ref=e95]:
        - generic [ref=e96]:
          - generic [ref=e97]: "0"
          - generic [ref=e98]: "1"
        - generic [ref=e99]: Issue
  - alert [ref=e100]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupTestDb } from './db-setup';
  3  | 
  4  | test.beforeAll(async () => {
  5  |   await setupTestDb();
  6  | });
  7  | 
  8  | test('Journey 1: Home -> Search -> Article Detail', async ({ page }) => {
  9  |   await page.goto('/');
  10 |   
  11 |   // Try finding the input by placeholder if aria-label is not working
  12 |   const searchInput = page.locator('input[placeholder="Search knowledge base..."]');
  13 |   await expect(searchInput).toBeVisible({ timeout: 15000 });
  14 |   await searchInput.fill('Next.js');
  15 |   
  16 |   // Wait for the redirect (due to debounce)
  17 |   await expect(page).toHaveURL(/.*q=next\.js/, { timeout: 15000 });
  18 |   
  19 |   await page.click('text=Next.js');
  20 |   
  21 |   await expect(page).toHaveURL(/\/articles\/next\.js/);
  22 |   await expect(page.locator('h1')).toContainText('Next.js');
  23 | });
  24 | 
  25 | test('Journey 3: Create New Article -> Save -> Verify in List', async ({ page }) => {
  26 |   await page.goto('/articles/new');
  27 |   
  28 |   // Use a more generic selector for the title input if placeholder is failing
  29 |   const titleInput = page.locator('input[type="text"]').first();
> 30 |   await expect(titleInput).toBeVisible({ timeout: 15000 });
     |                            ^ Error: expect(locator).toBeVisible() failed
  31 |   
  32 |   const title = `Test Article ${Date.now()}`;
  33 |   const content = 'This is a test article content.';
  34 |   
  35 |   await titleInput.fill(title);
  36 |   await page.fill('textarea', content);
  37 |   await page.click('button:has-text("Save Article")');
  38 |   
  39 |   await expect(page).toHaveURL(/\/articles\/.*\//);
  40 |   await expect(page.locator('h1')).toContainText(title);
  41 |   
  42 |   await page.goto('/articles');
  43 |   await expect(page.locator('body')).toContainText(title);
  44 | });
  45 | 
  46 | test('Journey 2: Article Detail -> Edit -> Save -> Verify Change', async ({ page }) => {
  47 |   // First create an article to edit
  48 |   await page.goto('/articles/new');
  49 |   
  50 |   const titleInput = page.locator('input[type="text"]').first();
  51 |   await expect(titleInput).toBeVisible({ timeout: 15000 });
  52 |   
  53 |   const title = `Edit Test ${Date.now()}`;
  54 |   await titleInput.fill(title);
  55 |   await page.fill('textarea', 'Original content');
  56 |   await page.click('button:has-text("Save Article")');
  57 |   
  58 |   const currentUrl = page.url();
  59 |   const slug = currentUrl.split('/').filter(Boolean).pop();
  60 |   
  61 |   // Go to detail and edit
  62 |   await page.goto(`/articles/${slug}`);
  63 |   await page.click('button:has-text("Edit")');
  64 |   
  65 |   const editTitleInput = page.locator('input[type="text"]').first();
  66 |   await expect(editTitleInput).toBeVisible({ timeout: 15000 });
  67 |   
  68 |   const newTitle = `${title} Updated`;
  69 |   await editTitleInput.fill(newTitle);
  70 |   await page.click('button:has-text("Update Article")');
  71 |   
  72 |   await expect(page.locator('h1')).toContainText(newTitle);
  73 | });
```