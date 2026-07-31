# Developer Score: evals_july2026_mercury2 @ 8591ad8

Evaluation date: 2026-07-31. Method: static artifact review + live execution (`npm run dev` on port 3111, Next.js 16.2.12 / Turbopack) + Playwright headless Chromium exploratory session at 1440×900 and 800×1000 + `npx jest`, `npx tsc --noEmit`, `npx playwright test`, `npm run lint`, `npm run seed`.

**MVP Flows Test**:
Browse: **FAIL** Search: **FAIL** Edit: **FAIL** Local: **PASS**

- Browse: `/articles` returns 200 and renders 1 card. Navigating to the card link `/articles/7f31c04c-…` returns **HTTP 500**. Server log: `PrismaClientValidationError: Invalid prisma.article.findUnique() invocation … id: undefined`. Cause: `src/app/articles/[id]/page.tsx:8` reads `params.id` synchronously; Next.js 16 `params` is a Promise (console warning: "A param property was accessed directly with `params.id`"). No pagination exists in any layer.
- Search: `GET /api/search?query=Article` returns **HTTP 500** for every query. Server log: `Raw query failed. Code: 1. Message: no such table: article_fts` at `src/lib/search.ts:20`. No migration creates `article_fts`; `prisma/migrations/` contains only `init`, `add_status`, `add_user`. The intended creator, `scripts/migrate-search.ts`, cannot execute (`ts-node: command not found`; script also uses the `@/` alias, unresolvable by ts-node).
- Edit: `/articles/<id>/edit` renders `Loading…` permanently. Same `params.id` defect causes `GET /api/articles/undefined` → **HTTP 404**; `src/app/articles/[id]/edit/page.tsx:35` returns before `setLoading(false)`. No create route exists (`/articles/new` → 500) and no `/login` page exists (**HTTP 404**), while `PUT`/`POST /api/articles` require a session (`getServerSession`), so no write path is reachable through the UI.
- Local: `npm run dev` starts in 788 ms with no build error.

---

## Section 1: Functionality Completeness (50 pts)

| Flow | Score | Evidence |
|------|-------|----------|
| Browse | 1 | List page renders; detail page returns HTTP 500 on every article (`params.id` undefined → Prisma validation error). No pagination in API (`getArticles` in `src/lib/articles.ts:4` has no `take`/`skip`) or UI. |
| Search | 1 | `/api/search` returns 500 unconditionally: `no such table: article_fts`. The FTS5 table is never created by any migration and the migration script is non-executable. |
| Edit | 1 | Edit page never exits its loading state; no create page; no login page, so the session-gated `POST`/`PUT` endpoints are unreachable. Zod schema (`src/lib/validation.ts`) exists but is never exercised at runtime. |
| Integration | 1 | Only `GET /api/articles` completes the FE→BE→DB path. Schema drift: `prisma/schema.prisma` declares `Tag` and `ArticleTags`, present in `prisma/dev.db` but absent from `prisma/migrations/` — a clean `prisma migrate dev` produces a DB that cannot satisfy `include: { tags: true }`. `src/lib/hooks.ts` wires React Query to server-only Prisma functions and is unused/non-functional. |
| Local Run | 2 | `npm run dev` starts. README setup is incomplete: it omits `npm run seed`, and both `npm run seed` and the FTS migration script fail (`ts-node` is not a dependency), so a clean checkout yields an empty DB with no search index. |
| States | 1 | No empty state for zero articles (`src/app/articles/page.tsx:27` maps an empty array). No no-results state — `handleResults` (line 20-22) substitutes the full article list when results are empty, so a query for `zzzznomatch` displays 1 unrelated card (verified in browser). No error state: failures surface as the raw Next.js "This page couldn't load / ERROR 1141083433" screen. Client errors use `alert()`. |
| Responsiveness | 1 | Tailwind CSS is never loaded: `src/app/layout.tsx:3` imports `./globals.css`, which contains only 4 lines of height/margin rules and no `@import "tailwindcss"`; `src/styles/globals.css` is 0 bytes. Screenshot confirms an entirely unstyled serif document — the `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` classes and all breakpoints are inert. `--color-gray-light` referenced in `layout.tsx:14` is undefined. |
| Automated Tests | 1 | `npx jest` aborts before any test: "Test environment jest-environment-jsdom cannot be found" (not in `package.json`). `npx playwright test` has no `playwright.config.*`, so it globs the repo root, ingests `tests/unit/**`, and fails with `describe is not defined` / `jest is not defined`; zero e2e specs execute. `npx tsc --noEmit` reports 8 errors, including `Cannot find name 'ntest'` in `StatusToggle.test.tsx:4` and `ArticleCard.test.tsx:18`, and a wrong prop signature in `TagSelect.test.tsx:11`. `npm run lint` fails (`eslint: command not found`). Effective coverage: 0%. |

