# Developer Score: evals_May2026_qwen-3.6-plus

## MVP Flows Test (headless Chromium via Playwright)

| Flow | Result | Evidence |
|------|--------|----------|
| Browse | PASS | `/` returns 200; 19 article cards rendered (`[HOME-CARDS] 19`); clicking a card navigates to `/articles/[id]` and renders an `<h1>` with the article title (`[DETAIL-H1] Edited Title`). Cursor pagination implemented in `/api/articles`. |
| Search | PASS | Header search input present; `/search?q=test` renders 12 result cards; `/search?q=zzznonexistentxyzzz` renders a "no results" message (`[NO-RESULTS-TEXT] true`). |
| Edit | PASS | `/articles/new` renders title input + textarea; submitting empty form surfaces validation error (`[VALIDATION-EMPTY] true`); `/articles/[id]/edit` loads the editor with pre-filled content; QA report and `playwright/tests/edit.spec.ts` confirm save→redirect→detail update path. |
| Local | PASS | `npm install && npm run dev` boots Next.js 16.2.4 (Turbopack) on port 3000 in <1s (`✓ Ready in 847ms`). DB and seeded articles already present in `data/knowledge-base.db`. |

## Section 1 — Functionality Completeness (50 pts)

| Item | Score | Justification |
|------|-------|---------------|
| Browse | 5 | List → detail flow works; cursor-based pagination via `?cursor=` in `src/lib/articles.ts:getArticles`; detail page renders title, prose (`kb-prose`), category/timestamp meta, and Edit link. |
| Search | 4 | Search returns ranked results across title and content with empty, populated, and no-results states (verified in `/search?q=`). Implementation uses `LIKE '%q%'` in `src/lib/search.ts:38` rather than the FTS5 `MATCH` queries the architecture spec mandates (FTS5 virtual table exists with triggers but is unused — `grep -c "MATCH" src/lib/search.ts` = 0). Functional but not full-text indexed; downgraded from 5. |
| Edit | 5 | Server actions in `src/actions/articles.ts` perform create+update with Zod validation; client editor offers live Markdown preview, validation errors, unsaved-changes guard, and `⌘S`/`Ctrl+S` shortcut (`components/article/ArticleEditor.tsx`). |
| Integration | 5 | FE (RSC + client `ArticleEditor`) ↔ BE (route handlers `app/api/articles`, `app/api/search`, server actions) ↔ DB (Drizzle + better-sqlite3) traced end-to-end during exploratory run; data created via UI is retrievable via `/api/articles`. |
| Local Run | 4 | Single command `npm run dev` works; however README omits `npm run db:push` and `npm run seed` prerequisites for a fresh clone (per QA m5 and direct README inspection). Not a one-command first-run. |
| States | 5 | Empty article-list state, search no-results state, 404 article-not-found page, form validation errors, error toast on save failure, and skeleton loading state are all present (`components/EmptyState.tsx`, `app/articles/[id]/not-found.tsx`, exploratory `[NOT-FOUND] true`). |
| Responsiveness | 5 | Desktop layout renders sidebar+list; resizing viewport to 900×800 (tablet) still renders 20 cards; brief requires only desktop and tablet, both confirmed. Mobile (<768px) is a documented post-MVP item. |
| Automated Tests | 3 | Vitest: 53 passing / 7 skipped / **2 errors** in `tests/lib/search.test.ts` (EBUSY db-file lock when run alongside dev server; cleanly 60/60 only with `--no-file-parallelism` and no other DB consumer). Playwright: **16/18 passed, 2 failed** (`browse.spec.ts` "Back link returns to browse view" and "title/content/meta on detail page"). Coverage report (per QA) reports 27% statements / 20% branch on targeted dirs — between 0–50% range. Critical-flow E2E exists but two failed; coverage <50%. |

Subtotal: 5+4+5+5+4+5+5+3 = **36/40**
Conversion: 36 × 1.25 = **45/50**

