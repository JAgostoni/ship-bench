# Developer Score: evals_june2026_grok_4.5 (branch `evals_june2026_grok_4.5`, HEAD `71a66f0`)

**Evaluation date:** 2026-07-30
**Spec applied:** `evals/developer-measurement-spec.md`
**Artifacts assessed:** `src/**`, `tests/**`, `e2e/**`, `prisma/**`, `README.md`, `docs/iteration-{1..6}-summary.md`, `docs/backlog.md`, `docs/architecture.md`, `docs/design-spec.md`
**Method:** static review + `npm test` / `npm run lint` / `npm run build` / `npm run test:e2e` + independent headless-Chromium exploratory testing (Playwright driving `npm run dev`; 73 evaluator-authored checks across three viewports and three database states: seeded dev DB, 28-article DB for pagination, migrated-but-unseeded DB for empty states). Developer and QA claims were re-verified, not accepted.

---

**MVP Flows Test**:
Browse: **PASS** Search: **PASS** Edit: **PASS** Local: **PASS**

FUNCTIONALITY: **46.25/50**
QUALITY: **44.33/50**
TOTAL: **90.58/100 — PASS** (threshold ≥75)

GATES: [x] Flows [x] Local [x] Bugs [x] Chunks [x] UX

---

## Section 1: Functionality Completeness (50 pts)