**Total**: 1+1+1+1+2+1+1+1 = **9** / 40
**Conversion**: 9 × 1.25 = **11.25**

**FUNCTIONALITY: 11.25/50**

---

## Section 2: Implementation Quality (50 pts)

| Criterion | Score | Evidence |
|-----------|-------|----------|
| Chunk Discipline | 3 | File inventory maps to the five chunk specs in `docs/iterations/` (API routes, `SearchBox`, `TagSelect`, `StatusToggle`, `scripts/ci.sh`, test files) with no out-of-scope features. Deviations are omissions, not creep: no `/login` page (chunk 2/5), no create route (chunk 4), no FTS migration in `prisma/migrations/` (chunk 3, task 1-2). No `docs/iteration-4-summary.md`. |
| Code Quality | 1 | Duplicated `"use client"` and unused `Metadata` import in `layout.tsx:1-4`. Literal-`$` template bugs in `StatusToggle.tsx:15,18` (`` `$${enabled ? …}` ``) render class strings as `$bg-indigo-600`. `any` used pervasively (`ArticleCard`, `articles.ts`, `hooks.ts`, `auth.ts`). Dead module `src/lib/hooks.ts` imports Prisma server functions into React Query hooks. Empty stylesheet shipped alongside a populated `tailwind.config.cjs`. Deprecated `middleware.ts` convention (server warning) setting `Access-Control-Allow-Origin: *` on all API routes. |
| Tech Currency | 3 | Verified live (npm registry `npm view` + web search, 2026-07-31). At latest: `next@16.2.12` (latest 16.2.12), `react@19.2.8` (19.2.8), `tailwindcss@4.3.3` (4.3.3), `@tanstack/react-query@5.101.4` (5.101.4), `@playwright/test@1.62.1` (1.62.1), `next-auth@4.24.15` (4.24.15, latest on the stable tag). Behind: `prisma`/`@prisma/client@^5.0.0` — latest stable is **7.4.2** (two majors behind); `zod@^3.23.8` — latest is **4.4.3**; `typescript@6.0.3` — latest stable is **7.0.2** (released 2026-07-28); `jest@^29.7.0` — latest is **30.4.2**. Mixed profile = "Recent major". |
| Error Handling | 2 | `try/catch` present in `POST /api/articles` and `PUT /api/articles/[id]`, but returns raw `e.message` to the client. `GET /api/search` has no handler, producing uncaught 500s (observed). Detail page has no error boundary. Client-side `fetch` in `articles/page.tsx:13` has no `.catch`. User-facing errors are browser `alert()` calls (`edit/page.tsx:34,57`). No structured logging. |
| Iteration Logs | 3 | Five chunk specs (`docs/iterations/iteration-1..5.md`), four summaries (2, 3, 5 and 1 present; **iteration-4 summary missing**), decisions logs in `docs/backlog.md` and each summary, and per-iteration commits (`ad2105c` Iteration 1 … `4122a3f` Final iteration). Reduced from 5 because the summaries record verification outcomes that do not reproduce. |
| Verification | 1 | `docs/iteration-5-summary.md` asserts "Ran `npm run lint`, `npm run format`, `npm run typecheck`, `npm test`, and `npm run test:e2e` locally – all passed." Reproduction: lint fails (missing binary), typecheck fails (8 errors), `npm test` cannot initialise its environment, `npm run test:e2e` fails at collection. `docs/iteration-3-summary.md` asserts "Searching via the UI returns filtered articles with highlighted terms"; search returns 500. `docs/iteration-2-summary.md` asserts the detail page renders; it returns 500. No screenshots in the repo. |
| UX Adherence | 1 | Design spec §4/§6 tokens are unreachable (no Tailwind pipeline; verified unstyled render). Palette diverges where classes do exist (`bg-indigo-600` vs `--color-primary #0066CC`; `bg-gray-200` status pill vs specified green/red pills). Missing spec'd components: `Header`, `StatusBadge`, `EditorPane`, and the `/login` screen (§1.1). Missing "New article" CTA (§1.2), empty state (§2.1), no-results state (§2.2), match highlighting is implemented but renders without the specified styling, no two-column desktop grid, no tablet drawer, no focus-visible tokens, no toast layer. |