## Section 2 — Implementation Quality (50 pts)

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Chunk Discipline | 5 | Five commits map 1:1 to the five backlog iterations (`git log`: `Iteration 1` … `Iteration 5`); summaries in `docs/iterations/iteration-{1..5}.md`. Stretch features (categories UI, status toggle) correctly deferred per backlog Decisions #2/#3. |
| Code Quality | 4 | TypeScript strict mode; modular separation (`components/`, `src/lib/`, `src/actions/`, `src/db/`); largest files (`ArticleEditor.tsx` 281 lines, `ArticleList.tsx` 194 lines) remain readable. Some debug scripts (`scripts/apply-fts5.ts`, root-level `test_fts5.js`) left behind, indicating mid-work cleanup gap. |
| Tech Currency | 5 | Live-search-verified versions (May 2026): Next.js 16.2.4 vs latest 16.2.5 (one patch behind); React 19.2.5; Drizzle ORM 0.45.2 = latest stable; Vitest 4.1.5 = latest stable; Playwright 1.59.1 = latest stable; Tailwind 4.2.4; Zod 4.4.3; better-sqlite3 12.9.0. All deps within current major; nearly all at latest patch. |
| Error Handling | 5 | `try/catch` with `toast.error`/`toast.success` in `ArticleEditor.handleSave`; standardized `{ success, errors }` shape from server actions; 400/404/500 mapping in API routes; `notFound()` for missing articles; `beforeunload` guard for unsaved changes. |
| Iteration Logs | 5 | Per-iteration commits + `docs/iteration-{1..5}-summary.md` + `docs/iterations/iteration-{1..5}.md` + decisions log in `backlog.md`. |
| Verification | 4 | Tests exist and mostly pass (16/18 E2E, 53/60 unit cleanly when isolated). 2 E2E failures in `browse.spec.ts` and unit-test parallel-mode regression (M1 in QA) reduce from 5. Manual QA report (`docs/qa-report.md`) is thorough. |
| UX Adherence | 5 | Design tokens, Inter+JetBrains Mono fonts via `next/font`, header (logo / search ⌘K / + New), 240px sidebar with hamburger on tablet, `kb-prose` content rendering, ARIA roles for search dropdown listbox, confirmation modal with focus management — all match `docs/design-spec.md`. |

Subtotal: 5+4+5+5+5+4+5 = **33/35**
Conversion: 33 × 1.43 = **47.19 ≈ 47/50**

## Pass/Fail Gates

- [x] **MVP flows work** — PASS. Browse → search → edit verified end-to-end via headless Chromium.
- [x] **Local runs** — PASS. `npm run dev` starts the app on a single command (DB already present); README would need a one-line addition for first-time setup.
- [x] **No critical bugs** — PASS. No crashes or data-loss conditions observed; FTS5-vs-LIKE deviation is a performance/feature-quality issue, not a critical bug (search still functions).
- [x] **Follows Planner chunks** — PASS. Five commits map to five planned iterations; deferrals match backlog decisions.
- [x] **Implements UX designer's spec** — PASS. Layout, typography, header, sidebar, empty states, modal, and prose styling implemented per `docs/design-spec.md`.

## Totals

FUNCTIONALITY: **45/50**
QUALITY: **47/50**
TOTAL: **92/100** — **PASS** (threshold ≥75)

## Audit

- Chunks completed: **5 / 5** planned (Foundation, Browse & Detail, Search, Editor, Test & Polish).
- Bugs found:
  - C1 (Major architecture deviation): `src/lib/search.ts:38` uses `LIKE '%q%'` rather than the FTS5 `MATCH` queries specified in `docs/architecture.md` §"Search Implementation". The `articles_fts` virtual table and triggers are built but never queried.
  - E2E regression: 2 of 18 Playwright tests failing (`browse.spec.ts` lines 31 and 45 — detail page "title/content/meta" and "Back link returns to browse view").
  - Unit-test regression: `tests/lib/search.test.ts` EBUSY-locks `data/knowledge-base.db` (Windows) and only passes when no other process holds the DB; default parallel `npm test` config also flagged in QA report (M1).
  - README first-run gap: missing `npm run db:push` and `npm run seed` prerequisites (QA m5).
  - Repo cleanliness: root-level `test_fts5.js` and several `scripts/*-fts5.ts` debug scripts left in tree (QA m3, m4).
  - Server actions omit `revalidatePath` (QA M2) — newly created/edited articles may show stale cached lists until manual refresh.
  - Pagination cursor uses `created_at` while ordering by `updated_at` (QA m2) — benign at MVP data sizes.

## Live-search citations (Tech Currency)

- Next.js latest stable 16.2.5 — endoflife.date / nextjs.org/blog/next-16-2 (May 2026).
- Drizzle ORM latest stable 0.45.2 — orm.drizzle.team latest-releases / npmjs.com/package/drizzle-orm (March–April 2026).
- Vitest latest stable 4.1.5 — vitest.dev/blog/vitest-4-1, npmjs.com/package/vitest (April 2026).
- Playwright latest stable 1.59.1 — github.com/microsoft/playwright/releases (April 2026).
