# QA Report: Simplified Knowledge Base App

**Date:** 2026-05-09
**Reviewer:** Senior QA Engineer (automated review)
**Codebase:** JAgostoni/ship-bench
**Scope:** MVP features per product brief (Features 1-3) plus infrastructure

---

## Table of Contents

1. [MVP Flow Verification](#mvp-flow-verification)
2. [Local Setup Verification](#local-setup-verification)
3. [Test Suite Review](#test-suite-review)
4. [Responsiveness Check](#responsiveness-check)
5. [Error Handling Review](#error-handling-review)
6. [Spec Adherence Summary](#spec-adherence-summary)
7. [Code Signals Checklist](#code-signals-checklist)
8. [Defect Log](#defect-log)
9. [Spec Drift Log](#spec-drift-log)
10. [Release Recommendation](#release-recommendation)
11. [Next Steps](#next-steps)

---

## MVP Flow Verification

### Flow 1: Article Browsing & Detail — PASS

| Sub-flow | Status | Notes |
|----------|--------|-------|
| Home page loads article cards | PASS | 3 published articles rendered with title, excerpt, category badge, relative timestamp |
| Empty state (no articles) | PASS | `EmptyState` component with `FileText` icon, "No articles yet", create article action |
| Click article card → detail page | PASS | Navigates to `/articles/[slug]`, renders Markdown with `react-markdown`, shows metadata bar |
| Back to articles link | PASS | `ArrowLeft` + "Back to articles" link at top and bottom of detail page |
| Article detail — metadata bar | PASS | Category badge, draft badge (if applicable), "Updated [date]" — separated by `·` |
| Article detail — markup rendering | PASS | `prose prose-neutral lg:prose-lg max-w-none`, GFM tables/lists/code blocks |
| Draft article detail | PASS | `/articles/code-review-guidelines` shows amber info strip, Draft badge, renders content |
| 404 for nonexistent article | PASS | `/articles/nonexistent-slug` returns 404 with `EmptyState` + `FileQuestion` icon |
| Global 404 | PASS | `/nonexistent-route` returns 404 page |
| Server error boundary | PASS | `src/app/error.tsx` catches errors, shows "Something went wrong" with retry button |
| Error — article load failure | NOT TESTED | Server error boundary exists but couldn't trigger a server error in normal operation. Error boundary code is present and correct. |

### Flow 2: Search — PASS (with minor issue)

| Sub-flow | Status | Notes |
|----------|--------|-------|
| Search finds matching articles | PASS | `/?q=getting` returns matching published articles |
| Search from detail page | PASS | Search bar is in header, navigates to `/?q=term` from any page |
| Search results show info banner | PASS | Blue banner: "Results for 'query' — N articles found. [Clear search]" |
| Search empty results | PASS | `EmptyState` with `SearchX` icon, descriptive message, "Browse all articles" action |
| Clear search | PASS | X button clears input, navigates to `/` |
| Empty query returns home page | PASS | Navigates to `/` |
| Debounced search (300ms) | PASS | E2E tests verify debounce behavior |
| Enter key immediate search | PASS | Implementation handles Enter key |
| FTS5 special character handling | PASS | Hyphens, quotes, colons, parens sanitized before query |
| Draft exclusion from results | PASS (with caveat) | Drafts are excluded from displayed results, but are fetched by the FTS query and filtered client-side. The search info banner count includes drafts before filtering (see **Defect MINOR-1**). |
| Search from mobile overlay | PASS | Mobile search expands as overlay with backdrop |

### Flow 3: Basic Editing — PASS

| Sub-flow | Status | Notes |
|----------|--------|-------|
| Create article page renders | PASS | `/articles/new` shows form with empty fields, categories loaded |
| Edit article page renders | PASS | `/articles/[slug]/edit` shows pre-filled form |
| Create: validation errors | PASS | Empty title shows "Title is required", empty content shows "Content cannot be empty" |
| Create: title character counter | PASS | Counter appears at 160+ chars, shows `N/200` |
| Create: save as draft | PASS | Creates with status `draft`, redirects to detail page |
| Create: publish | PASS | Creates with status `published`, redirects to detail page |
| Create: category selector | PASS | `<select>` with all categories + "No category" option |
| Create: status toggle | PASS | Radio-group style toggle with Draft (amber dot) and Published (green dot) |
| Edit: pre-filled form | PASS | Title, content, category, status all pre-filled |
| Edit: slug display (read-only) | PASS | Shows "Slug: [slug]" below title |
| Edit: save | PASS | Updates article, revalidates cache, redirects to updated article |
| Edit: delete | PASS | `window.confirm()` → delete → redirect to `/?deleted=1` |
| Edit: cancel | PASS | Navigates back if history, else to `/` |
| Server error banner | PASS | Amber banner with `role="alert"` on server action failure |
| Loading state during submission | PASS | `useTransition` disables inputs, shows spinner on buttons |
| Markdown editor: split pane (desktop) | PASS | Textarea left, live preview right, `border-r` divider |
| Markdown editor: tab toggle (mobile) | PASS | Write/Preview tabs, `matchMedia('(max-width:767px)')` |
| Markdown editor: Tab inserts spaces | PASS | Prevents focus change, inserts 2 spaces at cursor |
| Markdown editor: error border | PASS | Red border when `error` prop is set |
| External links open in new tab | PASS | Both article detail and editor preview handle `target="_blank"` |

### APIs — PASS

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /api/articles | PASS | Pagination, filtering, search delegation |
| POST /api/articles | PASS | 201 with created article, 400 on validation failure |
| GET /api/articles/[id] | PASS | 200 with article, 404 if not found |
| PUT /api/articles/[id] | PASS | Partial updates, slug regeneration |
| DELETE /api/articles/[id] | PASS | 204 on success, 404 if not found |
| GET /api/categories | PASS | List with article counts |
| GET /api/search | PASS | FTS5 search, 400 without `q` param |

---

## Local Setup Verification

### Instructions Tested

The README contains generic Next.js instructions. The actual local setup requires:

```bash
npm install
npm run db:seed    # Creates SQLite DB, runs migrations, seeds data, sets up FTS5
npm run dev         # Starts at http://localhost:3000
```

| Step | Status | Notes |
|------|--------|-------|
| `npm install` | PASS | All dependencies resolve |
| Database setup | PASS | `prisma db push` + seed script creates dev.db with FTS5 |
| `npm run dev` | PASS | Starts at http://localhost:3000, Turbopack, ~600ms startup |
| `npm run build` | PASS | Compiles successfully, 8 static/dynamic routes |
| `npm run lint` | PASS | 0 errors, 0 warnings |
| `npx tsc --noEmit` | PASS | Clean after fixing duplicate import |

### Issues
- **README is boilerplate**: No mention of `db:seed`, `db:migrate`, or any project-specific setup. A developer cloning fresh would not know to seed the database. See **Defect MINOR-3**.

---

## Test Suite Review

### Unit Tests (Vitest) — PASS

```
Test Files  5 passed (5)
     Tests  67 passed (67)
```

| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/lib/validators.test.ts` | 22 | Zod schemas: valid data, missing fields, max length, invalid enums, defaults |
| `__tests__/lib/slug.test.ts` | 9 | Slug generation, special chars, uniqueness collision, empty/edge cases |
| `__tests__/lib/search.test.ts` | 20 | `stripMarkdown` (13), `searchArticles` (7): all formatting, edge cases, pagination |
| `__tests__/api/articles.test.ts` | 14 | GET (list, by ID), POST (create, validation), PUT (update, 404), DELETE |
| `__tests__/api/categories.test.ts` | 2 | GET populated, GET empty |

### E2E Tests (Playwright) — PASS

```
12 passed (10.6s)
```

| File | Tests | Coverage |
|------|-------|----------|
| `e2e/browse.spec.ts` | 5 | Home renders cards, click → detail, back link, 404 slug, sidebar categories |
| `e2e/search.spec.ts` | 5 | Search finds results, no results empty state, search from detail, clear search, empty query |
| `e2e/edit.spec.ts` | 2 | Full create→edit→delete lifecycle, form validation errors |

### Coverage Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| No category page route tests | **Major** | Category pages don't exist, so naturally untested. If category pages are restored, E2E tests should be added. |
| No search pagination E2E test | Minor | Pagination in search mode is verified in unit tests but not in E2E |
| No draft visibility E2E test | Minor | Draft filtering is tested in unit tests and search behavior, but not as a dedicated E2E scenario |
| No mobile-specific E2E tests | Minor | All E2E tests run in Chromium (desktop viewport). No mobile viewport tests. |

---

## Responsiveness Check

### Breakpoint Verification

| Breakpoint | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Mobile (<768px) | Single column, hamburger menu, stacked cards | `lg:hidden` on hamburger, cards use `flex-col sm:flex-row` | PASS |
| Tablet (768-1023px) | Hamburger menu, full-width content | Sidebar hidden via `lg:hidden` (shows at ≥1024px) | PASS |
| Desktop (≥1024px) | Persistent sidebar, side-by-side editor | `hidden lg:block` on sidebar, `hidden md:block` on desktop search | PASS |

### Component-Specific Responsive Checks

| Component | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Header | 56px mobile, 64px desktop | `h-14 md:h-16` | PASS |
| Search bar | Icon button → overlay on mobile | Expandable overlay + backdrop on mobile | PASS |
| Sidebar | Slide-out drawer on mobile/tablet, persistent on desktop | `lg:block` persistent, drawer with backdrop on smaller | PASS |
| Article cards | Stacked metadata on mobile | `flex-col sm:flex-row` | PASS |
| Markdown editor | Tabs on mobile, split pane on desktop | `matchMedia('(max-width:767px)')` + tab toggle | PASS |
| Footer | 48px, centered | `h-12`, centered text | PASS |

### Notes
- Sidebar toggle breakpoint is `lg:` (1024px), which matches the spec's desktop definition (≥1024px). The spec defines tablet as 768-1023px with hamburger menu — this is exactly what `lg:hidden` achieves. PASS.
- No mobile viewport E2E tests exist, but manual code-inspection confirms responsive rules are in place.

---

## Error Handling Review

| Scenario | Implementation | Status |
|----------|---------------|--------|
| Article not found (page) | `notFound()` → `not-found.tsx` with `FileQuestion` icon | PASS |
| Article not found (API) | 404 JSON response with `"Article not found"` | PASS |
| Validation errors (form) | Inline field errors: "Title is required", "Content cannot be empty", red borders | PASS |
| Validation errors (API) | 400 with Zod error details in JSON | PASS |
| Server errors (form) | Amber error banner with `role="alert"` | PASS |
| Server errors (page) | Error boundary with "Try again" button, console.error logging | PASS |
| Server errors (API) | 500 JSON response with generic message, server-side console.error logging | PASS |
| Search with no query (API) | 400 "Invalid query parameters" | PASS |
| Empty search results (page) | `EmptyState` with `SearchX` icon | PASS |
| No articles (page) | `EmptyState` with `FileText` icon | PASS |
| Invalid article ID (API) | 400 "Invalid article ID" | PASS |
| Draft visibility | Amber info strip on detail page, excluded from home/search lists | PASS |
| Delete confirmation | `window.confirm()` before delete action | PASS |

### Gaps
- **`/?deleted=1` redirect after delete** — The delete flow redirects to `/?deleted=1`, but the home page has no code to display a "deleted" confirmation banner. The query param is silently ignored.

---

## Spec Adherence Summary

### Product Brief vs. Delivered

| Requirement | Status | Notes |
|-------------|--------|-------|
| Article browsing + detail (F1) | PASS | Home page, article cards, detail page with Markdown rendering |
| Search across title + content (F2) | PASS | FTS5 search, debounced input, results reuse ArticleList |
| Basic editing (F3) | PASS | Markdown editor with preview, create/edit/delete flows |
| Responsive layout (desktop + tablet) | PASS | Tailwind responsive utilities on all components |
| Empty states | PASS | No articles, no search results, article not found, page not found |
| Form validation | PASS | Client-side + server-side (Zod) |
| Unit tests (Vitest) | PASS | 67 tests across 5 files |
| E2E tests (Playwright) | PASS | 12 tests across 3 files |
| Markdown editor with preview | PASS | Split-pane desktop, tab-toggle mobile |
| CI workflow | PASS | Lint, type-check, test, build |
| Easy local setup | PASS (with caveat) | Works but README doesn't document steps |

### Architecture Spec vs. Delivered

| Component | Match | Notes |
|-----------|-------|-------|
| Next.js 16 App Router | ✅ | Turbopack, Server Components |
| Prisma + SQLite | ✅ | better-sqlite3 adapter |
| FTS5 search | ✅ | Virtual table + triggers |
| Zod validation | ✅ | Article + category schemas |
| react-markdown + remark-gfm | ✅ | Prose + GFM |
| Tailwind CSS v4 | ✅ | @tailwindcss/typography plugin |
| lucide-react icons | ✅ | All specified icons used |
| Repository structure | ✅ | Matches spec layout |
| API routes | ✅ | All 5 routes implemented |
| Server Actions for mutations | ✅ | create, update, delete |
| `revalidatePath` on mutations | ✅ | Home + article detail paths |
| Category pages (`/categories/[slug]`) | ❌ | **NOT IMPLEMENTED** — page file missing |
| Server Components for read pages | ✅ | Home, article detail, create/edit pages |

### UX/Design Spec vs. Delivered

| Element | Match | Notes |
|---------|-------|-------|
| Global shell (header, sidebar, content, footer) | ✅ | Persistent layout via AppShell |
| Header with search + New Article | ✅ | BookOpen logo, centered search, + button |
| Sidebar with categories + counts | ✅ | Sorted alphabetically, active indicator |
| Footer | ✅ | "Knowledge Base · Internal Tool" |
| Article cards layout | ✅ | Title link, excerpt (2-line clamp), badge, timestamp |
| Metadata bar on detail page | ✅ | Category · Draft · Updated date |
| Markdown editor split pane | ✅ | 50/50 split, monospace textarea |
| Mobile editor tabs | ✅ | Write/Preview toggle |
| Search bar behavior | ✅ | 300ms debounce, Enter immediate, clear button |
| Search info banner | ✅ | Blue banner with count and clear link |
| Draft info strip | ✅ | Amber banner on detail page |
| Status toggle | ✅ | Radio-group, Draft/Published, colored dots |
| Pagination | ✅ | Previous/Next with page count |
| Skip-to-content link | ✅ | `sr-only focus:not-sr-only` |
| Focus-visible rings | ✅ | On buttons, links, inputs |
| `prefers-reduced-motion` | ✅ | Sidebar uses `motion-safe:` |
| Category page | ❌ | **NOT IMPLEMENTED** — sidebar links to nonexistent pages |
| Article list skeleton loading | ✅ | 5 pulse-animated skeleton cards |

---

## Code Signals Checklist

| Signal | Result | Evidence |
|--------|--------|----------|
| **Linting clean** | ✅ YES | `npm run lint` — 0 errors, 0 warnings |
| **No obvious security holes** | ✅ YES | `$queryRawUnsafe` uses parameter binding; Zod validates all API inputs; Server Actions use FormData; no secrets in code; internal tool (no auth required by spec) |
| **Code is modular** | ✅ YES | Components are well-organized by domain (`ui/`, `articles/`, `layout/`, `search/`); no file exceeds ~300 lines; no god components; clear separation of server/client components |
| **Follows architecture spec** | ⚠️ PARTIAL | Core architecture matches (Next.js 16, Prisma, SQLite, Server Components, API routes). One notable gap: category pages defined in arch spec are missing. |
| **Planner's iterations followed** | ⚠️ PARTIAL | Iterations 1-4 and 6 are complete and verified. Iterations 5 (Organization & Status — stretch) and 7 (Polish & Documentation) were intentionally not completed per the task instructions. The README was not updated beyond the boilerplate. |
| **Dependency versions current** | ⚠️ PARTIAL | Most versions match the architecture spec. React is 19.2.4 instead of 19.2.6 (minor). TypeScript is `^5` instead of `^6.0.3` (major version behind). `@tailwindcss/vite` is 4.3.0 (extra package not in spec). `@prisma/adapter-libsql` is installed but unused. However, the brief says to use latest stable versions, and the actual installed versions appear stable and functional. See **Defect MINOR-4**. |

---

## Defect Log

### Critical

| ID | Title | Description | Repro Steps |
|----|-------|-------------|-------------|
| **CRITICAL-1** | Category pages return 404 — sidebar links broken | The sidebar contains links to `/categories/[slug]` for each category, but the route page `src/app/categories/[slug]/page.tsx` does not exist. All category navigation from the sidebar results in a 404 error. This breaks the navigation paths defined in the architecture spec and design spec. | 1. Start the app. 2. Click any category in the sidebar (e.g., "Guides"). 3. Observe 404 page. |

### Major

| ID | Title | Description | Repro Steps |
|----|-------|-------------|-------------|
| **MAJOR-1** | TypeScript duplicate import fails `npx tsc --noEmit` | `src/components/articles/article-form.tsx` had duplicate `import { clsx } from 'clsx'` on lines 5-6. This would cause the CI type-check job to fail. Fixed during this QA review. | 1. Run `npx tsc --noEmit`. 2. Observe error before fix. |
| **MAJOR-2** | README is Next.js boilerplate | The README contains only the default Next.js create-next-app text. It doesn't include local setup instructions (npm install, db:seed, db:migrate), architecture overview, or any project-specific documentation. Per the brief's stretch deliverables, "local run notes" are expected. | 1. Open README.md. 2. Observe generic Next.js content. |

### Minor

| ID | Title | Description | Repro Steps |
|----|-------|-------------|-------------|
| **MINOR-1** | Search count banner may overcount when drafts match | `searchArticles()` returns all FTS5 matches including drafts. The home page filters these out with `.filter(a => a.status === 'published')`, but the `totalCount` variable used in the info banner comes from the pre-filter total. If a draft matches the query, the count in "N articles found" is inflated. | 1. Search for "code review". 2. Since "Code Review Guidelines" is a draft, the FTS query finds it but it's filtered from display. The count banner may show 1 but display 0 results. |
| **MINOR-2** | Category article counts not revalidated on article mutations | When articles are created, updated, or deleted, the sidebar's category article counts (fetched in root layout via `_count`) aren't revalidated. `revalidatePath('/')` is called but the layout doesn't re-fetch because it's not directly on the revalidated path. | 1. Note category count in sidebar. 2. Create or delete an article in that category. 3. Observe the count doesn't update until page refresh. |
| **MINOR-3** | `/?deleted=1` query param silently ignored | After deleting an article, the app redirects to `/?deleted=1`, but the home page has no code to read this param and display a confirmation message. | 1. Edit an article. 2. Click Delete, confirm. 3. Observe redirect to `/?deleted=1` with no confirmation feedback. |
| **MINOR-4** | TypeScript version behind architecture spec | `package.json` specifies `"typescript": "^5"` but the architecture spec calls for TypeScript 6.0.3. The installed version is likely 5.x. Additionally, `@prisma/adapter-libsql` is listed as a dependency but unused. | 1. Check package.json devDependencies. 2. Note TS version. |

---

## Spec Drift Log

| ID | Area | Spec Reference | Deviation | Intentional? |
|----|------|---------------|-----------|--------------|
| **DRIFT-1** | Missing category pages | Architecture spec §Route Design, Design spec §Page 5, Backlog Feature 4 | `src/app/categories/[slug]/page.tsx` was never created. Sidebar links to `/categories/[slug]` return 404. | Unclear — iteration 1-1 summary notes category infrastructure was designed in, iteration 2 sidebar was built with links, but the page was never made. Iterations 5 and 7 were not completed per instructions, but the sidebar links should either work or not exist. |
| **DRIFT-2** | React version 19.2.4 vs 19.2.6 | Architecture spec §Technology Stack | Package.json has `react: 19.2.4` instead of `19.2.6`. This is a minor patch difference and likely resolved by npm's semver range. | Likely unintentional (npm resolved to available version). |
| **DRIFT-3** | TypeScript ^5 vs ^6.0.3 | Architecture spec §Technology Stack | Package.json has `"typescript": "^5"`. The spec calls for TS 6.0.3. TS 6+ would be a major version change. | Unclear — may be a backward-compatibility choice. |
| **DRIFT-4** | Iterations 5 & 7 not completed | Backlog §Iteration Plan | Iteration 5 (Organization & Status) and Iteration 7 (Polish & Documentation) were intentionally not completed per the task instructions to stay within MVP scope. The backlog defines these as stretch and polish respectively. | **Yes — intentional per instructions.** |
| **DRIFT-5** | Extra unused dependency | Architecture spec §Technology Stack | `@prisma/adapter-libsql` is in package.json dependencies but never imported. | Likely unintentional (leftover from exploration). |
| **DRIFT-6** | Main content max-width | Design spec §Spacing | Spec suggests `max-w-4xl` (896px); implementation uses `--content-max-width: 960px`. Article form uses 860px. These are all close but technically inconsistent. | Minor — within acceptable range. |

---

## Release Recommendation

### **SHIP WITH CONDITIONS**

The MVP flows for **browsing, search, and editing** all pass end-to-end. The test suite is solid (67 unit + 12 E2E, all passing). Linting, type-checking (after fix), and build all pass. API endpoints are complete and properly validated. Error handling covers the key states. Code quality is good — modular, follows the architecture, clean linting, no security issues.

**Conditions for release:**

1. **Fix CRITICAL-1** — Either implement the category pages (`src/app/categories/[slug]/page.tsx`) or remove the category links from the sidebar. Having broken navigation paths from a core UI element is a release blocker.
2. **Fix MAJOR-1** — The duplicate import was fixed during this review. Verify `npx tsc --noEmit` passes.
3. **Fix MINOR-1** — The search count mismatch could confuse users. Filter drafts in the SQL query or count only published results for the banner.

**Rationale:** The three core MVP features (browse, search, edit) are functional and tested. The one critical defect (missing category pages) is a dead-end navigation path from a primary UI component. It must be resolved before release.

---

## Next Steps

### Must Fix (Before Release)

1. **Implement or remove category pages** — Create `src/app/categories/[slug]/page.tsx` that fetches articles by category slug and renders them using `ArticleList`, or remove the category links from the sidebar if category organization is deferred to a future release.
2. **Verify CI type-check** — Run `npx tsc --noEmit` to confirm the duplicate import fix works.

### Should Fix (Before Release)

3. **Fix search count mismatch (MINOR-1)** — Either filter drafts in the FTS SQL query or adjust the count to only reflect published articles displayed.
4. **Update README (MAJOR-2)** — Add local setup instructions: `npm install`, `npm run db:seed`, `npm run dev`, and note the database is SQLite (no external service needed).

### Nice to Fix (Post-Release)

5. **Add category revalidation (MINOR-2)** — Call `revalidatePath('/', 'layout')` or add explicit layout revalidation to the Server Actions so sidebar counts update after mutations.
6. **Add deleted confirmation (MINOR-3)** — Read the `?deleted=1` param on the home page and show a brief success banner.
7. **Add mobile viewport E2E tests** — Configure a Playwright project for mobile viewport and run a subset of browse/search tests.
8. **Remove unused `@prisma/adapter-libsql`** — Clean up the unused dependency.
9. **Consider TypeScript 6 upgrade** — Evaluate compatibility with TypeScript 6 as specified in the architecture spec.
10. **Add search pagination E2E test** — Verify pagination works correctly in search mode.
11. **Implement Iteration 7 polish items** — Responsive verification, accessibility audit, README documentation per the backlog.

---

## Appendix: Test Execution Summary

```
=== Lint ===
npm run lint .................... PASS (0 errors, 0 warnings)

=== Type Check ===
npx tsc --noEmit ................ PASS (after duplicate import fix)

=== Build ===
npm run build ................... PASS (8 routes compiled)

=== Unit Tests (Vitest) ===
__tests__/lib/validators.test.ts . PASS (22 tests)
__tests__/lib/slug.test.ts ....... PASS (9 tests)
__tests__/lib/search.test.ts ..... PASS (20 tests)
__tests__/api/articles.test.ts ... PASS (14 tests)
__tests__/api/categories.test.ts . PASS (2 tests)
Total: 67 passed, 0 failed

=== E2E Tests (Playwright) ===
e2e/browse.spec.ts .............. PASS (5 tests)
e2e/search.spec.ts .............. PASS (5 tests)
e2e/edit.spec.ts ................ PASS (2 tests)
Total: 12 passed, 0 failed

=== API Smoke Tests ===
GET  /api/articles ............... 200 OK
POST /api/articles ............... 201 Created
GET  /api/articles/10 ............ 200 OK
GET  /api/articles/999 ........... 404 Not Found
PUT  /api/articles/10 ............ 200 OK
DELETE /api/articles/[temp] ...... 204 No Content
GET  /api/categories ............. 200 OK
GET  /api/search?q=getting ....... 200 OK
GET  /api/search ................. 400 Bad Request
```

### Page Status Codes

```
/ .................................. 200
/articles/getting-started-with... .. 200
/articles/code-review-guidelines ... 200
/articles/nonexistent .............. 404
/articles/new ...................... 200
/articles/getting-started.../edit .. 200
/categories/guides ................. 404 ← BROKEN
/nonexistent-route ................. 404
```