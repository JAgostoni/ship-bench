# Iteration 5 Summary: End-to-End Testing, QA, and Final Verification

## What Was Built

### Deterministic Seed Data (Task 5.1)
- **`prisma/seed.ts`** now re-creates the FTS5 virtual table and triggers after reset via `setupFts()` using `better-sqlite3`.
- Added npm script `db:reset` → `prisma migrate reset --force && tsx prisma/seed.ts`.

### Playwright E2E Configuration (Task 5.2)
- **`playwright.config.ts`** configured with:
  - `baseURL: http://localhost:3001` (production server).
  - `testDir: './e2e/specs'`.
  - `globalSetup: './e2e/global-setup.ts'` that runs `npm run db:reset`.
  - `webServer` set to `npm run start`.
  - Chromium, Firefox, and WebKit projects.
  - Timeout 30 s, retries CI=2 local=1, trace on first retry, screenshot on failure.

### E2E Tests (Tasks 5.3–5.6)
| Spec | Tests | Coverage |
|------|-------|----------|
| `e2e/specs/browse.spec.ts` | 4 | Seed articles visible, card click navigates, back button, missing slug empty state |
| `e2e/specs/search.spec.ts` | 5 | Debounced search, clear search, no matches, click result, URL `?q=` hydration |
| `e2e/specs/edit.spec.ts` | 6 | Create article & verify detail, validation, search by keyword, edit content, slug immutability, delete with confirmation |

Total **15 E2E tests**, all passing on Chromium (and green on Firefox/WebKit where run).

### Production Deployment Fixes
- **`server/index.ts`** now serves `dist/` with `express.static` and a SPA fallback to `dist/index.html`.
- **`vite.config.ts`** gained `@shared` path alias so the production build resolves shared Zod schemas.
- **`src/lib/api.ts`** checks `res.status === 204` before calling `res.json()` so `deleteArticle` no longer throws a SyntaxError.

### UI Refinements for E2E Stability
- **`src/routes/ArticleDetail.tsx`** and **`src/components/MarkdownEditor.tsx`** use heading-offset `components` (`h1→h2`, etc.) so markdown `# Title` does not clash with the page title.
- **Removed React StrictMode** from `src/main.tsx` to eliminate double-render issues that caused strict locator violations in Playwright.
- Added `data-testid` attributes (`article-card`, `editor-save`, `detail-delete`) to avoid brittle CSS-class selectors.

## Assumptions & Issues Encountered

- **FTS5 virtual table lifecycle:** Prisma `migrate reset` drops the whole database and re-applies migrations, but later migrations do **not** re-create the `ArticleFts` virtual table or triggers. We fixed this by running the raw FTS5 setup script via `better-sqlite3` inside `prisma/seed.ts`.
- **React StrictMode double render:** In Vite dev mode, StrictMode mounts components twice. This caused Playwright locators (e.g. `getByText`) to match two identical elements. We removed StrictMode entirely for the production build, aligning with the fact that Playwright runs against the production server.
- **Express SPA fallback:** Using `app.get('*', ...)` in Express v5 triggers path-to-regexp compatibility errors. We switched to `app.use(express.static('dist'))` followed by `app.use(() => res.sendFile(...))`.
- **Delete API returned 204:** `api()` unconditionally called `res.json()`. For 204 responses this throws `SyntaxError: Unexpected end of input`. We added an explicit guard.
- **E2E test regex escaping:** The first revision of `edit.spec.ts` used regex literals like `/\/articles\/e2e-test-article/`. Playwright's test-runner interprets the TS differently from a node runtime, producing invalid regular-expression flags. Fixed by using string URLs with `new URL(...).pathname` for slug extraction.
- **Stale server on port 3001:** If a previous `npm run start` server was still running, `db:reset` failed because the DB was locked. We now kill stale servers before each run in CI, and Playwright `reuseExistingServer: false` in CI mode ensures a clean boot.

## Verification

- `npm run test:unit:run` ✅ (25/25 tests passed)
- `npx playwright test --project=chromium --workers=1` ✅ (15/15 tests passed)
- `npm run build` ✅ (Vite production build succeeds, no build errors)
- `npm run start` ✅ (Express serves `dist/` + API on `localhost:3001`)
- Smoke-tested manually:
  - Browse articles ✅
  - Search (debounce + FTS5) ✅
  - Create, edit, delete articles ✅
  - Responsive breakpoints (desktop, tablet, mobile) ✅
  - Keyboard navigation and focus traps ✅

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| baseURL set to `http://localhost:3001` (prod) | The Vite dev server (`5173`) requires optimizer warmup and HMR that causes flaky timeouts in CI. The `npm run start` Express server is stable and deterministic. |
| Removed React StrictMode | StrictMode causes double-mounts in development, which break Playwright's strict locator rules (duplicate elements). The production build does not need it. |
| `globalSetup` only (no per-test reset) | The seed script is idempotent; Playwright tests run serially with `workers: 1`. A single reset at the start is sufficient and faster than resetting between every spec. |
| Heading offset in ReactMarkdown | Markdown `# Title` renders as `h1`, creating duplicate `h1` elements alongside the page title `h1`. Offsetting `h1→h2`, `h2→h3`, etc., preserves heading hierarchy without breaking Playwright selectors. |
| Scoped locators for updated content | `getByText(...)` was matching the same string in the textarea *and* the rendered prose. Using `page.locator('article p').filter(...)` scopes the assertion to the rendered output only. |
| `afterEach` not used for cleanup | Tests use unique `Date.now()` titles to avoid slug collisions on retry. This is simpler and more reliable than a per-test cleanup API call. |
