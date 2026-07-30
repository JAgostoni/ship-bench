# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e/search.spec.ts >> search returns results and highlights query
- Location: tests/e2e/search.spec.ts:3:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-test-id="article-card"]')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('[data-test-id="article-card"]')
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [active]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - navigation [ref=e7]:
          - button [disabled] [ref=e8]:
            - img "previous" [ref=e9]
          - generic [ref=e11]:
            - generic [ref=e12]: 1/
            - text: "1"
          - button [disabled] [ref=e13]:
            - img "next" [ref=e14]
        - generic [ref=e17]:
          - generic "Latest available version is detected (16.2.12)." [ref=e20]: Next.js 16.2.12
          - generic [ref=e21]: Turbopack
      - dialog "Runtime Error" [ref=e23]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]:
                - generic [ref=e30]: Runtime Error
                - generic [ref=e31]: Server
              - generic [ref=e32]:
                - button "Copy Error Info" [ref=e33] [cursor=pointer]
                - button "No related documentation found" [disabled] [ref=e36]
                - button "Attach Node.js inspector" [ref=e39] [cursor=pointer]
            - generic [ref=e48]: "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported. <... client={{}} children={{...}}> ^^^^"
          - generic [ref=e51]:
            - generic [ref=e52]:
              - paragraph [ref=e53]:
                - text: Call Stack
                - generic [ref=e54]: "7"
              - button "Show 5 ignore-listed frame(s)" [ref=e55] [cursor=pointer]
            - generic [ref=e58]:
              - generic [ref=e59]: stringify
              - text: <anonymous>
            - generic [ref=e60]:
              - generic [ref=e61]: stringify
              - text: <anonymous>
        - generic [ref=e62]: "1"
        - generic [ref=e63]: "2"
    - generic [ref=e68] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e69]
      - generic [ref=e73]:
        - button "Open issues overlay" [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]: "0"
            - generic [ref=e77]: "1"
          - generic [ref=e78]: Issue
        - button "Collapse issues badge" [ref=e79]
  - generic [ref=e83]:
    - heading "This page couldn’t load" [level=1] [ref=e86]
    - paragraph [ref=e87]: A server error occurred. Reload to try again.
    - button "Reload" [ref=e90] [cursor=pointer]
  - paragraph [ref=e91]: ERROR 2159096817
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('search returns results and highlights query', async ({ page }) => {
  4  |   // Insert article directly via Prisma to bypass auth
  5  |   const prisma = (await import('../../src/lib/prisma')).default;
  6  |   await prisma.article.create({
  7  |     data: { title: 'Test article', content: 'test content', status: 'DRAFT' },
  8  |   });
  9  |   await page.goto('http://localhost:3000/articles');
  10 |   // Wait for article cards to appear
  11 |   const articleCards = page.locator('[data-test-id="article-card"]');
> 12 |   await expect(articleCards).toHaveCount(1);
     |                              ^ Error: expect(locator).toHaveCount(expected) failed
  13 | 
  14 |   const searchInput = page.locator('input[placeholder="Search articles…"]');
  15 |   await searchInput.fill('test');
  16 |   // Wait for filtered results
  17 |   await expect(articleCards).toHaveCount(1);
  18 |   // Check highlight
  19 |   const highlighted = articleCards.locator('mark');
  20 |   await expect(highlighted).toContainText(/test/i);
  21 | });
  22 | 
```