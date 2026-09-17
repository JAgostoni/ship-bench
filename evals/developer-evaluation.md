# Developer Score: evals_sep2026_deepseek-flash-4.1

**Evaluation date:** 2026-09-17
**Artifacts under test:** repository `HEAD` (`58c2307`), application source in `src/`, `docs/iteration-{1..8}-summary.md`, `docs/decisions-log.md`, `docs/verification-notes.md`, `docs/screenshots/`.
**Method:** static inspection plus live exploratory testing of the running application (Next.js dev server on `localhost:3000`) driven by headless Chromium/WebKit via Playwright. No `curl`-only verification was used for UI assertions.

---

## MVP Flows Test

**Browse: PASS** · **Search: PASS** · **Edit: PASS** · **Local: PASS**

| Flow | Observed behaviour (headless browser) |
|---|---|
| Browse | `/` rendered the sidebar with 5 categories and 7 published articles (2 drafts excluded), matching the README's stated first-run result. `/articles/deploying-the-api-to-production` rendered Markdown as real elements (7 `h2`, 2 `pre`, 1 `table`, task lists) with breadcrumbs, metadata, and revision history. Pagination verified at `?pageSize=3`: "Page 2 of 3", numbered pages, Previous/Next controls, URL updated to `?pageSize=3&page=2`. |
| Search | Typing `deploy` in the header input debounce-navigated to `/search?q=deploy` → 3 results with 6 `<mark>` highlight nodes. Content-only term `formatter` (absent from all titles) returned the correct 1 result, confirming full-text (title + body) indexing. `?q=zzzqqxnothing` rendered the zero-results state with recovery actions. |
| Edit | Created an article end-to-end (`/articles/new` → redirect to `/articles/eval-probe-article`, DRAFT badge, 1 revision). Edited `code-review-guidelines`: title and body changes persisted across a hard reload and became searchable (`?q=Evaluator` → 1 result), confirming FTS reindex on write. Empty submit produced inline field errors ("Title must be at least 3 characters.", "Article body cannot be empty."), not a thrown boundary. |
| Local run | `npm run dev` started in 860 ms on a pre-seeded DB; the documented first-run sequence (`nvm use` → `npm install` → copy `.env.example` → `npm run db:setup` → `npm run dev`) produced exactly the article/category/search counts the README predicts. `npm run build` exited 0 (13 routes compiled). |

---

## Section 1: Functionality Completeness (50 pts)

| Flow | Score | Evidence |
|---|---|---|
| Browse | 5 | Full server-side pagination (`limit(pageSize+1)` hasNext probe, `src/server/repositories/articles.ts:297`), category chips, sort/status selects, and a complete detail page (TOC, breadcrumb, revision list). No crash or empty surface at any probed URL. |
| Search | 5 | SQLite FTS5 index with snippet highlighting; title and body both matched; `0 results for "…"` and `Clear search` states present; a `⌘K` command palette is additionally available. |
| Edit | 5 | Validated create and update via Server Actions sharing the client's Zod schemas (`src/app/actions/articles.ts`), slug generation, change note, status/category selection, revision history, and optimistic-concurrency conflict detection. |
| Integration | 5 | Writes issued from the browser propagated through Server Actions → Drizzle repositories → SQLite → FTS index and were observable in list, detail, and search surfaces after a full reload. Zero `pageerror` events across all probed routes. |
| Local Run | 5 | `npm run dev`, `npm run build`, `npm run test:run`, and `npm run test:e2e` all exited 0 with no manual intervention; documented expected outputs matched observed outputs exactly. |
| States | 5 | Verified live: five empty states (no articles, no results, empty category, empty filter, no categories), not-found panel ("We couldn't find that article."), route error boundary exposing `error.digest` (`src/app/(shell)/error.tsx`), inline field validation, and the conflict banner. |
| Responsiveness | 4 | `document.scrollWidth === clientWidth` at 1440, 768, and 390 px (no horizontal overflow); the sidebar collapses to a hamburger drawer below 1024 px. Deducted for the confirmed 32 px filter-chip hit area against the design spec's 44 px requirement (§6.4) and slight clipping of the chip row at 768 px. |
| Automated Tests | 5 | `vitest run --coverage`: **492 tests / 48 files passed**, 95.13% statements, 86.74% branches, 95.46% lines over `src/lib/**` + `src/server/**`, thresholds enforced in `vitest.config.ts`. `playwright test`: **28 passed** across `desktop-chromium` and `tablet-webkit`, covering browse, search, edit, empty-state, and responsive journeys. |

**Total:** 5+5+5+5+5+5+4+5 = **39 / 40**
**Conversion:** 39 × 1.25 = **48.75**

**FUNCTIONALITY: 48.75 / 50**

---

## Section 2: Implementation Quality (50 pts)

