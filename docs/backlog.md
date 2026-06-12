# Implementation Backlog — Simplified Knowledge Base App (v1)

**Status:** Approved for execution
**Date:** 2026-06-11
**Sources of truth:** `docs/product-brief.md`, `docs/architecture.md`, `docs/design-spec.md`

This backlog turns the approved architecture and design specs into six sequential developer iterations. Each iteration is a self-contained run: it has a clear goal, a concrete task list (in `docs/iterations/iteration-N.md`), and leaves the codebase in a working, demonstrable state. A developer should be able to execute any iteration without asking clarifying questions — where a task needs detail, it points at the exact normative section of the architecture or design spec.

---

## 1. MVP scope definition

### In scope (v1 MVP — required by the brief)

| # | Feature | Brief reference | Where it lands |
|---|---|---|---|
| 1 | Article browsing + article detail pages | Required feature 1 | Iterations 3 |
| 2 | Search across titles and content (dropdown + full results page, FTS5) | Required feature 2 | Iterations 2 (backend), 4 (UI) |
| 3 | Basic editing for all articles (Markdown + live preview, create/edit/delete) | Required feature 3 | Iterations 2 (backend), 5 (UI) |
| — | Non-functional: responsive desktop/tablet, empty states, form validation, accessible interactions + AA contrast, reasonable performance | Brief non-functional expectations | Built into iterations 3–5; verified in 6 |
| — | **Testing (MVP per brief v2 update):** unit tests for core logic **and** basic Playwright E2E for the critical journey (browse → search → edit) | Brief testing scope | Unit tests in iterations 2 and 5; E2E in iteration 6 |
| — | Deliverables: seed data, local run docs, verification notes, decisions log | Brief required deliverables | Iterations 1 and 6 |

### Out of scope (stretch / post-MVP — per brief and architecture §12)

| Feature | Status | Notes |
|---|---|---|
| Category / tag organization (brief feature 4) | Post-MVP | Schema leaves an additive migration path (tags join table). See §4 below. |
| Draft/published status (brief feature 5) | Post-MVP | Additive `status` column; `Badge` primitive already reserved for it. |
| Authentication / user identity | Post-MVP | Brief: "basic security assumptions only." |
| Full accessibility audit, exhaustive E2E edge cases | Explicitly not MVP | Brief marks these design-only / not-MVP. |
| Dark mode, toasts, pagination, sort/filter controls, editor toolbar, scroll-sync, undo/trash | Already decided out | Design spec §8.4 and §10 — do not re-open these. |

---

## 2. Iteration plan overview

| # | Title | Goal | Working state at the end |
|---|---|---|---|
| 1 | Foundation: scaffold, database, seed | Repo structure, pinned dependencies, Drizzle schema + FTS5 migration, DB singleton, seed script, test harness config, quality gate | `npm run dev` boots a placeholder page; `npm run db:seed` creates and fills the DB; `npm run check` passes |
| 2 | Data layer and REST API | Repo module (CRUD + FTS search + sanitizer), shared Zod validation, all six API endpoints with the error contract, **unit tests for all of it** | Full API is functional and unit-tested; exercisable with curl/Playwright `request` |
| 3 | UI foundation and browse/read flow | Design tokens, icon set, six UI primitives, global layout + header, home list (S1), article detail (S2), 404 (S6), empty states | Browse flow works end-to-end on seeded data, responsive at all three breakpoints |
| 4 | Search experience | `SearchBox` dropdown (debounce, keyboard combobox, all states), `/search` results page (S3) with highlights and empty/instruction states | Search flow works end-to-end on both surfaces |
| 5 | Editing, create, and delete | `ConfirmDialog`, `ArticleEditor` (split pane / tabs, validation UX, dirty guard), new (S4) and edit (S5) pages, detail-page Edit/Delete actions, editor component test | Every brief-required feature is usable in the UI; unit + component tests green |
| 6 | E2E tests, QA pass, verification | Playwright critical-journey spec + secondary specs, state-coverage QA sweep, `docs/verification.md`, README finalization | All quality gates green; deliverables complete; app demo-ready |

