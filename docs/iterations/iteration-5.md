# Iteration 5: End-to-End Testing, QA, and Final Verification

**Goal:** Validate the entire application with unit and E2E tests, perform responsive and accessibility spot-checks, fix any regressions, and leave the codebase in a demonstrable, working state.

**Deliverable:** All tests pass (unit + E2E), the app runs cleanly via `npm run dev`, and critical user journeys are covered by Playwright.

---

## Task List

### 5.1 Ensure deterministic test data
- File: `prisma/seed.ts` (from Iteration 1)
  - Verify seed script produces exactly the same data on every run (drop and recreate, deterministic IDs/slugs).
  - Add a `reset` helper if not present: delete all `Article`, `Tag`, `Category` rows, then re-seed.
- Add npm script: `db:reset` → `prisma migrate reset --force && tsx prisma/seed.ts`.

### 5.2 Configure Playwright E2E suite
- File: `playwright.config.ts`
  - `baseURL: http://localhost:5173`.
  - `testDir: 'e2e/specs'`.
  - `projects`: Chromium (default), Firefox, WebKit for CI.
  - `webServer` command: `npm run dev` (so Playwright can start the stack automatically for `test:e2e`).
  - Timeout: 30 s per test, 120 s per suite.
  - Retries: 1 locally, 2 in CI.
  - Artifacts: trace on first retry, screenshot on failure.

### 5.3 Write E2E: Browse → View Article Detail
- File: `e2e/specs/browse.spec.ts`
  - **Test 1:** Seed loads; visiting `/` shows article list with expected article titles.
  - **Test 2:** Clicking an article card navigates to `/articles/:slug` and renders the correct title and content.
  - **Test 3:** Clicking "Back to articles" returns to `/`.
  - **Test 4:** Visiting a nonexistent slug shows "Article not found" empty state.

### 5.4 Write E2E: Search → Select Result → View Article
- File: `e2e/specs/search.spec.ts`
  - **Test 1:** Type a known query in the search input (after debounce), results update to show matching articles.
  - **Test 2:** Clear search (click X or press Escape), list returns to all articles.
  - **Test 3:** Search with no matches shows "No articles match 'query'" empty state.
  - **Test 4:** Click a search result → navigates to detail page.
  - **Test 5:** Page load with `?q=query` in URL auto-executes search.

### 5.5 Write E2E: Create Article → Save → Verify Detail
- File: `e2e/specs/edit.spec.ts`
  - **Test 1:** Click "New Article" → fill title, content, select category, add tags → click Save → navigates to detail page with correct data.
  - **Test 2:** Attempt to save with empty title → validation error appears, no navigation.
  - **Test 3:** Create article, then search for it by a keyword from its content → appears in search results.

### 5.6 Write E2E: Edit Article → Save → Verify Updated Content
- File: `e2e/specs/edit.spec.ts` (same file)
  - **Test 4:** Open an existing article, click Edit, modify content, save → detail page shows updated content.
  - **Test 5:** Verify slug does not change after editing the title.
  - **Test 6:** Delete an article from detail page → confirm modal → redirect to home, article no longer appears in list.

### 5.7 Verify and fix responsive behavior
- Run the app at each breakpoint and check against design spec:
  - **Desktop (≥1024px):** persistent sidebar, inline action bar on detail, split-pane editor.
  - **Tablet (768–1023px):** hamburger opens drawer, header layout intact.
  - **Mobile (<768px):** sticky search bar below header, icon-only new-article button, tabbed editor, sticky bottom action bar on detail.
- Fix any layout breaks (overflow, z-index issues, tap targets below 44px).

### 5.8 Accessibility spot-check
- Keyboard navigation:
  - Tab order follows design spec §7.2 on all pages.
  - Modal focus trap works (Tab cycles, Escape closes, focus returns).
  - Drawer focus management works on tablet/mobile.
- Screen reader:
  - Article list uses `<article>` with `<h2>` titles.
  - Detail page uses `<article>` with `<h1>`.
  - Search results announced via `aria-live="polite"`.
  - All icon-only buttons have `aria-label`.
  - Form inputs have associated `<label>` elements.
- Contrast:
  - Primary text on surface ≥ 4.5:1.
  - Accent buttons on surface ≥ 4.5:1.
- Reduced motion:
  - Skeleton pulse disabled, toast slide disabled, spinner static.

### 5.9 Run full test suite and fix regressions
- `npm run test:unit:run` — all unit tests pass.
- `npm run test:e2e` — all Playwright specs pass.
- If any test fails:
  - Diagnose root cause (API change, race condition, selector fragility).
  - Fix application code or test code as appropriate.
  - Re-run until green.

### 5.10 Final build verification and documentation
- Run `npm run build` — Vite production build succeeds with no errors.
- Run `npm run start` — Express serves `dist/` + API. Smoke-test browse, search, and edit flows against the production build.
- Update `README.md` (or create if missing) with:
  - One-line product summary.
  - Tech stack.
  - Quick start (install, migrate, seed, dev).
  - Test commands.
  - Architecture decisions summary (1–2 paragraphs).
- Ensure all required deliverables from the product brief are present in `docs/`:
  - `product-brief.md` ✓ (existing)
  - `architecture.md` ✓ (existing)
  - `design-spec.md` ✓ (existing)
  - `backlog.md` ✓ (Iteration 1 deliverable)
  - `iterations/iteration-1.md` through `iteration-5.md` ✓
- Final `git` commit and tag (optional): `git tag v1.0.0`.

---

## Iteration-Specific Notes
- **Test isolation:** Each E2E test should start from a clean seeded database. Use Playwright's `globalSetup` to run `db:reset` once before the suite, or reset per-worker if parallelism requires it.
- **Flaky test prevention:** Use Playwright's auto-waiting locators (`getByRole`, `getByText`) rather than manual `waitForTimeout`. Assert on network idle or UI state changes after save/delete.
- **CI readiness:** The Playwright config should be able to run in CI without modification. The `webServer` setting ensures the stack starts automatically; for CI, ensure `npm ci` and `npx playwright install` are documented.
- **Performance baseline:** No formal perf tests required in v1, but do a quick subjective check: article list loads in <1 s, search returns in <500 ms, editor preview renders without perceptible lag for a 2000-word article.
- **Bug triage rule:** Only fix bugs that block critical user journeys or cause test failures. Minor cosmetic polish that does not affect functionality or accessibility should be documented as v1.1 items rather than blocking v1 completion.