| # | Flow | Score | Evidence |
|---|------|-------|----------|
| 1 | Browse | **5** | `GET /` → 200, `h1` "Articles", 8 published seed rows, drafts excluded by default (0 Draft badges). Row click and keyboard `Enter` both navigate to `/articles/[slug]` (`security-faq`, `incident-response-runbook`). Pagination verified against a 28-published-article DB: page 1 renders exactly 20 rows, `Previous` rendered as `aria-disabled="true"` span, `Next` → `/?page=2` (`rel="next"`), page 2 renders 8 rows, "Page 2", "Showing 8 of 28 articles", `Next` disabled on the last page. Detail renders `h1`, `.prose-article` with `h2`/`ul`, absolute date ("Updated Jul 17, 2026, 5:30 PM"), back link "All articles", Edit link, Delete button. |
| 2 | Search | **5** | FTS5 virtual table (`articles_fts`, `unicode61`) queried with `bm25` ranking and `snippet()`; `WHERE a.status = 'PUBLISHED'` excludes drafts (`src/lib/fts.ts:176-198`). Content-only match confirmed: term `rollback` (body text, absent from all titles) returns "How We Deploy to Production"; a created article whose unique token `zorbulax` appeared only in the body was retrievable immediately, proving `syncArticleToFts` runs on write. Typeahead: `role="combobox"`, 250 ms debounce, 2 options for `onboarding`, "No published articles match" for a nonsense query. `/search?q=onboarding` renders "Results for …" with `<mark>` snippets; `/search?q=<nonsense>` → "No results for …"; `/search` (no `q`) → "Search the knowledge base". |
| 3 | Edit | **5** | Empty submit on `/articles/new` yields inline "Title is required" + "Content is required". Slug auto-derives from title (`Eval Smoke Article One` → `eval-smoke-article-one`) and stops on user touch. Create (published) redirects to detail with body rendered. Duplicate slug is blocked: stays on `/articles/new` with "An article with this slug already exists." at field and form level. Edit prefills, saves, and detail shows the new title. Optimistic concurrency verified with two concurrent edit sessions: the stale save is rejected with the design banner "This article changed since you opened it. Reload…". Delete uses design copy `Delete “{title}”? This cannot be undone.`, redirects to `/`, and the slug then returns HTTP 404. |
| 4 | Integration | **5** | Server Components → Prisma 7 + better-sqlite3 adapter → SQLite verified live; Server Actions perform validation → sanitize → persist → tag replacement → FTS sync → `revalidatePath` → redirect (`src/lib/actions/articles.ts:135-182`). Cross-layer effects observed end-to-end: create/edit is immediately reflected in list, detail, `/api/search` JSON, and `/search` SSR; delete removes the FTS row (deleted slug no longer searchable and 404s). |
| 5 | Local Run | **4** | README first-time setup (`npm install` → `cp .env.example .env` → `npx prisma migrate dev` → `npm run db:seed` → `npm run dev`) reproduced successfully; server ready in ~0.7 s on Next 16.2.10; no undocumented steps. Not a single-command bootstrap, and setup is order-sensitive in a way that fails silently: the FTS table is created **only** by the seed script, so a migrated-but-unseeded database returns HTTP 500 from `/api/search` and "Search failed" on `/search` (reproduced on `prisma/empty.db`). `src/lib/fts.ts:18 ensureFtsSchema()` exists to prevent exactly this but has no call site in `src/**`. |
| 6 | States | **5** | All designed states verified live, with copy matching `design-spec.md` §6.10/§8 verbatim. Empty DB (`empty.db`): "No articles yet" + "Create the first article to start the team knowledge base." + Create CTA; filter rail shows "No categories yet" / "No tags available"; the create form shows the same taxonomy empty states. Filters excluding all → "No matching articles" + "Clear filters". Search empty/no-results/prompt states as above. Unknown slug and post-delete slug → HTTP 404 with "Article not found" + "Back to articles". Validation, unique-slug, and conflict states confirmed interactively; `src/app/error.tsx` implements S7 (structure verified statically; not force-triggered). |
| 7 | Responsiveness | **5** | 1280 px: `nav[aria-label="Filters"]` rail visible, mobile selects hidden, no horizontal overflow. 768 px (tablet, brief's secondary target): rail still visible, `scrollWidth == clientWidth`. 390 px (iPhone 13 emulation): stacked `#mobile-status` / category / tag selects present, desktop rail hidden, no horizontal overflow. Design tokens resolve at runtime (`--color-bg=#fafafa`, `--color-accent=#0284c7`, `--color-text=#18181b`, `--color-border=#e4e4e7`, `--color-highlight=#fef3c7`), exactly the spec values. |
| 8 | Automated Tests | **3** | `npm test` → 42 passed / 7 files (1.2 s). `CI=1 npm run test:e2e` → 5 passed (18.9 s) covering browse→detail, search, edit-and-save, create-draft + drafts filter, shell smoke. However no coverage instrumentation is installed (`npx vitest run --coverage` → "MISSING DEPENDENCY `@vitest/coverage-v8`"), so the ≥80 % anchor is unverifiable and unmet by construction. Unit tests target only pure utilities (`slugify` 14 LOC, `excerpt` 31, `dates` 67, `article` schema 39, `toFtsQuery`/`sanitizeFtsSnippet`) ≈ 190 of ~1 030 non-DB `src/lib` LOC (~18 %); `queries/articles.ts` (165 LOC) and `actions/articles.ts` (354 LOC) have no unit tests and are exercised only indirectly through E2E. Delete, conflict, unique-slug, and pagination have no automated coverage. Scored 3 (partial coverage plus E2E on critical flows), not 5. |

**Math:** 5 + 5 + 5 + 5 + 4 + 5 + 5 + 3 = **37** (max 40). 37 × 1.25 = **46.25 / 50**.

---

## Section 2: Implementation Quality (50 pts)

| Criterion | Score | Evidence |
|-----------|-------|----------|
| Chunk Discipline | **5** | Six iteration commits map 1:1 to `docs/backlog.md` §2 (`b3d88c1` It.1 … `91959d8` It.6), each with a summary declaring exit criteria met. Deferred items are the ones the backlog designated as stretch: `createCategory`/`createTag` (§1.2), `?saved=1` banner, auth, toasts/modals. No unplanned features found in `src/**` (no dark mode, no ⌘K, no infinite scroll, no REST CRUD) — the §1.3 non-goals hold. |
| Code Quality | **5** | Clear layering: `app/` routes, `components/{articles,editor,layout,search,ui}`, `lib/{actions,queries,utils,validation}`. Zero `any`, `as any`, `@ts-ignore`, or `@ts-expect-error` in `src/**`; `npm run lint` exits 0; `npm run build` type-checks clean. Largest module is the shared create/edit `ArticleForm.tsx` at 505 LOC (justified by dual-mode form + field error mapping); next largest 354 LOC. No god files. Both `dangerouslySetInnerHTML` sites consume sanitized input (`sanitizeHtml` on write and read; `sanitizeFtsSnippet` allowlists only `<mark>`). |
| Tech Currency | **3** | Live registry check 2026-07-30 (`npm view <pkg> version`) plus web verification. Correct current major generation throughout, but multiple pins trail the current release, including one security-relevant gap: **next 16.2.10 installed vs 16.2.12 latest** — the 16.2.11 release of 2026-07-21 patched 9 CVEs (4 High, incl. middleware bypass and rewrites SSRF), so the pinned version carries known High-severity advisories. Also behind: react/react-dom 19.2.4 vs **19.2.8** (2026-07-21); prisma/@prisma/client 7.8.0 vs **7.9.1**; @tiptap/* 3.27.3 vs **3.29.2**; @playwright/test 1.61.1 vs **1.62.0**; tailwindcss 4.3.2 vs **4.3.3**; lucide-react 1.24.0 vs **1.28.0**; isomorphic-dompurify 3.18.0 vs **3.20.0**; better-sqlite3 12.11.1 vs **13.0.2** (one major behind); typescript **5.9.3 vs 7.0.2** (7.0 went GA 2026-07-08) — a full major behind and also behind this repo's own architecture pin. At latest: zod 4.4.3, vitest 4.1.10. Scored 3 ("recent major"), not 5 ("latest patch versions"). |
| Error Handling | **4** | Every Server Action returns a discriminated `ActionResult` with typed codes (`VALIDATION`/`NOT_FOUND`/`CONFLICT`/`UNIQUE`/`INTERNAL`), logs via `console.error`, and surfaces user-facing copy; Prisma `P2002` is mapped to a field-level message. Verified live: field validation, unique-slug, conflict banner (`role="alert"`), 404 route, and a search-API failure degrading to "Search failed. Try again." rather than a crash (no page errors thrown). Deduction: two recovery helpers are dead code with no call site — `ensureFtsSchema()` (`src/lib/fts.ts:18`) and `applySqlitePragmas()` (`src/lib/db.ts:39`) — so a missing FTS table is reported instead of repaired, and the architecture's `journal_mode=WAL` / `foreign_keys=ON` guarantees are never asserted at startup. |
| Iteration Logs | **5** | Six summaries (`docs/iteration-{1..6}-summary.md`, 811 lines total), each with status, exit-criteria statement, per-task breakdown, and an ID'd decisions log; deferrals are stated explicitly (e.g. It.4 "Not implemented (seed-only per architecture v1)", It.6 "`?saved=1` **Not implemented** (stretch only)"). One commit per chunk, plus a final QA report commit. |
| Verification | **5** | Self-verification is real and reproduced by this evaluation: 42 unit tests, 5 Playwright E2E on an isolated `prisma/test.db` (`pretest:e2e` migrates + seeds), clean lint, successful production build, plus `docs/qa-report.md` documenting 33 interactive checks. Independent re-run reproduced all four command results; no claimed passing artifact failed on re-execution. |
| UX Adherence | **4** | Faithful to `design-spec.md`: token block matches §5.1 values exactly at runtime; routes S1–S7 all exist; copy deck strings match §8 verbatim ("All articles", "Save changes", the delete-confirm sentence, conflict sentence, every empty-state title/description); layout matches §2/§4.5 (`max-w-5xl` shell, `max-w-3xl` prose/form, sticky `top-0 z-40` header, filter rail from `md`, mobile selects); `h-10` controls, skip link, `main#main-content`, single `h1`, `role="search"`, 2 px focus outline on rows, `prefers-reduced-motion` rule present, Draft-only badge policy (§3.5). Two verified deviations: (a) the create form preselects **Draft** while the S4 wireframe shows Published preselected (`src/app/articles/new/page.tsx:26`); (b) `/search` nests `max-w-5xl px-4` inside `AppShell`'s identical wrapper, double-padding the content measure against §4.5. |

**Math:** 5 + 5 + 3 + 4 + 5 + 5 + 4 = **31** (max 35). 31 × 1.43 = **44.33 / 50**.

---

## Pass/Fail Gates

| Gate | Result | Reason |
|------|--------|--------|
| MVP flows work (browse→search→edit E2E) | **PASSED** | Full journey executed in headless Chromium: list → detail → header typeahead → `/search` → edit → save → verified detail; plus create, delete, filters, pagination. |
| Local runs (`npm start` / documented setup) | **PASSED** | README setup reproduced; `npm run dev` serves on :3000; `npm run build` + `npm start` path builds successfully. |
| No critical bugs (crashes, data loss) | **PASSED** | Zero uncaught page errors across all exploratory sessions; no crash, no data loss; delete/edit/conflict paths behave correctly. The unseeded-DB search 500 degrades gracefully with a user-facing message and is not a crash or data-loss condition. |
| Follows Planner chunks (no massive deviations) | **PASSED** | Iterations 1–6 delivered in order; only backlog-designated stretch items omitted; no §1.3 non-goals implemented. |
| Implements UX designer's spec | **PASSED** | Layout, tokens, iconography, and all designed states/copy implemented; deviations limited to one default-selection mismatch and one cosmetic padding duplication. |

---

## Audit

**Chunks completed:** 6 / 6 planned (backlog §2 iterations 1–6).

**Bugs found (evaluator-verified, independent of `docs/qa-report.md`):**

| ID | Severity | Finding |
|----|----------|---------|
| E1 | Minor–Major (setup fragility) | FTS table is bootstrapped only by `prisma/seed.ts`. On a migrated-but-unseeded database, `/api/search` returns HTTP 500 and `/search` renders "Search failed. Try again."; browse/edit still work. `ensureFtsSchema()` in `src/lib/fts.ts:18` would fix this but is never called from `src/**`. |
| E2 | Minor (security hygiene) | Pinned `next@16.2.10` predates 16.2.11 (2026-07-21), which patched 4 High-severity CVEs; `better-sqlite3` and `typescript` are each a major behind current. |
| E3 | Minor | `applySqlitePragmas()` (`src/lib/db.ts:39`) has no call site, so WAL / `foreign_keys=ON` are not guaranteed at startup as architecture §9.1 states. |
| E4 | Minor (UX drift) | Create form defaults to Draft; design S4 wireframe shows Published preselected. |
| E5 | Cosmetic | `/search` double horizontal padding (`max-w-5xl px-4` nested inside `AppShell`). |
| E6 | Minor (console noise) | `[tiptap warn]: Duplicate extension names found: ['link']` on every create/edit render, reproduced in dev and during E2E. |
| E7 | Minor (test gap) | No coverage instrumentation installed; delete, conflict, unique-slug, and pagination paths have no automated tests (all verified manually here and passing). |
| E8 | Minor (build noise) | `npm run build` emits a Turbopack NFT trace warning via `next.config.ts → src/lib/db.ts → src/lib/fts.ts → /api/search` (`readFileSync` of the FTS SQL). Build succeeds. |

**Verification appendix**

```text
Node v25.4.0 (README prefers 24.x; engines.node ">=24.0.0" permits)
npm test                    → 42 passed / 7 files
npm run lint                → exit 0
npm run build               → success (1 Turbopack NFT warning)
CI=1 npm run test:e2e       → 5 passed
npm run dev                 → Next.js 16.2.10 ready on :3000
Evaluator exploratory suite  → 73 checks over 3 viewports (1280 / 768 / 390)
                               and 3 DB states (seeded, 28-article, empty)
Pagination proof             → page 1 = 20 rows, page 2 = 8 rows, "Showing 8 of 28"
XSS probe                    → <script>, javascript: href, and onerror stripped; window.__pwned undefined
```

*Temporary databases created for pagination and empty-state verification were deleted; the working tree was left clean.*

**Sources (live version verification, 2026-07-30):** [Next.js July 2026 Security Release](https://nextjs.org/blog/july-2026-security-release) · [React v19.2.8 release](https://github.com/react/react/releases/tag/v19.2.8) · [TypeScript 7.0 GA](https://www.digitalapplied.com/blog/typescript-7-0-ga-native-compiler-migration-playbook-2026) · npm registry (`npm view <pkg> version`) for next, react, prisma, tailwindcss, typescript, zod, vitest, @playwright/test, @tiptap/react, lucide-react, better-sqlite3, isomorphic-dompurify.
