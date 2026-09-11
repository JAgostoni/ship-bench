# Implementation Backlog — Simplified Knowledge Base App

**Status:** Ready for execution
**Author:** Senior Engineering Planner
**Date:** 2026-09-11
**Source of truth:** [`product-brief.md`](./product-brief.md), [`architecture.md`](./architecture.md), [`design-spec.md`](./design-spec.md)

This backlog turns the three approved context documents into a sequential, executable plan. It introduces **no new product or technical decisions**. Where the architecture spec or design spec already closed a decision (`[DECISION]`), this document references it rather than restating the reasoning.

**How to use it**

1. Read this file end to end once.
2. Execute iterations in order: [`iterations/iteration-1.md`](./iterations/iteration-1.md) → [`iteration-8.md`](./iterations/iteration-8.md).
3. Each iteration ends in a working, committed state. Do not start iteration *N+1* until iteration *N*'s "Definition of done" passes.
4. Any deviation from the architecture or design spec gets recorded in [§5 Decisions log](#5-decisions-log) **and** in the source document, not silently.

---

## 1. MVP scope definition

### 1.1 In scope (required by the brief)

The brief names five candidate features and requires the first three. The architecture spec models features 4 and 5 in the schema/API but deliberately minimizes their UI (`architecture.md` §9.6, `[DECISION]`).

| # | Feature | Brief status | Backlog priority | Iterations |
|---|---|---|---|---|
| F1 | Article browsing + article detail pages | **Required v1** | **P0** | 4, 5 |
| F2 | Search across article titles and content | **Required v1** | **P0** | 6 |
| F3 | Basic editing for all articles (Markdown + live preview) | **Required v1** | **P0** | 7 |
| F4 | Category organization | Not required v1; modeled + minimal UI | **P1** | 4, 5, 7, 8 |
| F5 | Draft/published status | Not required v1; modeled + minimal UI | **P1** | 4, 5, 7, 8 |

**Priority meaning**

- **P0** — the brief's required v1 scope. If the session runs short, P0 is what ships.
- **P1** — schema and API are mandatory (retrofitting them into a live FTS5 index is materially more expensive than building them now); the *UI* is cuttable. `architecture.md` §9.6: *"cut the UI (the filter chips and the status select), never the schema or the API."*

### 1.2 MVP definition of done

From `architecture.md` §18:

- `npm run verify` passes (typecheck → lint → format:check → unit/integration tests → build).
- `npm run test:e2e` passes on both Playwright projects (`desktop-chromium`, `tablet-webkit`).
- A human can browse → search → edit → reload and see the change persisted.

### 1.3 MVP testing scope (verbatim from the brief)

The brief's v2 testing scope is a hard boundary. **Do not add or remove testing scope.**

| Layer | In MVP? | Tool | Coverage target |
|---|---|---|---|
| Unit tests for core logic | **Yes — MVP** | Vitest 5 (node env) | ≥90% of `src/lib/**` |
| Integration tests (real SQLite, no mocks) | **Yes — MVP** | Vitest 5 (node env) | ≥85% of `src/server/**` |
| Component tests | **Yes — MVP** (enabler for the form/E2E) | Vitest 5 + jsdom + Testing Library | `ArticleForm`, `SearchInput`, `Pagination`, empty states, `Highlight` |
| Basic E2E/integration for critical journeys (browse → search → edit) | **Yes — MVP** | Playwright 1.63.0 | The 5 journeys in `architecture.md` §11.4 |
| Full accessibility audits | **Not MVP** | — | axe smoke only, on `/`, `/search`, `/articles/[slug]` |
| Exhaustive E2E edge-case coverage | **Not MVP** | — | Explicitly out of scope (validation permutations, pagination boundaries, revision diffing, category CRUD, theme switching, cross-browser beyond Chromium + WebKit) |

### 1.4 Explicitly out of MVP

- Authentication / authorization (`architecture.md` §16.1 A1, §15.2).
- Tags (many-to-many), nested categories, taxonomy admin screen.
- Image/file uploads, comments, notifications, email.
- Real-time collaborative editing, presence, live cursors.
- Revision diffing and restore-from-revision (history is view-only).
- Category rename/delete (`design-spec.md` §4.4 `[DEFERRED]`).
- Nonce-based CSP via `proxy.ts` (`architecture.md` §12.6).
- `cacheComponents` / `use cache` (`architecture.md` §8.9, D14).
- Postgres migration, horizontal scale-out.
- i18n/l10n, offline/PWA, analytics/APM.
- Phone-optimized layout (tablet 768–1023px is the stated floor).
- Full WCAG 2.1 AA audit with screen-reader testing.
- Docker, Kubernetes, Terraform, message queues, microservices.

---

## 2. Iteration plan overview

Eight iterations. Each is one focused developer run that leaves `main` green.

| Iter | Title | Goal | Primary scope | Depends on |
|---|---|---|---|---|
| **1** | Foundation: repo, toolchain, database, seed | A clone runs `npm install && npm run db:setup && npm run dev`, shows a styled page, and every quality gate (`verify`) passes. The data layer is real, migrated, seeded, and queryable from a script. | Scaffold, pinned deps, TS/ESLint/Prettier/PostCSS configs, Tailwind tokens, Drizzle schema + migration, DB client + FTS5 bootstrap, env validation, idempotent seed, `db:*` scripts, `npm run verify` gate, CI skeleton | — |
| **2** | Domain core: pure logic + unit tests | Every pure function the app depends on exists and is unit-tested to the brief's MVP standard. No I/O, no React. | `types/domain.ts`, `lib/result`, `lib/errors`, `lib/slug`, `lib/markdown`, `lib/highlight`, `lib/fts`, `lib/format`, `lib/cn`, all Zod schemas, Vitest `projects` config, coverage thresholds | 1 |
| **3** | Repository layer + integration tests | All SQL is confined to `src/server/repositories/**`, tested against a real migrated SQLite temp DB, including FTS5 triggers, transactions, optimistic concurrency, and revision pruning. | `createTestDb`, factories, `articles`, `categories`, `revisions`, `search` repositories, unit-test suite | 2 |
| **4** | Design system, app shell, browse + detail | A user can open `/`, see seeded articles, click one, and read rendered Markdown — with the full three-region shell, both themes, all five empty states, and a not-found page. | `ui/*` primitives, `layout/*` shell, `globals.css` tokens wired, `ArticleCard`/`ArticleList`/`ArticleHeader`/`ArticleBody`, `/`, `/articles/[slug]`, `loading.tsx`, `not-found.tsx`, `error.tsx` | 3 |
| **5** | Search, filters, pagination, JSON API reads | A user can search titles and content, see highlighted snippets and a live result count, filter by category/status, and paginate — all URL-driven and server-rendered. | `SearchInput`, `SearchResults`, `Highlight`, `CommandPalette`, `FilterBar`, `CategoryChips`, `Pagination`, `/search`, `/categories/[slug]`, `GET /api/articles*`, `GET /api/search`, `GET /api/categories`, `GET /api/health` | 4 |
| **6** | Editing: Server Actions, editor, concurrency, history | A user can create and edit any article in Markdown with live preview, save it, and see the change persist across a reload — with validation, conflict handling, and view-only history. | `app/actions/articles.ts`, `ArticleForm`, `MarkdownEditor`, `StatusBadge`, `ArchiveArticleButton`, `RevisionList`, `EditingAsChip`, `/articles/new`, `/articles/[slug]/edit`, `POST/PATCH/DELETE /api/articles*`, `POST /api/categories`, `POST /api/test/reset` | 5 |
| **7** | E2E suite + CI hardening | The five critical journeys pass on both Playwright projects, and CI runs the identical gate a developer runs locally. | `e2e/fixtures/seed.json`, `global-setup.ts`, `browse/search/edit/empty-states/responsive` specs, `helpers/a11y.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `pull_request_template.md` | 6 |
| **8** | Hardening, docs, verification evidence | Performance budgets measured, security checklist verified, responsive matrix and state matrix walked, README + decisions log written, and every verification claim is backed by a command or artifact. | Perf measurement, security pass, a11y/contrast verification, responsive sweep, `README.md`, `docs/decisions-log.md`, `docs/verification-notes.md`, screenshots, `docs/future-work.md` | 7 |

**Why this shape.** Iterations 1–3 build a fully tested, headless application core — at the end of iteration 3 every feature the app needs is already proven at the data layer, so the UI iterations cannot be blocked by a broken query. Iterations 4–6 each deliver one complete user-visible capability end to end (browse → search → edit), which matches the brief's stated core loop and its MVP E2E scope. Iteration 7 is testing only, so it lands after the last behaviour change. Iteration 8 produces the evidence the brief's "Required deliverables" list asks for.

**Dependency chain (critical path):** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.

---

## 3. Dependency and sequencing notes

### 3.1 Hard blockers (task A cannot start until task B is done)

| Blocker | Unblocks | Why |
|---|---|---|
| Iter 1 · pinned `package.json` + `npm install` | Everything | Every other task imports these packages. |
| Iter 1 · `drizzle/0000_init.sql` generated, hand-edited with the `CHECK` constraint, applied | All repository work | The `CHECK` must be added **before** the first `db:migrate`; retrofitting it costs a table rebuild (`architecture.md` §8.5). |
| Iter 1 · `search-index-ddl.ts` + `ensureSearchIndex()` | Iter 3 search repository | Without the FTS5 virtual table and its three triggers, `MATCH` returns nothing. |
| Iter 1 · `createTestDb()` | Iter 3 integration tests | Real-DB tests need a migrated temp file with FTS5 bootstrapped. |
| Iter 2 · `lib/fts.ts` (`toFtsQuery`) | Iter 3 `searchRepository` | Malformed input raises `SqliteError`; the preprocessor is load-bearing, not defensive (`architecture.md` §3.5). |
| Iter 2 · `lib/highlight.ts` (`splitSegments`) | Iter 3 `searchRepository`, Iter 5 `Highlight` | Converts FTS5 sentinel output into `{ text, match }[]`. |
| Iter 2 · `lib/validation/*` | Iter 3 repositories, Iter 5 route handlers, Iter 6 forms | Single source of truth for payload shapes, imported by client and server. |
| Iter 2 · `lib/result.ts` (`ok`/`err`) | Iter 3 repositories | The discriminated union every repository returns. |
| Iter 3 · repositories | Iterations 4–6 | All reads and writes go through the repository layer. |
| Iter 3 · `src/test/db.ts` + `factories.ts` | Iter 3, 5, 6 test tasks | Test isolation default. |
| Iter 4 · `ui/*` primitives | Iterations 5–6 | `Field`, `Button`, `EmptyState`, `Dialog`, `Skeleton` are used by every later screen. |
| Iter 4 · `globals.css` tokens | Iterations 4–6 | Every component references the tokens; there is no `tailwind.config.js`. |
| Iter 4 · `layout.tsx` shell | Iterations 5–6 | Routes compose inside it. |
| Iter 5 · `SearchInput` + `Highlight` | Iter 7 `search.spec.ts` | The E2E spec types into the real input and asserts on real `<mark>` elements. |
| Iter 6 · Server Actions + `ArticleForm` | Iter 7 `edit.spec.ts` | The E2E spec exercises the real form and the real persistence path. |
| Iter 6 · `POST /api/test/reset` | Iter 7 all specs | Per-spec isolation depends on it. |
| Iter 6 · `POST /api/health` (from Iter 5) reachable | Iter 7 `global-setup.ts` | Playwright's `webServer` waits on `/api/health`. |

### 3.2 Soft sequencing guidance

- **Write unit tests in the same task that writes the function** for iterations 2 and 3. These are pure functions and repositories; the tests are fast and catch the bugs this architecture actually has (`architecture.md` §11.1).
- **Do not defer the `server-only` module split.** `db/create.ts`, `db/search-index-ddl.ts`, and `lib/env.ts` must omit `import 'server-only'` from the first commit, or every `tsx` script and every Vitest file crashes at import (`architecture.md` §8.4, D26).
- **Do not defer the FTS5 triggers.** A repository test asserting that an `UPDATE` to `body_md` changes `MATCH` results is the only thing that catches a broken trigger (`architecture.md` §9.2).
- **Iteration 4 must land `not-found.tsx` and the five empty states together with the list.** The design spec forbids any blank list surface (§7.3), so shipping the list without its empty state is an incomplete task, not a smaller one.
- **Iteration 5 depends on iteration 4's `ArticleCard`**, because search results reuse it.
- **Iteration 6's conflict path needs iteration 3's `CONFLICT` result and iteration 2's `articleUpdateSchema`.** Both must be complete first.

### 3.3 Risk watch list (from `architecture.md` §15.3, mapped to iterations)

| Risk | Iter | Mitigation baked into the plan |
|---|---|---|
| `drizzle-kit` emits an unexpected migration for the `CHECK` constraint | 1 | Hand-edit `0000_init.sql` before the first apply, then regenerate the snapshot (§8.5). |
| FTS5 triggers drift from `articles` | 1, 3 | Integration test asserting update/delete reflection; `npm run db:reindex`. |
| `better-sqlite3` native build failure | 1 | N-API prebuilds in v13; documented Python 3 + C compiler fallback. |
| Editor bundle bloats the browse route | 6, 8 | `next/dynamic` with `ssr: false`; bundle sizes inspected in iteration 8. |
| Playwright flakes from shared SQLite state | 7 | `workers: 1` in CI, per-spec reset, separate `kb.e2e.db`. |
| Optimistic-concurrency UX confuses users | 6 | Copy-to-clipboard escape hatch; revisions make every save recoverable. |

---

## 4. Stretch and post-MVP phasing

The brief's stretch deliverables are folded into iteration 8 rather than treated as optional extras, because the brief lists them as evidence for later review.

### 4.1 Stretch deliverables (produced in iteration 8)

| Stretch deliverable | Where it lands |
|---|---|
| Data model sketch | `docs/backlog.md` §6 (entity table + relationship sketch) and the schema section of `README.md` |
| Deployment / local run notes | `README.md` + `docs/verification-notes.md` |
| Screenshots or walkthrough notes | `docs/screenshots/` (committed) + a walkthrough section in `docs/verification-notes.md` |
| Future work list | `docs/future-work.md` |

### 4.2 Post-MVP phases

Ordered by the architecture spec's own scale-out and hardening sequence (`§8.9`, `§15.2`, `§15.4`).

| Phase | Items | Fits when |
|---|---|---|
| **Phase 2 — Harden the current design** | Nonce-based CSP via `src/proxy.ts` (§12.6); enable `cacheComponents` + `'use cache'` on `getCategories()` / `getArticleBySlug()` with `revalidateTag('articles')` (§8.9 step 1); full WCAG 2.1 AA audit with screen-reader testing (§15.4 item 10). | The internal deployment becomes reachable by anyone outside the immediate team, or read traffic grows. |
| **Phase 3 — Content-owner depth** | Category rename/delete (`design-spec.md` §4.4); revision diff view + one-click restore (§15.4 item 5); tags as a many-to-many relation alongside categories (§15.4 item 2); image uploads via `public/uploads/` + a `media` table (§15.4 item 3); comments/inline review notes (§15.4 item 4). | Content owners ask for them; each is additive and needs no schema rewrite. |
| **Phase 4 — Access control** | Authentication (`better-auth` 1.7.4 or Auth.js 4.24.15) + `users`/`sessions` tables + `created_by`/`updated_by` FKs; `src/proxy.ts` redirect; authorization enforced in the repository layer (§15.2). | The app must be exposed beyond a trusted internal network. |
| **Phase 5 — Scale out** | Postgres via `drizzle-orm/node-postgres` + `tsvector`/`tsquery` replacing the FTS5 repository; multiple stateless replicas behind a load balancer (§8.9 steps 2–3). | A second app instance is needed, or the corpus passes ~50,000 articles (offset pagination limit). |
| **Phase 6 — Search quality** | Porter stemming, `trigram` tokenizer for typo tolerance, multi-language support (§15.4 item 6, §9.2 constraints). | Users report missed matches that prefix matching does not cover. |
| **Phase 7 — Distribution** | Static HTML/PDF export for offline distribution (§15.4 item 9); i18n/l10n; PWA/offline. | Explicit product request. |

---

## 5. Decisions log

Sequencing and scoping tradeoffs made **in this backlog**. Technical decisions (D1–D26) live in `architecture.md` §17; design decisions (UX1–UX22) live in `design-spec.md` §12.

| # | Decision | Alternatives considered | Resolution | Rationale |
|---|---|---|---|---|
| **B1** | Number of iterations | 4 fat iterations; 12 thin ones; the 13 numbered steps in `architecture.md` §18 as-is | **8 iterations** | §18 is a *file-level* build order; several of its steps leave the app unrunnable (e.g. step 4 adds repositories with no route to call them). 8 iterations maps one-to-one onto testable milestones while keeping the §18 dependency order intact. |
| **B2** | Where the data layer lands | Schema in iteration 1, repositories in iteration 3 | **Split across 1 and 3** | Iteration 1 must prove the toolchain end to end (migrate → seed → query), but repositories depend on the domain types, result union, and Zod schemas that are themselves unit-testable work. Splitting keeps iteration 1 focused on "can we run this at all". |
| **B3** | Where unit tests are written | One dedicated testing iteration; in the same task as the code | **Same task as the code (iterations 2–3)** | These are pure functions and real-DB repositories. Co-locating the test with the function is cheaper and catches the FTS-trigger and transaction bugs that a later pass would miss (`architecture.md` §11.1). |
| **B4** | Where E2E lands | One spec per iteration alongside its feature; all in one final iteration | **All in iteration 7** | Playwright specs mutate shared state and need the reset endpoint, the health endpoint, and all three flows present. Writing them before iteration 6 completes would produce specs that cannot run. |
| **B5** | Browse + detail in one iteration | Separate iterations for list and detail | **One iteration (4)** | They share `ArticleCard`, `ArticleHeader`, `ArticleBody`, and the shell. Splitting them would create a task that renders a list of links to pages that 404 — no standalone user value. |
| **B6** | Categories/status P1 UI placement | A dedicated iteration for F4/F5 UI; fold into the flows that use them | **Fold into iterations 4, 5, 7, 8** | The category sidebar and status badge are shell/list/detail concerns; a standalone iteration would produce a taxonomy screen with no articles to show (`architecture.md` §9.6). |
| **B7** | Iteration 8 is not optional | Fold docs and hardening into iteration 7 | **Keep iteration 8** | The brief lists "Tests and verification notes", "Short decisions log", and screenshots as required/stretch deliverables. Deferring them to "if there's time" is how they get dropped. |
| **B8** | `POST /api/test/reset` placement | Iteration 5 (with the read API) | **Iteration 6** | It is a write endpoint that depends on the seed fixture and the article/category repositories. Iteration 5 is read-only; adding a destructive endpoint there widens that iteration's blast radius for no benefit. |
| **B9** | Component tests | Fold into iteration 7 with E2E | **Fold into iterations 5 and 6** | The brief lists component tests under MVP unit testing, and the components they cover (`SearchInput`, `ArticleForm`) are authored in those iterations. |
| **B10** | The five-journey E2E scope | Add journeys for category CRUD, theme switching, pagination boundaries | **Exactly the 5 in `architecture.md` §11.4** | The brief says "not MVP: exhaustive E2E edge-case coverage". Adding journeys would violate the testing scope the brief defines. |
| **B11** | Responsive verification | Rely on Playwright only | **Playwright (`responsive.spec.ts`) in iteration 7 *and* a manual matrix walk in iteration 8** | `design-spec.md` §13 requires verification at 360/768/834/1024/1280/1440, but Playwright projects only cover 1280×800 and 834×1112. The remaining widths need a manual pass. |
| **B12** | Perf budgets | Treat as aspirational; measure at the end only | **Measure in iteration 8 against explicit budgets, using seeded data scaled to 2,000 articles** | `architecture.md` §13.1 states numeric budgets. Measuring against the 9-article seed would prove nothing. |

---

## 6. Data model sketch (stretch deliverable)

Three SQLite tables plus one FTS5 virtual table. Full column definitions are in `architecture.md` §8.2–§8.3.

| Entity | Key columns | Notes |
|---|---|---|
| `categories` | `id`, `name` (unique, case-insensitive), `slug` (unique), `description`, `created_at`, `updated_at` | Flat. No nesting. "Uncategorized" is a UI concept, never a row. |
| `articles` | `id`, `title`, `slug` (unique), `summary`, `body_md`, `status` (`draft`/`published`/`archived`), `category_id` (FK, nullable, `ON DELETE SET NULL`), `version`, `published_at`, `archived_at`, `created_at`, `updated_at` | `version` is the optimistic-concurrency token. `id` doubles as the FTS5 `content_rowid`. |
| `article_revisions` | `id`, `article_id` (FK, `ON DELETE CASCADE`), `revision_number`, `title`, `summary`, `body_md`, `editor_name`, `change_note`, `created_at` | Append-only. Newest 20 per article retained; pruning happens inside the write transaction. |
| `article_search` (FTS5) | `title`, `summary`, `body_md`, `content = 'articles'`, `content_rowid = 'id'`, `tokenize = "unicode61 remove_diacritics 2"` | External-content: stores the inverted index only. Kept in sync by three triggers. Created by `ensureSearchIndex()`, not by Drizzle Kit (D21). |

```
categories 1 ────< articles (category_id, nullable, ON DELETE SET NULL)
articles   1 ────< article_revisions (article_id, ON DELETE CASCADE)
articles   1 ────  article_search (rowid ↔ id, trigger-maintained)
```

---

## 7. Iteration files

- [Iteration 1 — Foundation: repo, toolchain, database, seed](./iterations/iteration-1.md)
- [Iteration 2 — Domain core: pure logic + unit tests](./iterations/iteration-2.md)
- [Iteration 3 — Repository layer + integration tests](./iterations/iteration-3.md)
- [Iteration 4 — Design system, app shell, browse + detail](./iterations/iteration-4.md)
- [Iteration 5 — Search, filters, pagination, JSON API reads](./iterations/iteration-5.md)
- [Iteration 6 — Editing: Server Actions, editor, concurrency, history](./iterations/iteration-6.md)
- [Iteration 7 — E2E suite + CI hardening](./iterations/iteration-7.md)
- [Iteration 8 — Hardening, docs, verification evidence](./iterations/iteration-8.md)