Sizing rationale: the brief demands finishability in ~1–2 sessions across multiple developer runs. Six runs of 5–9 tasks each keeps every run focused on one layer or one feature, and no run depends on an unfinished sibling.

---

## 3. Dependency and sequencing notes

**Critical path:** 1 → 2 → 3 → 4 → 5 → 6. Every iteration depends on all previous ones; there is no parallel track (single developer, sequential runs).

Key edges and why the order is what it is:

- **1 → 2:** the repo module and its unit tests need the Drizzle schema, the FTS5 migration (architecture §11), and the in-memory-DB test setup from iteration 1. The seed script ships in iteration 1 (not 2) because every later iteration needs demo data to leave the app in a demonstrable state.
- **2 → 3:** RSC pages call `src/lib/repo/articles.ts` directly (architecture §6.1), so the read pages cannot render real data until the repo exists. Building the API first also means the backend is unit-tested before any UI consumes it.
- **3 → 4 and 3 → 5:** both feature iterations consume the primitives (`Button`, `Input`, `EmptyState`, icons), the tokens, the header, and `ArticleBody`. Search (4) precedes editing (5) because search is the brief's flagship interaction and the dropdown lives in the header built in 3 — finishing it removes the one interim stub in the app (see decisions log #4).
- **Within 3:** the article-detail page ships **without** Edit/Delete buttons; those arrive in iteration 5 with the routes and dialog they target. This avoids dead links and keeps iteration 3's end state fully working (decision #5).
- **5 → 6:** the Playwright critical journey (browse → search → edit) requires every UI feature; E2E earlier would test stubs. Unit tests are *not* deferred — they ship inside iterations 2 and 5 alongside the code they cover (decision #3).
- **Blocking artifacts created once, in iteration 1:** `playwright.config.ts` and `vitest.config.ts` are configured up front (even though E2E specs land in 6) so no later iteration touches project plumbing.

---

## 4. Stretch and post-MVP phasing

Where the out-of-scope features fit later, so v1 decisions don't paint us into a corner:

| Future feature | Phasing | Prepared-for in v1 |
|---|---|---|
| Categories / tags (brief feature 4) | First post-MVP iteration. Additive migration: `tags` table + `article_tags` join; filter UI on S1; tag chips via `Badge`. | Repo is the only DB-touching module; `Badge` and `EmptyState` primitives exist; the brief's "missing categories" empty state reuses the §5 design pattern. |
| Draft/published status (brief feature 5) | Second post-MVP iteration. Additive `status` column (default `published`); status `Badge` on cards/detail; publish toggle in editor; list/search filter to published by default. | Schema is additive (architecture §12.2); editor form is the natural home for the control. |
| Auth / identity | Only if the app leaves the trusted network. Revisit architecture §10 security row first. | Stateless app layer; no identity assumptions baked into UI (no avatars/authors, design §8.4). |
| Postgres scale-out | Only if load outgrows SQLite. Swap Drizzle dialect + replace FTS5 with `tsvector` — both isolated behind `repo/articles.ts`. | Architecture §4.3 scale-out path; no other module touches SQL. |
| Optimistic concurrency on edits | Cheap follow-up if concurrent edits start colliding: `updatedAt` check on `PUT` (architecture §12.4). | API contract already returns `updatedAt`. |
| Full a11y audit, exhaustive E2E coverage, dark mode | Backlog candidates after features 4–5; explicitly not-MVP per brief. | AA tokens and semantic structure from design §6–7 make the audit incremental, not a rebuild. |

---

## 5. Decisions log (sequencing and scoping tradeoffs)

| # | Decision | Alternative rejected | Why |
|---|---|---|---|
| 1 | Six iterations: foundation → API → read UI → search UI → edit UI → E2E/QA | Fewer, bigger iterations (e.g., 3); or per-feature full-stack slices from day one | Each run stays executable in one focused session and ends in a working state. Pure vertical slices would force the foundation (tokens, primitives, DB, harness) to be rebuilt piecemeal inside feature work. |
| 2 | Backend (repo + API + unit tests) complete in iteration 2, before any real UI | Build API endpoints lazily as each screen needs them | The API contract is fixed and small (6 endpoints, architecture §6.2); finishing it once gives iterations 3–5 a stable, tested substrate and matches the strict layering rule. Iterations 3–5 then deliver user-visible value end-to-end against it. |
| 3 | Unit tests live in the same iteration as the code they test (2 and 5); E2E gets its own final iteration | A single "testing" iteration at the end for everything | Repo/validation/sanitizer tests are the cheapest time to write while the logic is fresh, and they protect iterations 3–5 from regressions. E2E genuinely cannot run before the UI exists, so it is the only testing deferred. |
| 4 | Header search input in iteration 3 is a minimal stub (submit navigates to `/search`); the full dropdown ships in iteration 4 | Build the complete SearchBox in 3; or omit search from the header until 4 | The header is part of the global layout (iteration 3), but the combobox is the app's most intricate component. A working form-submit stub keeps iteration 3 shippable without dead UI, and iteration 4 replaces it wholesale. |
| 5 | Article detail ships in iteration 3 **without** Edit/Delete buttons; actions land in iteration 5 | Render disabled/dead buttons earlier to match the design comp sooner | "Working state after each run" outranks visual completeness. Buttons that 404 or no-op would fail that bar; adding two buttons in iteration 5 is trivial. |
| 6 | Test harness configs (Vitest, Playwright, `npm run check`) are all created in iteration 1 | Configure each tool in the iteration that first uses it | Plumbing changes mid-project are where runs go sideways. One-time setup means iterations 2–6 only add spec files, never config. |
| 7 | Features 4–5 (tags, status) get zero v1 code — not even dormant schema columns | Pre-building a `status` column or tags table "while we're in there" | Brief requires only features 1–3 and makes finishability a hard constraint; architecture §12.2 confirms both are additive migrations later. Dormant schema is untested scope. |
| 8 | Exact dependency versions are taken from architecture §1 (live-verified 2026-06-10) and pinned in iteration 1 | Re-verifying versions at implementation time | The brief's live-search mandate was satisfied yesterday by the architecture spec, which is the approved source of truth. Iteration 1 pins those exact versions; if `npm install` surfaces a newer patch release, take the patch but never a new minor/major without checking the spec's compatibility notes. |
| 9 | Seed data (12 articles) ships in iteration 1, before the API exists | Seed in iteration 2 alongside the repo | Every iteration from 2 onward needs realistic data to verify against and demo with; the seed script only needs the schema, which iteration 1 creates. |

### Implementation-time addenda (appended during iteration 6)

Detailed per-iteration decisions live in each `docs/iteration-N-summary.md` decisions log; the rows below record only the cross-iteration tradeoffs made while implementing, so this log stays the single "short decisions log" entry point the brief requires.

| # | Decision | Alternative rejected | Why |
|---|---|---|---|
| 10 | Per-iteration implementation decisions are logged in `docs/iteration-N-summary.md` (1–6), not duplicated here | Mirroring every row into this table | Keeps this log short (brief: "short decisions log") while every decision stays discoverable one link away. |
| 11 | E2E determinism via **content-level reset**: tests open `data/kb-e2e.sqlite` directly (better-sqlite3, WAL) and delete/reinsert rows; the seed articles moved to `src/lib/seed-data.ts` so the script and the fixtures share one source | Deleting and recreating the DB file before each run | The Playwright `webServer` holds the file open — Windows refuses the delete, and the architecture's WAL setup already makes cross-process row-level access safe. The seed script's behavior is unchanged. |
| 12 | E2E specs run serially (`workers: 1`), each resetting the DB state it needs | Per-worker servers and databases for parallelism | All specs share one server and one SQLite file; 8 tests finish in ~30 s, so parallel infrastructure would be pure complexity. Specs stay order-independent because each resets its own state. |

---

## 6. Iteration files

- `docs/iterations/iteration-1.md` — Foundation: scaffold, database, seed
- `docs/iterations/iteration-2.md` — Data layer and REST API
- `docs/iterations/iteration-3.md` — UI foundation and browse/read flow
- `docs/iterations/iteration-4.md` — Search experience
- `docs/iterations/iteration-5.md` — Editing, create, and delete
- `docs/iterations/iteration-6.md` — E2E tests, QA pass, verification
