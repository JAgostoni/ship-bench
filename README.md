# Team Knowledge Base

A single-deployable, internal knowledge-base application for a small team. It lets
anyone in the team browse, search, create, and edit documentation in one place, so
knowledge stops scattering across docs, chat, and memory. The browsing and reading
flows are the primary experience for every team member; the Markdown editor with a
live preview is the secondary experience for the content owners who maintain the
articles. Everything runs from one Node process against one SQLite file — there is
no Docker, no database server, and no external service to configure.

This repository is the working application from the eight-iteration plan in
[`docs/backlog.md`](./docs/backlog.md). It is an MVP: the brief's first three
features (browse + detail, search, editing) are complete, and category organization
and draft/published status are modelled end-to-end with a deliberately minimal UI.

---

## Prerequisites

- **Node.js 24.21.0** — `.nvmrc` pins it; `nvm use` (or `nvm install 24.21.0`).
- **npm 11.19.0** — bundled with Node 24.
- No Docker, no database server, no global CLI installs.

`better-sqlite3@13.0.3` ships N-API prebuilt binaries for Windows/macOS/Linux on
x64 and arm64, so `npm install` needs **no C++ toolchain**. If a prebuild is ever
missing on an unusual platform, the install falls back to compiling the driver and
then needs **Python 3 and a C compiler** (on Windows, the Visual Studio Build Tools
"C++ build tools" workload) on `PATH`.

Playwright downloads Chromium and WebKit during `npm install` via the `postinstall`
script (~400 MB). On a machine that cannot install browsers, run
`npm install --ignore-scripts` and then `npx playwright install chromium` to enable
the E2E suite only for Chromium.

---

## First run

Copy-paste from a fresh clone:

```bash
nvm use                      # Node 24.21.0
npm install                  # dependencies + Playwright browsers
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
npm run db:setup             # apply commits + seed the sample content
npm run dev                  # http://localhost:3000
```

**Expected first-run result.**

- `/` shows **4 categories** in the sidebar and **7 published articles** in the list
  (2 drafts are excluded by default, per `design-spec.md` UX8).
- Searching `deploy` returns **3 results**, with the matched term highlighted.
- Clicking any article opens its rendered Markdown page (headings, fenced code,
  tables, and task lists all render as real elements, not literal syntax).

---

## Day-to-day commands

| Goal                        | Command                              |
| --------------------------- | ------------------------------------ |
| Start the dev server        | `npm run dev`                        |
| Wipe and re-seed local data | `npm run db:reset`                   |
| Inspect data in a GUI       | `npm run db:studio` (Drizzle Studio) |
| Rebuild the search index    | `npm run db:reindex`                 |
| Verify DB integrity         | `npm run db:check`                   |
| Snapshot the database       | `npm run db:backup`                  |
| Run everything CI runs      | `npm run verify`                     |
| Debug an E2E failure        | `npx playwright show-report`         |

## Scripts reference

| Script                     | Runs                                                                   |
| -------------------------- | ---------------------------------------------------------------------- |
| `dev`                      | `next dev`                                                             |
| `build`                    | `next build`                                                           |
| `start`                    | `next start`                                                           |
| `typecheck`                | `tsc --noEmit`                                                         |
| `lint` / `lint:fix`        | `eslint .` / `eslint . --fix`                                          |
| `format` / `format:check`  | `prettier --write .` / `prettier --check .`                            |
| `db:generate`              | `drizzle-kit generate`                                                 |
| `db:migrate`               | `tsx scripts/db-setup.ts` (migrate + FTS5 bootstrap)                   |
| `db:seed`                  | `tsx scripts/seed.ts`                                                  |
| `db:setup`                 | `db:migrate && db:seed`                                                |
| `db:reset`                 | `tsx scripts/db-setup.ts --fresh --seed`                               |
| `db:reindex`               | `tsx scripts/db-setup.ts --reindex`                                    |
| `db:check`                 | `tsx scripts/db-setup.ts --check`                                      |
| `db:backup`                | `tsx scripts/backup.ts`                                                |
| `db:fixture`               | `tsx scripts/export-fixture.ts` (regenerates `e2e/fixtures/seed.json`) |
| `test` / `test:run`        | Vitest watch / once                                                    |
| `test:coverage`            | Vitest with v8 coverage + thresholds                                   |
| `test:e2e` / `test:e2e:ui` | Playwright / Playwright UI mode                                        |
| `verify`                   | `typecheck && lint && format:check && test:run && build` — the CI gate |

