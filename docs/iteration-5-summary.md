# Iteration 5 Summary: Lifecycle Operations, Advanced Polish & Automated E2E Testing

This document summarizes the execution and verification of Iteration 5, concluding development with advanced relational safeguards, Visual Design States Matrix polish, standard-compliant keyboard and screen-reader accessibility, and verified cross-browser Playwright E2E integration test suites.

---

## 1. Summary of What Was Built

### Category Cascade Deletion UX
- **Database Cascade Safeguards**: Confirmed database schemas handle relational safeguards correctly, updating all matching articles to `categoryId = null` (reverting to Uncategorized) in SQLite upon parent category deletion via standard foreign keys.
- **Warning Modal Component**: Designed a beautiful, responsive confirmation modal in [CategoryItem.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/CategoryItem.tsx) that queries the total count of articles inside the category dynamically, locks confirmation buttons during counting, and informs users that articles will be preserved but marked as Uncategorized.
- **"Uncategorized" Sidebar Filter**: Added a dynamic "Uncategorized" filter link at the bottom of the sidebar in [Sidebar.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/Sidebar.tsx) that only renders if one or more articles currently reside in an uncategorized state, enabling authors to easily browse and reassign them.

### Interaction Design Polish (Design Spec States Matrix)
- **Buttons Visual Polish**: Integrated elegant hover translation micro-animations (`transform: translateY(-1px)`) and elevation shadow transitions (`var(--shadow-md)`) for edit, delete, and confirmation actions, including correct disabled states.
- **Cobalt Focus Glow**: Globally removed browser-default outline rings in [globals.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/styles/globals.css) and replaced them with custom HSL cobalt glow outlines on focusable triggers:
  ```css
  box-shadow: 0 0 0 3px hsla(var(--accent-primary-hsl), 0.25);
  border-color: hsl(var(--accent-primary-hsl));
  ```
- **Error Indicators HSL Polish**: Implemented clean visual cues in [MarkdownEditor.module.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/MarkdownEditor.module.css) for failed input fields, converting borders and backgrounds to matching error HSL values upon failed validation submissions.

### Accessibility (a11y) & Semantic Structure
- **Landmark Structures & ARIA Labels**: Adjusted standard structural markup in [LayoutShell.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/LayoutShell.tsx) and component trees:
  - Header wrapped in `<header role="banner">`.
  - Navigation wrapped in `<nav aria-label="Main Category Navigation">`.
  - Content containers wrapped in `<main id="main-content" tabIndex={-1}>` and `<article>`.
- **Live Preview Canvas**: Equipped the Markdown Editor's HTML preview pane with `aria-live="polite"` and `aria-label="Live HTML Preview"` so that typing mutations are read dynamically to screen readers.
- **Screen Reader Only Badges**: Injected `<span className="sr-only">Article Status: </span>` classes in status badges across home, detail, and search pages to ensure screen readers vocalize states clearly.

### Playwright E2E Integration Testing
- **E2E Project Configuration**: Set up sequential cross-browser configurations in [playwright.config.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/playwright.config.ts) using a single test worker (`workers: 1`, `fullyParallel: false`) to guarantee stable SQLite database migrations and fixtures.
- **User Journey E2E Script**: Programmed a complete journey E2E test in [tests-e2e/kb-journey.spec.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/tests-e2e/kb-journey.spec.ts) covering:
  - Homepage loading & Category side-bar validation.
  - Interactive search using FTS5 (sanitized and correctly tokenized).
  - Transition routing and detail page reading.
  - Split-pane workspace editing (updating text content and status options).
  - Save submission, routing redirection, and verify edited changes on detail render.

---

## 2. Assumptions Made and Issues Encountered

### SQLite FTS5 `bm25` Syntax Error
- **Issue**: The search query previously sorted via `ORDER BY bm25 ASC`. This threw a `SqliteError: no such column: bm25` because SQLite treats unparenthesized function references as column names. Additionally, trying to use Lucene-style caret syntax `^3` for query-level title boosting in the MATCH string caused an `fts5: syntax error near "^"`.
- **Resolution**: Updated `search.ts` to use native SQLite FTS5 column weighting. We stripped the unsupported query-level caret `^` from the `ftsQuery` MATCH string and called the rank function as `bm25(articles_fts, 0.0, 3.0, 1.0)` in the `ORDER BY` clause, successfully boosting `title` relevance by 3x over `content` natively.

### Playwright Parallel DB Race Conditions
- **Issue**: Playwright's default `fullyParallel: true` configuration triggered parallel browser processes. Since tests were running against a single local dev server and a single SQLite file (`data/kb.db`), concurrent `test.beforeEach` triggers simultaneously deleted and seeded categories, resulting in `UNIQUE constraint failed: categories.slug` and database write locks.
- **Resolution**: Configured `fullyParallel: false` and `workers: 1` in `playwright.config.ts`. This runs Chromium and Firefox E2E tests sequentially, ensuring each browser runs against an isolated, freshly seeded db state without collision.

### Next.js `"use server"` Exports Violation
- **Issue**: Next.js threw `Error: A "use server" file can only export async functions, found object.` because `src/lib/actions.ts` exported `articleSchema` (a Zod schema object) and type helpers.
- **Resolution**: Refactored the architecture by separating validation logic into a new, non-server-action file [src/lib/validation.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/validation.ts). Both `actions.ts` and `actions.test.ts` now import `articleSchema` from this dedicated validation module, leaving `actions.ts` strictly compliant with Next.js specs.

---

## 3. Decisions Log

### Sequential E2E Test Execution over Multi-DB Provisioning
- **Tradeoff**: Running E2E tests in parallel would decrease test execution time, but requires dynamically provisioning multiple SQLite files and dynamically changing the `DATABASE_URL` environment variable for each Next.js dev server instance, which introduces significant overhead.
- **Resolution**: Decided to run E2E browser tests sequentially via a single worker. Sequential execution takes ~16 seconds total, which is extremely fast and guarantees 100% database schema and content stability.

---

## 4. Local Execution Confirmation

### Unit Testing Verification
All 10 unit test assertions are fully green:
```bash
 RUN  v4.1.6 C:/projects/evals_may2026_gemini-3.5-flash

 ✓ src/lib/smoke.test.ts (1 test) 4ms
 ✓ src/lib/actions.test.ts (6 tests) 10ms
 ✓ src/lib/search.test.ts (3 tests) 30ms

 Test Files  3 passed (3)
      Tests  10 passed (10)
   Start at  21:46:17
   Duration  1.76s (transform 193ms, setup 0ms, import 1.47s, tests 44ms, environment 0ms)
```

### Playwright Cross-Browser E2E Execution
E2E tests pass flawlessly on both Chromium and Firefox browsers:
```bash
Running 2 tests using 1 worker

[1/2] [chromium] › tests-e2e\kb-journey.spec.ts:54:7 › Knowledge Base Primary User Journey › should execute the critical user journey: browse, search, select, edit, and save
[2/2] [firefox] › tests-e2e\kb-journey.spec.ts:54:7 › Knowledge Base Primary User Journey › should execute the critical user journey: browse, search, select, edit, and save
  2 passed (16.0s)
```