| Criterion | Score | Evidence |
|---|---|---|
| Chunk Discipline | 5 | All 8 planned iterations from `docs/backlog.md` §7 were delivered, each with a dedicated commit (`50e2345`, `8dcf988`, `4dc99fb`, `01386e8`, `2d720e7`, `2be526e`, `53ebbf0`; 7 and 8 combined) and a summary file mapping tasks to files. In-scope refactors are enumerated explicitly (`iteration-6-summary.md` §1.1) rather than folded in silently. |
| Code Quality | 5 | Strict layering enforced by lint rules (all SQL confined to `src/server/repositories/`), shared Zod schemas across client and server, typed `Result`/`AppError` unions, components split into `ui/`, `layout/`, `articles/`, `search/`, `filters/`. `npm run typecheck`, `npm run lint`, and `npm run build` each exited 0. |
| Tech Currency | 4 | Live npm registry checks (2026-09-17): react 19.3.0 = latest; tailwindcss 4.3.3 = latest; drizzle-orm 0.45.2 = latest; @playwright/test 1.63.0 = latest; better-sqlite3 13.0.3 = latest. Behind latest: next 16.3.4 vs **16.3.5**, zod 4.6.2 vs **4.6.5**, vitest 5.0.0 vs **5.0.1** (patch); typescript 6.0.3 vs **7.0.2** and eslint 9.39.5 vs **10.10.0** (one major each). Recent majors with mostly-latest patches places this between anchors 3 and 5. |
| Error Handling | 5 | Structured `AppError` + `Result` union, pino structured logging with an explicit no-article-bodies rule (`logMutation`, §13.2), a route error boundary exposing only a correlation digest, not-found panels, inline field errors, and a user-recoverable conflict banner ("Reload latest version" / "Copy my text") verified live with two concurrent editors. |
| Iteration Logs | 5 | Eight iteration summaries with acceptance-check counts (iteration 6: 78/78 plus 68/68 and 42/42 regression suites), an append-only `decisions-log.md` recording every deviation from the architecture and design specs, and an explicit accepted-gaps section. |
| Verification | 5 | `verification-notes.md` traces every claim to a command or test name; `npm run verify` chains typecheck → lint → format:check → tests → build; 27 committed screenshots cover all flows in light and dark themes. Every suite re-run during this evaluation passed. |
| UX Adherence | 4 | Layout, tokens, typography, and state inventory match `design-spec.md` (verified against §2.1 shell, §5.x components, §7.3 empty states, §6.3 drawer). Deducted for two confirmed deviations: "Save & create another" redirects to `/articles/probe-batch-one` instead of resetting the form at `/articles/new` (spec §3.1, E10/UX22 — reproduced live), and the 32 px chip hit area (§6.4). A cosmetic toolbar-label overlap ("Heading 2" / "Heading 3") is visible in the Markdown editor. |

**Total:** 5+5+4+5+5+5+4 = **33 / 35**
**Conversion:** 33 × 1.43 = **47.19**

**QUALITY: 47.19 / 50**

---

## TOTAL: 95.94 / 100 — **PASS** (threshold ≥ 75)

48.75 + 47.19 = 95.94

---

## Pass/Fail Gates

| Gate | Result | Reason |
|---|---|---|
| MVP flows work (browse→search→edit E2E) | **PASSED** | All three flows executed end-to-end in a headless browser with persistence verified across reloads. |
| Local runs (`docker-compose up` or `npm start`) | **PASSED** | `npm run dev` and `npm run build` exit 0; the documented first-run sequence reproduced the stated dataset exactly. |
| No critical bugs (crashes, data loss) | **PASSED** | Zero uncaught page errors across all probed routes; no data loss observed; concurrent edits are rejected with a recovery path rather than silently overwritten. |
| Follows Planner chunks | **PASSED** | 8 of 8 planned iterations delivered in the planned order, one commit and one summary per iteration. |
| Implements UX designer's spec | **PASSED** | Shell, tokens, component set, and all specified states implemented; two documented, non-blocking deviations recorded above. |

**GATES: [x] Flows [x] Local [x] Bugs [x] Chunks [x] UX**

---

## Audit

**Chunks completed:** 8 / 8 planned (iterations 7 and 8 landed in a single commit, `53ebbf0`).

**Bugs found (exploratory testing, this evaluation):**

1. *Major (spec deviation, reproduced)* — "Save & create another" on `/articles/new` redirects to the new article's detail page instead of resetting the form in place; the batch-authoring flow in `design-spec.md` §3.1 does not exist.
2. *Major (accessibility, matches `qa-report.md` QA-2)* — category filter chips present a 32 px hit area against the design spec's 44 px floor.
3. *Minor* — the Markdown editor toolbar renders overlapping "Heading 2" / "Heading 3" labels at 1440 px width.
4. *Minor (dev-only)* — the configured Content-Security-Policy omits `unsafe-eval`, so `next dev` logs a React eval() warning on every page load and shows a persistent "1 Issue" dev-overlay badge. Absent from production builds.
5. *Minor (tooling)* — Next.js 16 refuses a second `next dev` instance, so `npm run test:e2e` cannot start its port-3100 web server while a developer dev server is running; the suite passes once the first server is stopped.

**Verification commands executed for this evaluation:**
`npm run test:coverage` (492 passed, exit 0) · `npm run test:e2e` (28 passed, exit 0) · `npm run typecheck` (exit 0) · `npm run lint` (exit 0) · `npm run build` (exit 0) · headless Playwright exploration of `/`, `/search`, `/articles/[slug]`, `/articles/[slug]/edit`, `/articles/new`, `/categories/[slug]`, and invalid-slug routes at 1440×900, 768×1024, and 390×844.