---

## Project structure

A trimmed view of `architecture.md` §5.1, one line of purpose per top-level
directory:

```
.
├── docs/           # brief, architecture, design spec, backlog, iterations, evidence
├── drizzle/        # generated, committed migrations (reviewable SQL)
├── e2e/            # Playwright specs, the deterministic fixture, and helpers
├── data/           # gitignored: the SQLite file and backups live here
├── scripts/        # db:*, fixture, and the verification/perf scripts
├── public/         # static assets served as-is
└── src/
    ├── app/        # Next.js App Router routes, layouts, Server Actions, route handlers
    ├── components/ # ui/ primitives, layout/ shell, articles/, search/, filters/
    ├── lib/        # pure domain logic and Zod schemas (no I/O, no React)
    ├── server/     # db/ (Drizzle schema, client, FTS5) and repositories/ (all SQL)
    ├── test/       # Vitest DB harness, factories, and the server-only stub
    └── types/      # shared domain types
```

The one structural rule worth knowing: **all SQL and the SQLite driver live behind
`src/server/**` and `scripts/**`**, enforced by an ESLint `no-restricted-imports`
rule rather than convention. Components and `lib/` cannot import `better-sqlite3`
or `drizzle-orm` without failing the lint.

---

## Data model

Three SQLite tables plus one FTS5 virtual table.

| Entity                  | Key columns                                                                                                                                                                                                               | Notes                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `categories`            | `id`, `name` (unique, case-insensitive), `slug` (unique), `description`, `created_at`, `updated_at`                                                                                                                       | Flat. "Uncategorized" is a UI concept, never a row.                                |
| `articles`              | `id`, `title`, `slug` (unique), `summary`, `body_md`, `status` (`draft`/`published`/`archived`), `category_id` (FK, nullable, `ON DELETE SET NULL`), `version`, `published_at`, `archived_at`, `created_at`, `updated_at` | `version` is the optimistic-concurrency token.                                     |
| `article_revisions`     | `id`, `article_id` (FK, `ON DELETE CASCADE`), `revision_number`, `title`, `summary`, `body_md`, `editor_name`, `change_note`, `created_at`                                                                                | Append-only. Newest 20 per article; pruned inside the write transaction.           |
| `article_search` (FTS5) | `title`, `summary`, `body_md`, external-content over `articles`                                                                                                                                                           | Kept in sync by three triggers; created by `ensureSearchIndex()`, not Drizzle Kit. |

```
categories 1 ────< articles (category_id, nullable, ON DELETE SET NULL)
articles   1 ────< article_revisions (article_id, ON DELETE CASCADE)
articles   1 ────  article_search (rowid ↔ id, trigger-maintained)
```

---

## Testing

```bash
npm run test:run         # unit + integration + component (Vitest)
npm run test:coverage    # the same, with v8 coverage and thresholds
npm run test:e2e         # Playwright, desktop-chromium + tablet-webkit
```

**In MVP scope.** Unit tests for pure logic (`src/lib/**`, ≥90% lines), integration
tests against a real migrated SQLite temp database (`src/server/**`, ≥85% lines),
component tests for the form, search input, pagination, empty states, and
highlighting, and five Playwright journeys (browse → search → edit, the empty
states, and the responsive drawer/overflow checks) across Chromium and WebKit.