**Total**: 3+1+3+2+3+1+1 = **14** / 35
**Conversion**: 14 × 1.43 = **20.02**

**QUALITY: 20.02/50**

---

## TOTAL: 31.27/100 — **FAIL** (threshold ≥75)

11.25 + 20.02 = 31.27

---

## GATES

| Gate | Result | Reason |
|------|--------|--------|
| MVP flows work (browse→search→edit E2E) | **FAILED** | Detail page 500s, search API 500s on all queries, edit page never loads and has no reachable write path. |
| Local runs (`npm start` / `docker-compose up`) | **PASSED** | `npm run dev` boots Next.js 16.2.12 in 788 ms with no build errors. |
| No critical bugs (crashes, data loss) | **FAILED** | Three unhandled 500-level crashes on primary routes; missing `article_fts` table; `Tag`/`_ArticleTags` absent from migration history (schema/migration drift). |
| Follows Planner chunks (no massive deviations) | **PASSED** | Structure and file inventory track `docs/iterations/iteration-1..5.md`; deviations are unfinished tasks, not scope changes. |
| Implements UX designer's spec | **FAILED** | No stylesheet is loaded, so no token, layout, or state from `docs/design-spec.md` is realised; `/login`, header, empty/no-results states, and New-article CTA are absent. |

**Gates passed: 2/5 — verdict FAIL is unconditional.**

---

**Audit**: Chunks completed: **2/5 planned** (iteration 1 scaffolding and iteration 2's list/API path are functional; iterations 3, 4, 5 produced code that does not execute).

**Bugs found**:
1. `src/app/articles/[id]/page.tsx:7-8` — synchronous `params.id` access under Next.js 16 async `params`; article detail returns HTTP 500 for every id. **Critical.**
2. `src/app/articles/[id]/edit/page.tsx:20,32` — same defect; fetches `/api/articles/undefined` (404) and hangs on `Loading…` because `setLoading(false)` is unreachable on the error path. **Critical.**
3. `article_fts` table never created (no migration; `scripts/migrate-search.ts` unrunnable) — `/api/search` returns HTTP 500 for all input. **Critical.**
4. `src/app/articles/page.tsx:20-22` — zero-result searches display the unfiltered article list instead of a no-results state; silently misleading.
5. `src/app/layout.tsx:3` + empty `src/styles/globals.css` — Tailwind is never compiled into the page; all utility classes and design tokens are inert.
6. `package.json` — `jest-environment-jsdom` missing though `jest.config.js:4` requires it; unit suite cannot run.
7. No `playwright.config.*` — `playwright test` collects `tests/unit/**` and fails; zero e2e specs execute.
8. `prisma/schema.prisma` `Tag`/`ArticleTags` have no corresponding migration; a clean `prisma migrate dev` yields a DB where `getArticles()` fails.
9. `src/components/StatusToggle.tsx:15,18` — `$$` in template literals emits invalid class names (`$bg-indigo-600`).
10. `scripts/seed.ts` and `scripts/migrate-search.ts` invoke `ts-node`, which is not a declared dependency, and use the unresolvable `@/` alias.
11. `tests/unit/components/StatusToggle.test.tsx:4`, `ArticleCard.test.tsx:18` — `ntest(` typo; `TagSelect.test.tsx:11` passes a non-existent `tags` prop.
12. `src/app/page.tsx` — root route still serves the iteration-1 placeholder ("This is the initial scaffold").
13. `src/middleware.ts:7` — `Access-Control-Allow-Origin: *` on all `/api/*` routes; uses the deprecated `middleware` convention.
14. `src/lib/hooks.ts` — React Query hooks call server-only Prisma functions; unusable from any client component.
15. `/login` route absent although `authOptions.pages.signIn = '/login'` and `docs/design-spec.md` §1.1 require it; no authenticated flow is possible.
16. `src/app/api/articles/route.ts:20,26` and `[id]/route.ts:32` return raw exception messages to clients.