**Deliberately not in scope** (quoted from the brief's "Not MVP" line):
_"Full accessibility audits or exhaustive E2E edge-case coverage."_ The automated
accessibility check is an axe **smoke** run on `/`, `/search`, and
`/articles/[slug]` only — it is not a full WCAG 2.1 AA audit, and the notes say so.
Exhaustive E2E coverage (validation permutations, pagination boundaries, revision
diffing, category CRUD, theme switching, and browsers beyond Chromium + WebKit) is
out of scope by the brief.

See [`docs/verification-notes.md`](./docs/verification-notes.md) for the full
inventory, the exact commands and exit codes, and the performance, security,
accessibility, and responsive verification results.

---

## Deployment and local run notes

The production shape is **one Node process serving `next start`, with SQLite in
`./data/`**.

```bash
npm install --omit=dev          # or install fully and build
npm run build
DATABASE_FILE=./data/kb.db \
NEXT_PUBLIC_APP_NAME="Team Knowledge Base" \
npm run start                   # http://localhost:3000
```

- **Self-initialising database.** `runMigrations()` runs from
  `src/instrumentation.ts` on every server boot and is idempotent, so a fresh clone
  or an empty database initialises itself. `npm run db:setup` remains the way to add
  the sample content.
- **Internal-network-only, because there is no authentication.** Every article is
  readable and editable by anyone who can reach the app (`architecture.md` §16.1
  A1, D19). This is the brief's "basic security assumptions only" scope, and it is
  a hard deployment bound: **do not expose this app to the public internet.**
  `architecture.md` §15.2 documents the exact auth retrofit path.
- **One process, one file.** SQLite caps the app at a single node; that ceiling is
  far above the brief's ~100 concurrent users. Multi-node requires the Postgres
  migration in `docs/future-work.md`.

**Operational commands.**

| Command              | When to use it                                                               |
| -------------------- | ---------------------------------------------------------------------------- |
| `npm run db:check`   | Before and after a deploy — `PRAGMA integrity_check` + `foreign_key_check`.  |
| `npm run db:backup`  | Before any manual migration; `VACUUM INTO ./data/backups/kb-<timestamp>.db`. |
| `npm run db:reindex` | If search results look stale — rebuilds the FTS5 index from `articles`.      |

---

## Architecture and design references

- [`docs/product-brief.md`](./docs/product-brief.md) — the brief this was built to.
- [`docs/architecture.md`](./docs/architecture.md) — technical architecture spec
  (stack, schema, API surface, decisions D1–D26).
- [`docs/design-spec.md`](./docs/design-spec.md) — UX / design direction spec
  (layout, tokens, component states, decisions UX1–UX22).
- [`docs/backlog.md`](./docs/backlog.md) — scope, iteration plan, and sequencing
  decisions B1–B12.
- [`docs/decisions-log.md`](./docs/decisions-log.md) — append-only log, including
  every deviation made during implementation.
- [`docs/verification-notes.md`](./docs/verification-notes.md) — tests, commands,
  and verification evidence.
- [`docs/future-work.md`](./docs/future-work.md) — post-MVP work, by phase.
- [`docs/screenshots/`](./docs/screenshots) — the ten captured screens.

---

## Naming conventions and commit style

**Naming** (`architecture.md` §5.2):

| Kind                 | Convention                                        | Example                                              |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| React components     | `kebab-case.tsx`, named export, PascalCase symbol | `article-card.tsx` → `export function ArticleCard()` |
| Server Actions       | verb-first camelCase, grouped per entity          | `createArticle`, `updateArticle`                     |
| Repository functions | `verbEntity`                                      | `listArticles`, `searchArticles`                     |
| Zod schemas          | `camelCaseSchema`                                 | `articleCreateSchema`                                |
| DB tables/columns    | `snake_case`, plural tables                       | `articles.body_md`                                   |
| TS domain types      | PascalCase, no `I` prefix                         | `Article`, `ArticleSummary`                          |
| Routes               | kebab-case segments, `[param]` dynamic            | `/articles/[slug]/edit`                              |
| Tests                | co-located `*.test.ts(x)`; E2E in `e2e/*.spec.ts` | `slug.test.ts`                                       |

**Commit style:** Conventional Commits — `feat:`, `fix:`, `test:`, `docs:`,
`chore:` (`architecture.md` §3.4). Commits authored by an agent include the
`Co-authored-by: Copilot App` trailer.

**Workflow:** trunk-based, short-lived `<type>/<short-slug>` branches, merged by PR.
Run `npm run verify` before every commit and `npm run test:e2e` before pushing a
UI change. Schema changes go through `src/server/db/schema.ts` → `npm run
db:generate` → review the SQL → commit both → `npm run db:migrate`; never
`drizzle-kit push` against data you care about.
