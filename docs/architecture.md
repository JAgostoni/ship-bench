# Technical Architecture Spec — Simplified Knowledge Base App

**Status:** Approved for implementation (v1)
**Author:** Senior Software Architect
**Date:** 2026-09-10
**Source of truth:** [`docs/product-brief.md`](./product-brief.md)
**Audience:** The implementing developer. This document is intended to be sufficient without follow-up questions.

---

## 0. How to read this document

- Every technology choice is pinned to an exact version that was verified against the live npm registry / vendor docs on **2026-09-10**. Versions live in [§3](#3-technology-stack-and-exact-versions).
- Anything marked **[DECISION]** is closed. Do not re-litigate it during implementation; if you disagree, record the change in the [decisions log](#17-decisions-log) and update this document.
- Anything marked **[ASSUMPTION]** is a stated default where the product brief was silent. It is safe to build against.
- Section [§16](#16-assumptions-and-non-goals) lists the non-goals so scope does not creep.

---

## 1. Executive summary

Build a **single-deployable, local-first full-stack Next.js application** backed by a **single SQLite file** with **FTS5 full-text search**. There is no separate API service, no container orchestration, no external database, and no authentication in v1.

| Concern | Decision |
|---|---|
| Application framework | Next.js 16.3.4 (App Router, React Server Components, Turbopack) |
| UI runtime | React 19.3.0 / React DOM 19.3.0 |
| Language | TypeScript 6.0.3 (strict) |
| Styling | Tailwind CSS 4.3.3 (CSS-first config) + `@tailwindcss/typography` 0.5.20 |
| Data store | SQLite via `better-sqlite3` 13.0.3 (WAL mode), file at `./data/kb.db` |
| ORM / migrations | Drizzle ORM 0.45.2 + Drizzle Kit 0.31.10 |
| Search | SQLite FTS5 external-content virtual table + triggers |
| Validation | Zod 4.6.2 (shared client + server schemas) |
| Mutations | Next.js Server Actions |
| Reads | React Server Components reading the DB directly; URL is the state container |
| Editor | Markdown editor with live preview (`@uiw/react-md-editor` 4.1.2) |
| Unit/integration tests | Vitest 5.0.0 + Testing Library, real SQLite (no DB mocks) |
| E2E tests | Playwright 1.63.0 + `@axe-core/playwright` 4.13.0 |
| Deployment target (v1) | Single Node.js 24 LTS process (`next start`) |

**Why this shape.** The brief asks for ~100 concurrent users on core read/edit flows, local-first simplicity, "future scaling straightforward," and a 1–2 session build. A single Next.js process plus SQLite in WAL mode comfortably exceeds 100 concurrent readers (SQLite handles thousands of read transactions/second on a single node) while removing every operational moving part. The repository layer isolates all SQL, so the documented scale-out path (§15.3) is a driver swap rather than a rewrite.

---

## 2. Product requirements → architecture mapping

| Brief requirement | Architecture response | Section |
|---|---|---|
| F1: Article browsing + detail pages | RSC list route `/` + detail route `/articles/[slug]`; keyset-free offset pagination; `not-found.tsx` for missing slugs | §6.2, §8.2 |
| F2: Search across titles and content | FTS5 external-content virtual table `article_search` with `bm25()` ranking and highlighted snippets | §8.1 |
| F3: Basic editing for all articles | Markdown editor with live preview, Server Action writes, optimistic concurrency, revision history | §8.2, §8.3 |
| F4: Category organization *(modeled; minimal UI)* | `categories` table + nullable `articles.category_id` FK; category filter chips + `/categories/[slug]` | §8.5 |
| F5: Draft/published status *(modeled; minimal UI)* | `articles.status` enum column + status filter; default browse view shows published only | §8.5 |
| ~100 concurrent users | Single Node process, SQLite WAL, indexed queries, bounded page sizes | §9.1, §13.1 |
| Local full-stack dev environment | One `npm install`, three npm scripts, no Docker, no external services | §12 |
| Responsive desktop + tablet | Desktop-first shell; sidebar collapses to a drawer at `<1024px`; tested at 1280×800 and 834×1112 | §13.4 |
| Clear empty states | Dedicated empty-state components for no articles / no results / no categories / no drafts | §6.5 |
| Form validation | One Zod schema per payload, enforced client-side (RHF) and server-side (Server Action) | §6.4, §7.4 |
| Accessible interactions, readable contrast | Radix primitives, semantic landmarks, ≥4.5:1 contrast, axe smoke tests | §13.5 |
| Performance for small-to-medium article sets | Explicit budgets: list render p75 < 250 ms @ 2,000 articles, search < 100 ms | §13.1 |
| Basic security only, no enterprise auth | No auth; sanitized Markdown (no raw HTML); parameterized SQL; security headers | §13.2 |
| Unit tests + Playwright E2E for critical journeys | Vitest 5 for logic/DB/components; Playwright for browse→search→edit | §10 |
| Easy to compare across runs | Deterministic seed data, stable route names, `docs/architecture.md` as the fixed contract | §12.4 |

---

## 3. Technology stack and exact versions

All versions below were resolved from the npm registry (`dist-tags.latest`) on **2026-09-10** unless noted. `package.json` must pin these exact versions (no `^` on runtime deps) so runs are reproducible and comparable.

### 3.1 Runtime

| Component | Version | Notes |
|---|---|---|
| Node.js | **24.21.0** (LTS "Krypton") | Latest LTS line as of 2026-09-10. Node 26.x is Current, not LTS — do not use. |
| npm | **11.19.0** | Bundled with Node 24.21.0. |

`.nvmrc` → `24.21.0`. `package.json` `engines.node` → `">=24.21.0 <25"`.

**Verified constraint:** `vitest@5.0.0` requires Node `^22.12.0 || ^24.0.0 || >=26.0.0`; `jsdom@30.0.1` requires `^22.22.2 || ^24.15.0 || >=26.0.0`; `eslint@10.10.0` requires `^20.19.0 || ^22.13.0 || >=24`; `vite@8.3.0` requires `^20.19.0 || >=22.12.0`. Node 24.21.0 satisfies all four.

### 3.2 Application dependencies (pinned, exact)

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.3.4 | Framework (App Router, Turbopack, Server Actions) |
| `react` | 19.3.0 | UI runtime |
| `react-dom` | 19.3.0 | DOM renderer |
| `drizzle-orm` | 0.45.2 | Typed SQL query builder + schema definition |
| `better-sqlite3` | 13.0.3 | Synchronous SQLite driver (N-API prebuilds since v13) |
| `zod` | 4.6.2 | Runtime validation, shared client/server |
| `drizzle-zod` | 0.8.3 | Derives base Zod schemas from Drizzle tables |
| `@uiw/react-md-editor` | 4.1.2 | Markdown editor + live preview pane |
| `react-markdown` | 10.1.0 | Server-side Markdown → React rendering |
| `remark-gfm` | 4.0.1 | Tables, task lists, strikethrough, autolinks |
| `rehype-sanitize` | 6.0.0 | HTML sanitization for rendered Markdown |
| `@radix-ui/react-dialog` | 1.1.23 | Accessible dialogs (delete confirm, mobile nav) |
| `@radix-ui/react-slot` | 1.3.3 | `asChild` composition for `Button` |
| `@radix-ui/react-label` | 2.1.15 | Accessible form labels |
| `cmdk` | 1.1.1 | Command palette (⌘K search) |
| `lucide-react` | 1.44.0 | Icon set |
| `next-themes` | 0.4.6 | Light/dark/system theme with no FOUC |
| `clsx` | 2.1.1 | Conditional class names |
| `tailwind-merge` | 3.6.0 | Class conflict resolution in `cn()` |
| `class-variance-authority` | 0.7.1 | Typed component variants |
| `react-hook-form` | 7.87.0 | Editor form state + client validation |
| `@hookform/resolvers` | 5.9.1 | Bridges Zod → RHF (peer allows `zod ^4.0.0`) |
| `slugify` | 1.6.9 | Title → URL slug |
| `pino` | 10.3.1 | Structured JSON logging (auto-externalized by Next) |

### 3.3 Development dependencies (pinned, exact)

| Package | Version | Purpose |
|---|---|---|
| `typescript` | **6.0.3** | See the TypeScript note below — this is deliberate |
| `@types/node` | 24.13.4 | Matches Node 24 LTS |
| `@types/react` | 19.3.0 | React types |
| `@types/react-dom` | 19.3.0 | React DOM types |
| `@types/better-sqlite3` | 9.6.0 | `better-sqlite3` 13.0.3 ships no `.d.ts`; this is required |
| `tailwindcss` | 4.3.3 | Utility CSS |
| `@tailwindcss/postcss` | 4.3.3 | PostCSS plugin for Tailwind v4 |
| `@tailwindcss/typography` | 0.5.20 | `prose` classes for rendered Markdown |
| `drizzle-kit` | 0.31.10 | Migration generation + apply |
| `eslint` | 10.10.0 | Linter (flat config) |
| `eslint-config-next` | 16.3.4 | Next.js + React + a11y rule sets |
| `typescript-eslint` | 8.70.0 | TypeScript rules (transitive via `eslint-config-next`, pinned explicitly) |
| `prettier` | 3.9.6 | Formatting |
| `prettier-plugin-tailwindcss` | 0.8.1 | Deterministic Tailwind class ordering |
| `vitest` | 5.0.0 | Unit/integration test runner |
| `@vitest/coverage-v8` | 5.0.0 | Coverage provider |
| `vite` | 8.3.0 | Required peer of `vitest@5` and `@vitejs/plugin-react@6` |
| `@vitejs/plugin-react` | 6.1.1 | React transform for component tests |
| `vite-tsconfig-paths` | 6.1.1 | Honors `tsconfig.json` `paths` in Vitest |
| `jsdom` | 30.0.1 | DOM environment for component tests |
| `@testing-library/react` | 16.3.3 | Component testing |
| `@testing-library/dom` | 10.4.1 | Peer of the above |
| `@testing-library/jest-dom` | 7.0.1 | DOM matchers |
| `@testing-library/user-event` | 14.6.7 | Realistic user interaction simulation |
| `@playwright/test` | 1.63.0 | E2E runner |
| `@axe-core/playwright` | 4.13.0 | Automated accessibility smoke assertions |
| `tsx` | 4.23.13 | Runs seed/migration TypeScript scripts without a build step |
| `dotenv` | 17.4.2 | Loads `.env.local` in scripts |
| `concurrently` | 10.0.5 | Reserved for multi-process scripts (see §12.2) |

> **TypeScript version — read this before installing.** `typescript@7.0.2` is the newest release (2026-07-08) and is the Go-native port. **Do not install it.** `typescript-eslint@8.70.0` — which `eslint-config-next@16.3.4` depends on — declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"`. Installing TypeScript 7 with npm 11 fails peer resolution outright, and TypeScript 7.0.2's published `bin` map only contains `tsc` (no `tsserver`), so editor tooling would regress. **Pin `typescript@6.0.3`** (released 2026-04-16), which is inside the supported range and satisfies Next.js 16's documented minimum of TypeScript 5.1.0. Upgrade path: when `typescript-eslint` widens its peer range to include 7.x, bump both together. Record this in the decisions log.

### 3.4 Tooling conventions

- **Package manager:** npm 11 (bundled). Do not add pnpm/yarn/Bun — reproducibility across benchmark runs matters more than install speed.
- **Module system:** ESM (`"type": "module"` in `package.json`). Config files use `.ts`/`.mjs` as appropriate.
- **Formatting:** Prettier 3.9.6, 100-char print width, single quotes, trailing commas `all`, semicolons on.
- **Linting:** ESLint 10 flat config. **`next lint` was removed in Next.js 16** — run `eslint .` directly.
- **Commit style:** Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

### 3.5 Version verification and evidence

Every version in §3.2–§3.3 was read from the live npm registry (`dist-tags.latest`) on **2026-09-10**, and the four highest-risk claims were verified by execution rather than documentation:

| Claim | Method | Result |
|---|---|---|
| `better-sqlite3@13.0.3` bundles SQLite with FTS5 | Installed the package and ran `PRAGMA compile_options` / `sqlite_compileoption_used('ENABLE_FTS5')` | SQLite **3.53.4**, FTS5 **enabled** (value `1`) |
| The external-content FTS5 design in §8.1 works | Built the exact `article_search` table + three triggers from §8.1, then inserted, updated, and deleted rows | Insert indexed; update **replaced** the old term (the trigger fires correctly); delete removed the row; `INSERT INTO article_search(article_search) VALUES ('integrity-check')` reported the index consistent with `articles` |
| bm25 title weighting and snippet/highlight sentinels behave as specified | Ran the exact query from §8.1 | Title match ranked above body match; `highlight` emitted `\u0001Deploying\u0002`; `snippet` emitted `Run the \u0001deploy\u0002 script…` |
| Raw FTS5 `MATCH` errors on malformed input, so `toFtsQuery()` is load-bearing | Passed `"`, `AND`, `foo AND`, `(unclosed` directly to `MATCH` | All four raised `SqliteError` — confirms that stripping operators and quoting every token is **required**, not defensive |
| `drizzle-kit@0.31.10` supports a `lower(name)` expression index | Generated a migration from the exact `schema.ts` in §8.3 | Emitted ``CREATE UNIQUE INDEX `categories_name_nocase_unique` ON `categories` (lower("name"));`` and the duplicate insert was rejected by SQLite |
| TypeScript 7.0.2 cannot be installed alongside `typescript-eslint@8.70.0` | `npm install --dry-run typescript@7.0.2 typescript-eslint@8.70.0 eslint@10.10.0` | **ERESOLVE**: `peer typescript@">=4.8.4 <6.1.0"`. The same command with `typescript@6.0.3` resolved cleanly |
| `server-only` throws outside the `react-server` condition | `node -e 'import "server-only"'` with and without `--conditions=react-server` | Throws under the default condition; succeeds with `--conditions=react-server` — confirms the §8.4 module split and the §11.2 test alias are both necessary |

The generated `0000_init.sql` from that run matched the SQL quoted in §8.5 line for line, including `ON DELETE set null`, `ON DELETE cascade`, and the `integer` (millisecond epoch) timestamp columns.

---

## 4. System context and component diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            Browser (desktop / tablet)                        │
│  React 19 Client Components:                                                 │
│   • MarkdownEditor (dynamic, ssr:false)   • CommandPalette (cmdk)            │
│   • FilterBar / Pagination                • DeleteConfirmDialog (Radix)      │
│   • ThemeToggle (next-themes)             • ToastRegion (aria-live)          │
└───────────────┬──────────────────────────────────────────┬───────────────────┘
                │ HTML / RSC payload (streaming)           │ fetch() JSON
                │ Server Action POST (mutations)           │ (palette search only)
┌───────────────▼──────────────────────────────────────────▼───────────────────┐
│                Next.js 16.3.4 server process (Node.js 24, Turbopack build)   │
│                                                                              │
│  ┌────────────────────────────┐   ┌──────────────────────────────────────┐   │
│  │ App Router (RSC)           │   │ Route Handlers  /api/**              │   │
│  │  /                (browse) │   │  GET  /api/articles                  │   │
│  │  /search                   │   │  GET  /api/articles/:idOrSlug        │   │
│  │  /articles/new             │   │  POST /api/articles                  │   │
│  │  /articles/[slug]          │   │  PATCH /api/articles/:idOrSlug       │   │
│  │  /articles/[slug]/edit     │   │  GET  /api/search                    │   │
│  │  /categories/[slug]        │   │  GET  /api/categories                │   │
│  └────────────┬───────────────┘   │  GET  /api/health                    │   │
│               │                   │  POST /api/test/reset  (E2E only)    │   │
│  ┌────────────▼───────────────┐   └───────────────┬──────────────────────┘   │
│  │ Server Actions ('use server')                  │                          │
│  │  createArticle / updateArticle / archiveArticle │                          │
│  │  createCategory / updateCategory / deleteCategory                          │
│  └────────────┬───────────────────────────────────┘                          │
│               │  Zod validation → repository call                            │
│  ┌────────────▼───────────────────────────────────────────────────────────┐  │
│  │ Repository layer  src/server/repositories/*                            │  │
│  │   articles.ts   search.ts   categories.ts   revisions.ts               │  │
│  │   (the ONLY place that imports Drizzle query builders)                 │  │
│  └────────────┬───────────────────────────────────────────────────────────┘  │
│               │                                                              │
│  ┌────────────▼───────────────────────────────────────────────────────────┐  │
│  │ Drizzle ORM 0.45.2  →  better-sqlite3 13.0.3 (singleton, WAL)          │  │
│  └────────────┬───────────────────────────────────────────────────────────┘  │
└───────────────┼──────────────────────────────────────────────────────────────┘
                │
        ┌───────▼────────────────────────────────────────────┐
        │  ./data/kb.db  (+ kb.db-wal, kb.db-shm)            │
        │  Tables: articles, categories, article_revisions   │
        │  FTS5:   article_search (external content)         │
        └────────────────────────────────────────────────────┘
```

**Key structural rules**

1. `src/server/db/**` and `src/server/repositories/**` are the only modules that may import `drizzle-orm` or `better-sqlite3`. Everything else consumes plain domain objects.
2. Route Handlers and Server Actions are thin: parse → validate with Zod → call a repository → map errors. No SQL, no business rules beyond orchestration.
3. `src/lib/validation/**` is the single source of truth for payload shapes and is imported by both client and server.
4. `import 'server-only'` is the first line of every module under `src/server/**` **except** the two deliberately condition-free files: `src/server/db/create.ts` and `src/server/db/search-index-ddl.ts`. Those are imported by `tsx` scripts and Vitest, which do not set the `react-server` export condition that makes `server-only` a no-op — importing it there throws at module load (§8.4).
5. `src/server/db/seed.ts` and `src/lib/env.ts` follow the same rule: no `server-only`, because `scripts/*.ts` and the test suite import them directly.

---

## 5. Repository structure and developer workflow

### 5.1 Repository tree

The Next.js application lives at the **repository root** (the brief specifies "one fixed repo starting point across runs").

```
/                                     # repository root
├── .github/
│   └── workflows/
│       └── ci.yml                    # typecheck → lint → unit → build → e2e
├── data/                             # gitignored: SQLite files live here
│   └── .gitkeep
├── docs/
│   ├── product-brief.md              # provided input (do not edit)
│   ├── architecture.md               # THIS DOCUMENT
│   ├── ux-design.md                  # peer deliverable (UX designer)
│   ├── backlog.md                    # peer deliverable (planner)
│   └── decisions-log.md              # optional long-form append-only log
├── drizzle/                          # drizzle-kit generated migrations
│   ├── 0000_init.sql
│   └── meta/
│       ├── _journal.json
│       └── 0000_snapshot.json
├── e2e/
│   ├── fixtures/
│   │   └── seed.json                 # deterministic E2E dataset
│   ├── helpers/
│   │   ├── reset-db.ts               # POST /api/test/reset wrapper
│   │   └── a11y.ts                   # axe assertion helper
│   ├── browse.spec.ts
│   ├── search.spec.ts
│   ├── edit.spec.ts
│   ├── empty-states.spec.ts
│   ├── responsive.spec.ts
│   └── global-setup.ts
├── public/
│   └── favicon.ico
├── scripts/
│   ├── db-setup.ts                   # migrate + FTS5 bootstrap + optional seed
│   ├── seed.ts                       # idempotent sample content
│   └── backup.ts                     # VACUUM INTO ./data/backups/kb-<ts>.db
├── src/
│   ├── instrumentation.ts            # runs runMigrations() once at server boot
│   ├── app/
│   │   ├── layout.tsx                # shell, ThemeProvider, skip link
│   │   ├── page.tsx                  # browse: list + search + filters
│   │   ├── globals.css               # Tailwind import + theme tokens
│   │   ├── error.tsx                 # route-level error boundary
│   │   ├── not-found.tsx             # global 404
│   │   ├── search/
│   │   │   └── page.tsx              # dedicated results view (deep-linkable)
│   │   ├── articles/
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx          # article detail
│   │   │       ├── not-found.tsx
│   │   │       ├── loading.tsx
│   │   │       └── edit/
│   │   │           └── page.tsx      # editor
│   │   ├── categories/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── actions/
│   │   │   ├── articles.ts           # 'use server'
│   │   │   └── categories.ts         # 'use server'
│   │   └── api/
│   │       ├── articles/
│   │       │   ├── route.ts          # GET (list), POST (create)
│   │       │   └── [idOrSlug]/
│   │       │       └── route.ts      # GET, PATCH, DELETE
│   │       ├── search/
│   │       │   └── route.ts          # GET
│   │       ├── categories/
│   │       │   └── route.ts          # GET, POST
│   │       ├── health/
│   │       │   └── route.ts          # GET
│   │       └── test/
│   │           └── reset/
│   │               └── route.ts      # POST (E2E_TEST_MODE only)
│   ├── components/
│   │   ├── ui/                       # primitives, no domain knowledge
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── field.tsx             # label + error + hint wrapper
│   │   │   ├── empty-state.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── toast.tsx
│   │   ├── layout/
│   │   │   ├── app-shell.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── mobile-nav.tsx        # Radix Dialog drawer
│   │   │   ├── theme-toggle.tsx
│   │   │   └── skip-link.tsx
│   │   ├── articles/
│   │   │   ├── article-card.tsx
│   │   │   ├── article-list.tsx
│   │   │   ├── article-header.tsx
│   │   │   ├── article-body.tsx      # react-markdown + sanitize
│   │   │   ├── article-form.tsx      # client: RHF + editor
│   │   │   ├── markdown-editor.tsx   # client, next/dynamic, ssr:false
│   │   │   ├── delete-article-button.tsx
│   │   │   ├── status-badge.tsx
│   │   │   └── revision-list.tsx
│   │   ├── search/
│   │   │   ├── search-input.tsx      # client, debounced, URL-driven
│   │   │   ├── search-results.tsx
│   │   │   ├── highlight.tsx         # renders match segments as <mark>
│   │   │   └── command-palette.tsx   # client, cmdk, calls /api/search
│   │   └── filters/
│   │       ├── filter-bar.tsx
│   │       ├── category-chips.tsx
│   │       └── pagination.tsx
│   ├── lib/
│   │   ├── validation/
│   │   │   ├── article.ts            # articleCreateSchema, articleUpdateSchema
│   │   │   ├── category.ts
│   │   │   └── query.ts              # listQuerySchema (searchParams)
│   │   ├── markdown.ts               # excerpt, plainText, readingTime
│   │   ├── slug.ts                   # slugify + collision suffix
│   │   ├── highlight.ts              # segments from sentinel-marked FTS output
│   │   ├── format.ts                 # date/size/number formatting
│   │   ├── errors.ts                 # AppError + RFC 9457 problem mapping
│   │   ├── result.ts                 # ok()/err() discriminated union
│   │   ├── cn.ts                     # clsx + tailwind-merge
│   │   └── env.ts                    # Zod-validated process.env
│   ├── server/
│   │   ├── db/
│   │   │   ├── create.ts             # condition-free connection factory (tsx/Vitest safe)
│   │   │   ├── client.ts             # 'server-only' singleton; calls setDb()
│   │   │   ├── current.ts            # getDb()/setDb() seam for repositories + tests
│   │   │   ├── schema.ts             # Drizzle table definitions
│   │   │   ├── search-index-ddl.ts   # FTS5 DDL constant (no imports)
│   │   │   ├── search-index.ts       # ensureSearchIndex() wrapper
│   │   │   ├── migrate.ts            # drizzle migrate + ensureSearchIndex()
│   │   │   └── seed.ts               # seed data (imported by scripts/seed.ts)
│   │   └── repositories/
│   │       ├── articles.ts
│   │       ├── categories.ts
│   │       ├── revisions.ts
│   │       └── search.ts
│   ├── test/
│   │   ├── setup.ts                  # jest-dom, per-file DB isolation
│   │   ├── db.ts                     # createTestDb(): temp file + migrations
│   │   └── factories.ts              # makeArticle(), makeCategory()
│   └── types/
│       └── domain.ts                 # Article, ArticleSummary, Category, SearchHit…
├── .env.example
├── .gitignore
├── .nvmrc
├── AGENTS.md                         # auto-generated by Next 16.3+; keep committed
├── CLAUDE.md                         # auto-generated; points at AGENTS.md
├── README.md
├── drizzle.config.ts
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── prettier.config.mjs
├── tsconfig.json
└── vitest.config.ts
```

### 5.2 Naming conventions

| Kind | Convention | Example |
|---|---|---|
| React components | `kebab-case.tsx`, named export, PascalCase symbol | `article-card.tsx` → `export function ArticleCard()` |
| Server Actions | verb-first camelCase, grouped per entity | `createArticle`, `updateArticle` |
| Repository functions | `verbEntity` | `listArticles`, `getArticleBySlug`, `searchArticles` |
| Zod schemas | `camelCaseSchema` | `articleCreateSchema` |
| DB tables/columns | `snake_case`, plural tables | `articles.body_md` |
| TS domain types | PascalCase, no `I` prefix | `Article`, `ArticleSummary` |
| Routes | kebab-case path segments, `[param]` dynamic | `/articles/[slug]/edit` |
| Test files | co-located `*.test.ts(x)`; E2E in `e2e/*.spec.ts` | `slug.test.ts` |

### 5.3 Developer workflow

1. **Trunk-based.** Work on short-lived branches named `<type>/<short-slug>` (e.g. `feat/fts-search`). Merge to `main` via PR.
2. **Before every commit:** `npm run verify` (typecheck → lint → format:check → test → build). This is exactly what CI runs, so a green local run guarantees a green pipeline.
3. **Before every push that touches UI:** `npm run test:e2e`.
4. **Schema changes:** edit `src/server/db/schema.ts` → `npm run db:generate` → review the generated SQL in `drizzle/` → commit both → `npm run db:migrate`. **Never** use `drizzle-kit push` against a database with data you care about.
5. **PR checklist** (`.github/pull_request_template.md`): does it change the schema? Does it need a migration? Are empty states handled? Are new user-visible strings reachable by keyboard? Are unit tests added for new pure logic?
6. **Commit trailers:** include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` when an agent authored the change.
7. **`AGENTS.md` must stay committed.** Next.js 16.3+ regenerates it on `next dev` when an agent is detected; committing it keeps the working tree clean and points agents at version-matched docs in `node_modules/next/dist/docs/`.

---

## 6. Front-end architecture

### 6.1 Rendering model [DECISION]

**Server-first.** Every route is a React Server Component. Client Components are used only where interactivity is unavoidable, and each one is a leaf.

| Route | Rendering | Client components used |
|---|---|---|
| `/` (browse) | RSC, dynamic (`searchParams`) | `SearchInput`, `FilterBar`, `Pagination`, `CommandPalette`, `ThemeToggle` |
| `/search` | RSC, dynamic (`searchParams`) | `SearchInput`, `FilterBar`, `Pagination` |
| `/articles/[slug]` | RSC, dynamic | `DeleteArticleButton`, `CommandPalette` |
| `/articles/[slug]/edit` | RSC shell + client form | `ArticleForm` → `MarkdownEditor` (dynamic, `ssr:false`) |
| `/articles/new` | RSC shell + client form | `ArticleForm` → `MarkdownEditor` |
| `/categories/[slug]` | RSC, dynamic | `Pagination` |

Rules:
- **No `useEffect`-based data fetching.** All reads happen in the RSC tree.
- **No global client state library.** No Redux, Zustand, Jotai, or React Query.
- **The URL is the state container** for search, filters, sorting, and pagination (see §8.4).
- `'use client'` is added to the smallest possible file. A page/layout file must never carry `'use client'`.

### 6.2 Route map and URL contract

| URL | Purpose | Query params |
|---|---|---|
| `/` | Browse all published articles; doubles as the search entry point | `q`, `category`, `status`, `sort`, `page` |
| `/search` | Same data, dedicated results URL for deep links/back-button correctness | `q`, `category`, `status`, `page` |
| `/articles/new` | Create form | — |
| `/articles/[slug]` | Article detail | — |
| `/articles/[slug]/edit` | Edit form | — |
| `/categories/[slug]` | Articles filtered by category | `q`, `page` |
| `/api/*` | JSON API (§7.3) | — |

Query-param contract (parsed by `listQuerySchema`, §7.4):

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string, 1–200 chars, trimmed | `''` | Empty ⇒ browse mode; non-empty ⇒ search mode |
| `category` | category slug | absent | Absent ⇒ all categories |
| `status` | `published` \| `draft` \| `all` | `published` | `draft`/`all` require no auth in v1 |
| `sort` | `updated` \| `created` \| `title` | `updated` | Ignored in search mode (relevance wins) |
| `page` | integer ≥ 1 | `1` | |

Invalid or unknown params are **coerced to defaults, never 400**. A shared URL must always render.

### 6.3 Component architecture

Three layers, strictly one-directional:

```
ui/          primitives, zero domain knowledge, no data fetching
   ↑
articles/ search/ filters/ layout/    domain components; may fetch in RSC, may be client
   ↑
app/**/page.tsx   routes; compose domain components, read repositories, own Suspense boundaries
```

- **`ui/` primitives** are built with `class-variance-authority` for variants and `clsx`+`tailwind-merge` via `cn()` for overrides. Every primitive forwards `ref` and spreads rest props onto the root element.
- **`Field`** (`ui/field.tsx`) is the only way to render a labelled input. It renders `<Label>`, the control, a hint, and an error region wired with `aria-describedby` and `aria-invalid`. This makes accessible forms the default rather than an afterthought.
- **`EmptyState`** (`ui/empty-state.tsx`) takes `{ icon, title, description, action? }`. Every list surface renders one of the four canonical states (see §6.5).
- **Suspense boundaries** wrap each async section (`ArticleList`, `CategorySidebar`, `SearchResults`) so the static shell streams immediately.

### 6.4 Forms and validation

**Stack:** `react-hook-form` 7.87.0 + `@hookform/resolvers` 5.9.1 + the shared Zod 4 schema.

The pattern (used identically for create and edit):

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleCreateSchema, type ArticleCreateInput } from '@/lib/validation/article';
import { createArticle, type ActionState } from '@/app/actions/articles';

export function ArticleForm({ categories }: { categories: CategoryOption[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createArticle, { status: 'idle' });
  const form = useForm<ArticleCreateInput>({
    resolver: zodResolver(articleCreateSchema),
    defaultValues: { title: '', summary: '', bodyMd: '', categoryId: null, status: 'draft' },
    mode: 'onBlur',
  });

  return (
    // action={formAction} keeps the form usable with JavaScript disabled
    <form action={formAction} onSubmit={form.handleSubmit(() => undefined)} noValidate>
      <Field label="Title" error={form.formState.errors.title?.message} required>
        <Input {...form.register('title')} autoComplete="off" />
      </Field>
      {/* … */}
      <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save article'}</Button>
    </form>
  );
}
```

Three guarantees this buys:
1. **Instant feedback** — RHF validates on blur and on submit using the exact schema the server will use.
2. **No bypass** — the Server Action re-parses the same Zod schema; a hand-crafted POST is rejected.
3. **Graceful degradation** — because `action={formAction}` is on the `<form>`, the browser submits natively if JavaScript fails to load.

Validation messages are user-facing, imperative, and end with a period. Field-level errors render inside `Field`; form-level errors render in a `role="alert"` banner above the submit button.

### 6.5 Empty states, loading, and error states

Four canonical empty states, each with a distinct title, description, and primary action. They must never be collapsed into one generic "nothing here" message.

| Trigger | Title | Description | Action |
|---|---|---|---|
| No articles exist at all | "No articles yet" | "Create the first article to start building your team's knowledge base." | "New article" → `/articles/new` |
| Search returned nothing | "No results for “{q}”" | "Try a different term, or browse all articles." | "Clear search" → `/` |
| Category has no articles | "Nothing in {category} yet" | "Articles you assign to this category will appear here." | "New article in {category}" |
| No categories exist | "No categories yet" | "Categories help you group related articles." | "Create a category" (opens dialog) |

Loading: `loading.tsx` per route renders `Skeleton` blocks matching the final layout (list rows / article header + body) — never a spinner.
Error: `error.tsx` renders a recoverable panel with the digest and a "Try again" button (`reset()`), plus a link home.

### 6.6 Styling and design system

- **Tailwind CSS 4.3.3**, CSS-first configuration. There is **no `tailwind.config.js`**. All theme tokens live in `src/app/globals.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* Manual (class-based) dark mode so next-themes can drive it. */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-surface: oklch(1 0 0);
  --color-surface-muted: oklch(0.97 0.003 250);
  --color-border: oklch(0.9 0.005 250);
  --color-ink: oklch(0.22 0.01 250);
  --color-ink-muted: oklch(0.48 0.012 250);
  --color-accent: oklch(0.55 0.16 255);
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 0.75rem;
}

.dark {
  --color-surface: oklch(0.19 0.01 250);
  --color-surface-muted: oklch(0.24 0.012 250);
  --color-border: oklch(0.32 0.012 250);
  --color-ink: oklch(0.96 0.004 250);
  --color-ink-muted: oklch(0.72 0.012 250);
  --color-accent: oklch(0.72 0.13 255);
}
```

- **`postcss.config.mjs`:**
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```
- **Theme:** `next-themes` 0.4.6 with `attribute="class"`, `defaultTheme="system"`, `disableTransitionOnChange`. It injects the blocking script that prevents a flash of the wrong theme.
- **Layout tokens:** 3-column desktop shell (sidebar 240px · content max-w-3xl · TOC 200px), collapsing to a single column with a Radix `Dialog` drawer at `<1024px`. Minimum supported width 360px.
- **Contrast:** every text/background pair must reach ≥4.5:1; `--color-ink-muted` on `--color-surface` is verified at ≥4.6:1 in both themes. Body text is 16px/1.65.
- **Markdown rendering** uses `prose prose-slate dark:prose-invert max-w-none` from `@tailwindcss/typography`.

### 6.7 Markdown rendering pipeline

Rendering happens **on the server** inside `ArticleBody`:

```tsx
// src/components/articles/article-body.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
```

**[DECISION] `rehype-raw` is deliberately NOT used.** Without it, `react-markdown` ignores embedded HTML entirely, and `rehype-sanitize` with its default schema is a second line of defense. This removes the entire stored-XSS class of bugs from an application that has no authentication — the single highest-value security decision in this spec.

---

## 7. Back-end architecture

### 7.1 Runtime model [DECISION]

One Next.js server process (Node.js runtime) serves HTML, RSC payloads, Server Actions, and JSON route handlers. **There is no separate backend service, no API gateway, and no message queue.** Rationale: 100 concurrent users, a single writer, and a brief that explicitly prefers local-first simplicity over enterprise complexity.

- The Node.js runtime is required (not Edge): `better-sqlite3` is a native addon, and Cache Components/`use cache` also require Node.
- `better-sqlite3` is synchronous. Every query blocks the event loop for its duration. This is acceptable **only** because queries are indexed and result sets are bounded. Enforced rules:
  - Every list query has an explicit `LIMIT` (max 50).
  - No query may scan `articles` without an index (verify with `EXPLAIN QUERY PLAN` in review).
  - Search returns at most 50 hits.
- Single-writer safety: SQLite WAL allows unlimited concurrent readers plus one writer. Node's single thread serializes writes naturally, so `SQLITE_BUSY` is not expected; `busy_timeout = 5000` is set anyway as a safety net.

### 7.2 Layering

```
Route Handler / Server Action      ← HTTP + FormData concerns only
        ↓
Zod schema (src/lib/validation)    ← shape + business-rule validation
        ↓
Repository (src/server/repositories) ← the only SQL in the codebase
        ↓
Drizzle → better-sqlite3           ← driver
```

Repositories return `Result<T, AppError>` from `src/lib/result.ts` rather than throwing, so error mapping is explicit and testable:

```ts
// src/lib/result.ts
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
```

```ts
// src/lib/errors.ts
export type AppErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'SLUG_TAKEN'
  | 'CATEGORY_IN_USE'
  | 'DB_UNAVAILABLE'
  | 'INTERNAL';

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const STATUS: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT: 409,
  SLUG_TAKEN: 409,
  CATEGORY_IN_USE: 409,
  DB_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function toProblemJson(error: AppError, instance: string) {
  return {
    type: `https://kb.local/problems/${error.code.toLowerCase().replace(/_/g, '-')}`,
    title: PROBLEM_TITLES[error.code],
    status: STATUS[error.code],
    detail: error.message,
    instance,
    ...(error.details ? { errors: error.details.errors } : {}),
  };
}
```

### 7.3 API surface

The JSON API exists for three concrete consumers: (1) the ⌘K command palette's instant search, (2) the Playwright suite's deterministic seed/reset, and (3) any future non-Next client. The primary UI does **not** depend on it — the UI uses RSC reads and Server Actions.

All responses are `application/json; charset=utf-8`. All errors are **RFC 9457 problem+json**. All mutations require `Content-Type: application/json` and a same-origin `Origin` header (checked by a shared `assertSameOrigin(request)` helper; Next.js Server Actions perform the equivalent check automatically).

#### `GET /api/articles`

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | When present, delegates to FTS5 search instead of the list query |
| `category` | slug | — | |
| `status` | `published`\|`draft`\|`all` | `published` | |
| `sort` | `updated`\|`created`\|`title` | `updated` | |
| `page` | int ≥ 1 | `1` | |
| `pageSize` | int 1–50 | `20` | Clamped, never rejected |

`200 OK`
```json
{
  "items": [
    {
      "id": 12,
      "title": "Deploying the API",
      "slug": "deploying-the-api",
      "summary": "Step-by-step deploy guide for the internal API.",
      "excerpt": "Run the deploy script with the production environment flag…",
      "status": "published",
      "category": { "id": 3, "name": "Engineering", "slug": "engineering" },
      "version": 4,
      "createdAt": "2026-08-02T14:10:00.000Z",
      "updatedAt": "2026-09-10T18:22:04.512Z",
      "publishedAt": "2026-08-02T14:12:31.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42,
  "totalPages": 3
}
```

#### `POST /api/articles`

Request:
```json
{
  "title": "Deploying the API",
  "summary": "Step-by-step deploy guide for the internal API.",
  "bodyMd": "## Prerequisites\n\n- Node 24 LTS\n- Access to the deploy role\n",
  "categoryId": 3,
  "status": "draft"
}
```

`201 Created` + `Location: /api/articles/12`:
```json
{ "id": 12, "slug": "deploying-the-api", "version": 1, "status": "draft", "createdAt": "2026-09-10T18:22:04.512Z" }
```

`422 Unprocessable Entity`:
```json
{
  "type": "https://kb.local/problems/validation-failed",
  "title": "Validation failed",
  "status": 422,
  "detail": "The request body failed validation.",
  "instance": "/api/articles",
  "errors": [
    { "path": "title", "message": "Title must be at least 3 characters." },
    { "path": "summary", "message": "Summary must be 300 characters or fewer." }
  ]
}
```

#### `GET /api/articles/:idOrSlug`

Accepts a numeric id or a slug. `200 OK` returns the full record including `bodyMd` and `category`. `404` returns problem+json with `type: ".../not-found"`.

#### `PATCH /api/articles/:idOrSlug`

Request includes the `version` the client last read:
```json
{
  "version": 4,
  "title": "Deploying the API (updated)",
  "bodyMd": "…",
  "categoryId": 3,
  "status": "published",
  "changeNote": "Clarified the rollback steps"
}
```
`200 OK` → `{ "id": 12, "slug": "deploying-the-api", "version": 5, "updatedAt": "…" }`

`409 Conflict` when `version` does not match the stored version:
```json
{
  "type": "https://kb.local/problems/conflict",
  "title": "This article changed since you opened it",
  "status": 409,
  "detail": "Someone saved a newer version of this article.",
  "instance": "/api/articles/12",
  "errors": [{ "path": "version", "message": "Expected version 4, found 5." }]
}
```

#### `DELETE /api/articles/:idOrSlug`

Soft-archives: sets `status = 'archived'`, stamps `archived_at`. `204 No Content`. Revisions are retained. Hard delete is not exposed in v1.

#### `GET /api/search`

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string, required, 1–200 chars | — | Empty ⇒ `400` |
| `limit` | int 1–50 | `10` | |
| `status` | `published`\|`draft`\|`all` | `published` | |

`200 OK`
```json
{
  "query": "deploy",
  "total": 7,
  "limit": 10,
  "results": [
    {
      "id": 12,
      "slug": "deploying-the-api",
      "title": "Deploying the API",
      "status": "published",
      "category": { "id": 3, "name": "Engineering", "slug": "engineering" },
      "updatedAt": "2026-09-10T18:22:04.512Z",
      "rank": -1.2437,
      "titleSegments": [
        { "text": "Deploying the ", "match": false },
        { "text": "API", "match": true }
      ],
      "snippetSegments": [
        { "text": "Run the ", "match": false },
        { "text": "deploy", "match": true },
        { "text": " script with the production flag…", "match": false }
      ]
    }
  ]
}
```

> **Why `*Segments` and not HTML.** FTS5's `snippet()`/`highlight()` functions splice caller-supplied marker strings into the source text. Returning HTML would force the client to use `dangerouslySetInnerHTML`. Instead the repository asks FTS5 for sentinel-delimited text (`\u0001` / `\u0002`, which cannot occur in stored text), and `src/lib/highlight.ts` converts it into a `{ text, match }[]` array. The UI renders each segment as a React text node inside `<mark>`. Escaping is therefore automatic and the API stays presentation-agnostic. See §8.1.

#### `GET /api/categories` / `POST /api/categories`

`GET` → `200 OK`
```json
{ "items": [ { "id": 3, "name": "Engineering", "slug": "engineering", "description": null, "articleCount": 12 } ] }
```
`POST` body `{ "name": "Product", "description": "Product decisions and roadmap notes." }` → `201 Created` `{ "id": 6, "slug": "product", "name": "Product" }`. Duplicate name (case-insensitive) → `409`.

#### `GET /api/health`

```json
{ "status": "ok", "uptimeSeconds": 412, "database": { "reachable": true, "migration": "0000_init", "articleCount": 42 } }
```
Returns `503` with `"status": "degraded"` when the DB probe fails.

#### `POST /api/test/reset` (E2E only)

**Guarded:** if `process.env.E2E_TEST_MODE !== '1'`, the route returns `404` with no body — it is invisible in any real deployment. When enabled, it deletes all rows from `articles`, `categories`, `article_revisions`, rebuilds the FTS index, and re-inserts the fixture set from `e2e/fixtures/seed.json`. Returns `{ "reset": true, "articles": 9, "categories": 4 }`.

### 7.4 Validation

Every payload has exactly one Zod schema, defined in `src/lib/validation/` and imported by both the client form and the server handler. Schemas are authored by hand (not purely derived from Drizzle) so error messages are user-facing, then cross-checked against `drizzle-zod`'s `createInsertSchema` in a unit test — this keeps schema and validation from drifting.

```ts
// src/lib/validation/article.ts
import { z } from 'zod';

export const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;
export const EDITABLE_STATUSES = ['draft', 'published'] as const;

export const articleCreateSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(200, 'Title must be 200 characters or fewer.'),
  summary: z
    .string()
    .trim()
    .max(300, 'Summary must be 300 characters or fewer.')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  bodyMd: z
    .string()
    .min(1, 'Article body cannot be empty.')
    .max(200_000, 'Article body is too large (200,000 character limit).'),
  categoryId: z.coerce.number().int().positive().nullable().default(null),
  status: z.enum(EDITABLE_STATUSES).default('draft'),
});
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;

export const articleUpdateSchema = articleCreateSchema.extend({
  version: z.coerce.number().int().nonnegative(),
  changeNote: z.string().trim().max(200).optional(),
});
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).catch(''),
  category: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(['published', 'draft', 'all']).catch('published'),
  sort: z.enum(['updated', 'created', 'title']).catch('updated'),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(50).catch(20),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
```

**Rule:** query-string parsing uses `.catch()` so a malformed URL degrades to defaults. Body parsing uses strict validation so a malformed payload returns `422` with field-level errors.

### 7.5 Server Actions contract

Every mutation is a Server Action with the signature `(prevState: ActionState, formData: FormData) => Promise<ActionState>`, compatible with `useActionState`.

```ts
// src/app/actions/articles.ts
'use server';
export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; articleId: number; slug: string; version: number }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string[]> };
```

Behaviour contract:
- Parse `FormData` → object; run the Zod schema.
- On validation failure return `{ status: 'error', fieldErrors }` — **never throw for user input**.
- On success call the repository, then `revalidatePath('/')`, `revalidatePath('/search')`, `revalidatePath(\`/articles/${slug}\`)`, and `revalidatePath('/categories')`.
- On `CONFLICT`, return `{ status: 'error', message: 'This article was updated by someone else…' }` plus `conflict: true` so the form can render a "Reload and merge" affordance.
- Then `redirect(\`/articles/${slug}\`)` **outside** any `try/catch` (Next.js implements `redirect()` by throwing a control-flow signal; catching it silently breaks navigation).

### 7.6 Logging and observability

- `pino` 10.3.1, JSON in production, `pino-pretty` 13.1.3 in development. Next.js auto-externalizes `pino` and `pino-pretty`; `serverExternalPackages` in `next.config.ts` states this explicitly so it cannot regress.
- Log one line per mutation at `info`: `{ event, articleId, slug, version, durationMs }`. Never log article bodies.
- `log.error` with the full `AppError` on unexpected failures; the client sees only the problem+json `detail`, never a stack.
- `/api/health` is the single readiness/liveness probe. No APM, no metrics backend in v1.

---

## 8. Data model and persistence strategy

### 8.1 Search index design [DECISION]

**SQLite FTS5 with an external-content table and triggers.** Chosen over `LIKE '%term%'` (no ranking, no snippets, full scans) and over a client-side index such as Fuse.js (would ship the entire corpus to the browser and cannot scale past a few hundred articles).

**Virtual table** (created by `ensureSearchIndex()`, see §8.6):

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS article_search USING fts5(
  title,
  summary,
  body_md,
  content = 'articles',
  content_rowid = 'id',
  tokenize = "unicode61 remove_diacritics 2"
);
```

- `content = 'articles'` makes this an **external-content** table: the text is not duplicated, only the inverted index is stored. Storage cost is ~20–30% of the body text.
- `unicode61 remove_diacritics 2` gives case-insensitive, accent-insensitive matching across Latin scripts without a custom tokenizer.
- `better-sqlite3` 13.0.3 bundles SQLite 3.53.4 compiled with `SQLITE_ENABLE_FTS5`, so no extra build step is required on any supported platform.

**Triggers keep the index in sync** — required because the table has no automatic refresh:

```sql
CREATE TRIGGER IF NOT EXISTS articles_search_ai AFTER INSERT ON articles BEGIN
  INSERT INTO article_search(rowid, title, summary, body_md)
  VALUES (new.id, new.title, COALESCE(new.summary, ''), new.body_md);
END;

CREATE TRIGGER IF NOT EXISTS articles_search_ad AFTER DELETE ON articles BEGIN
  INSERT INTO article_search(article_search, rowid, title, summary, body_md)
  VALUES ('delete', old.id, old.title, COALESCE(old.summary, ''), old.body_md);
END;

CREATE TRIGGER IF NOT EXISTS articles_search_au AFTER UPDATE ON articles BEGIN
  INSERT INTO article_search(article_search, rowid, title, summary, body_md)
  VALUES ('delete', old.id, old.title, COALESCE(old.summary, ''), old.body_md);
  INSERT INTO article_search(rowid, title, summary, body_md)
  VALUES (new.id, new.title, COALESCE(new.summary, ''), new.body_md);
END;
```

The `('delete', …)` form is mandatory for external-content tables — a plain `DELETE FROM article_search` corrupts the index.

**Test isolation rule.** Repositories are written as **factories** that take a database handle:

```ts
// src/server/repositories/articles.ts
import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '@/server/db/create';
import { articles, categories } from '@/server/db/schema';
import { getDb } from '@/server/db/current';

export function createArticleRepository(db: Database) {
  return {
    listArticles(q: ListQuery) { /* … */ },
    getArticleBySlug(slug: string) { /* … */ },
    // …
  };
}

// Runtime singleton bound to the request-time connection.
export const articleRepository = createArticleRepository(getDb());
```

`src/server/db/current.ts` holds the single `db` handle that the Next.js runtime uses and exposes `getDb()` plus a `setDb()` seam. Tests call `createArticleRepository(testDb)` directly with the temp-file handle from `src/test/db.ts`, so **no test ever touches `./data/kb.db`**, and no mocking of Drizzle is required.

```ts
// src/server/db/current.ts
import type { Database } from './create';

let current: Database | undefined;

/** Runtime accessor. Next.js callers use this. */
export function getDb(): Database {
  if (!current) throw new Error('Database not initialized. Call setDb() from client.ts or a test setup.');
  return current;
}

/** Test/runtime seam. Called once by client.ts, or by each test file. */
export function setDb(db: Database): void {
  current = db;
}
```

> **Why this seam exists.** A repository that closes over a module-level `db` singleton is untestable without module mocking, and a test that forgets to mock would silently write to the developer's real database. Passing the handle explicitly makes isolation the default and makes "which database did this query hit?" answerable by reading the call site.

**Query** (executed inside `createSearchRepository(db)` via Drizzle's `sql` template, which always parameterizes):

```ts
const rows = db.all<RawHit>(sql`
  SELECT
    a.id,
    a.slug,
    a.title,
    a.status,
    a.updated_at,
    a.category_id,
    bm25(article_search, 8.0, 3.0, 1.0) AS rank,
    highlight(article_search, 0, char(1), char(2)) AS title_marked,
    snippet(article_search, 2, char(1), char(2), '…', 24) AS body_snippet
  FROM article_search
  JOIN articles a ON a.id = article_search.rowid
  WHERE article_search MATCH ${ftsQuery}
    AND (${statusFilter} = 'all' OR a.status = ${statusFilter})
  ORDER BY rank
  LIMIT ${limit}
`);
```

- `bm25(article_search, 8.0, 3.0, 1.0)` weights title 8×, summary 3×, body 1×. This is why "title and content" search feels right without any custom scoring code.
- `highlight`/`snippet` emit `char(1)`/`char(2)` sentinels; `src/lib/highlight.ts` splits on them and returns `{ text, match }[]`.

**Query preprocessing** (`toFtsQuery(raw)` in `src/lib/highlight.ts`'s sibling `src/lib/fts.ts`), fully unit-tested:
1. Trim and collapse whitespace.
2. Strip FTS5 operator characters (`" * ( ) : ^ -` and `NEAR`/`AND`/`OR`/`NOT` when used as operators) so user input can never produce a syntax error or an unintended operator query.
3. Wrap each remaining token in double quotes and append `*` to the final token for prefix matching: `deploy api` → `"deploy" "api"*`.
4. Empty result ⇒ the repository short-circuits and returns `[]` without touching the database.

**Fallback:** if `article_search` is missing or a `MATCH` fails with a `SqliteError`, `searchArticles` logs a warning and falls back to an indexed `LIKE` scan over `title`/`summary` (capped at 50 rows). The UI never breaks because of a search-index problem. `npm run db:reindex` runs `INSERT INTO article_search(article_search) VALUES ('rebuild')`.

### 8.2 Relational schema

#### `categories`

| Column | SQLite type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `name` | TEXT | NOT NULL | Unique case-insensitively (expression index) |
| `slug` | TEXT | NOT NULL, UNIQUE | Derived from `name` |
| `description` | TEXT | NULL | ≤200 chars |
| `created_at` | INTEGER | NOT NULL | Unix epoch **milliseconds** |
| `updated_at` | INTEGER | NOT NULL | Unix epoch **milliseconds** |

#### `articles`

| Column | SQLite type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | FTS5 `content_rowid` |
| `title` | TEXT | NOT NULL | 3–200 chars |
| `slug` | TEXT | NOT NULL, UNIQUE | Stable after creation unless the title changes and the author confirms |
| `summary` | TEXT | NULL | ≤300 chars; used as the list subtitle |
| `body_md` | TEXT | NOT NULL, DEFAULT `''` | Markdown source; ≤200,000 chars |
| `status` | TEXT | NOT NULL, DEFAULT `'draft'` | `CHECK (status IN ('draft','published','archived'))` |
| `category_id` | INTEGER | NULL, FK → `categories(id)` ON DELETE SET NULL | Nullable; "Uncategorized" is a UI concept, not a row |
| `version` | INTEGER | NOT NULL, DEFAULT `1` | Optimistic concurrency token |
| `published_at` | INTEGER | NULL | Set on first transition to `published` |
| `archived_at` | INTEGER | NULL | Set on archive |
| `created_at` | INTEGER | NOT NULL | |
| `updated_at` | INTEGER | NOT NULL | |

Indexes:
- `articles_slug_unique` — UNIQUE on `(slug)`
- `articles_status_updated_idx` — on `(status, updated_at DESC)` — serves the default browse query
- `articles_category_idx` — on `(category_id)`
- `articles_title_idx` — on `(title COLLATE NOCASE)` — serves the `sort=title` path

#### `article_revisions`

| Column | SQLite type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `article_id` | INTEGER | NOT NULL, FK → `articles(id)` ON DELETE CASCADE | |
| `revision_number` | INTEGER | NOT NULL | Starts at 1 |
| `title` | TEXT | NOT NULL | Snapshot |
| `summary` | TEXT | NULL | Snapshot |
| `body_md` | TEXT | NOT NULL | Snapshot |
| `editor_name` | TEXT | NOT NULL | From the `kb_display_name` cookie; defaults to `'Anonymous editor'` |
| `change_note` | TEXT | NULL | ≤200 chars |
| `created_at` | INTEGER | NOT NULL | |

Indexes:
- `article_revisions_unique` — UNIQUE on `(article_id, revision_number)`
- `article_revisions_article_idx` — on `(article_id, revision_number DESC)`

Retention: the newest **20** revisions per article are kept; older ones are pruned on write inside the same transaction. This bounds database growth without a background job.

#### `article_search` (FTS5 virtual table)

See §8.1. Not a Drizzle-managed table — created idempotently by `ensureSearchIndex()`.

#### Relationships

```
categories 1 ────< articles (category_id, nullable, ON DELETE SET NULL)
articles   1 ────< article_revisions (article_id, ON DELETE CASCADE)
articles   1 ────  article_search (rowid ↔ id, trigger-maintained)
```

### 8.3 Drizzle schema source of truth

```ts
// src/server/db/schema.ts
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('categories_slug_unique').on(t.slug),
    uniqueIndex('categories_name_nocase_unique').on(sql`lower(${t.name})`),
  ],
);

export const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const articles = sqliteTable(
  'articles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary'),
    bodyMd: text('body_md').notNull().default(''),
    status: text('status', { enum: ARTICLE_STATUSES }).notNull().default('draft'),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    version: integer('version').notNull().default(1),
    publishedAt: timestamp('published_at'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('articles_slug_unique').on(t.slug),
    index('articles_status_updated_idx').on(t.status, t.updatedAt),
    index('articles_category_idx').on(t.categoryId),
  ],
);

export const articleRevisions = sqliteTable(
  'article_revisions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    bodyMd: text('body_md').notNull(),
    editorName: text('editor_name').notNull(),
    changeNote: text('change_note'),
    createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('article_revisions_unique').on(t.articleId, t.revisionNumber),
    index('article_revisions_article_idx').on(t.articleId, t.revisionNumber),
  ],
);
```

> The `lower(name)` expression index is supported by Drizzle 0.45.2 (`IndexColumn` accepts `SQL`). If `drizzle-kit generate` ever fails to emit it, fall back to enforcing case-insensitive uniqueness in `createCategory` with `SELECT 1 FROM categories WHERE lower(name) = lower(?)` inside the same transaction, and delete the index definition.

### 8.4 Database client and PRAGMAs

```ts
// src/server/db/create.ts
// No `server-only` import here: this factory is imported by tsx scripts and by
// Vitest, neither of which sets the `react-server` export condition.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export function createDatabase(file: string) {
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('cache_size = -32000'); // 32 MB page cache
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

export type Database = ReturnType<typeof createDatabase>['db'];
```

```ts
// src/server/db/client.ts
// The ONLY `server-only` module in src/server/db/. Importing this from a Client
// Component fails the build instead of leaking the driver into the browser bundle.
import 'server-only';
import { env } from '@/lib/env';
import { createDatabase } from './create';
import { setDb } from './current';

// Next.js dev HMR re-evaluates modules; keep exactly one handle process-wide.
const globalForDb = globalThis as unknown as { __kbDb?: ReturnType<typeof createDatabase> };

const connection = (globalForDb.__kbDb ??= createDatabase(env.DATABASE_FILE));

export const { sqlite, db } = connection;
setDb(connection.db);
```

> **Why the split matters.** `server-only@0.0.1` resolves to `empty.js` only under the `react-server` export condition; under Node's default condition it resolves to `index.js`, which **throws on import**. Next.js sets that condition for Server Components, but plain Node (Vitest) and `tsx` (the `db:*` scripts) do not. Without `create.ts` as a condition-free factory, every repository test and every `npm run db:*` command would crash at import time.

PRAGMA rationale:

| PRAGMA | Value | Why |
|---|---|---|
| `journal_mode` | `WAL` | Concurrent readers while a writer commits — the core requirement for "100 concurrent users" |
| `foreign_keys` | `ON` | SQLite defaults to OFF; `ON DELETE CASCADE` on revisions depends on it |
| `synchronous` | `NORMAL` | Safe with WAL; ~10× faster writes than `FULL` |
| `busy_timeout` | `5000` | Bounded wait instead of an immediate `SQLITE_BUSY` |
| `cache_size` | `-32000` | 32 MB page cache; keeps the hot index resident |

### 8.5 Migrations

**Tooling:** `drizzle-kit` 0.31.10, `generate` + `migrate` (never `push`). Migration SQL is committed and reviewed like application code.

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_FILE ?? './data/kb.db' },
  strict: true,
  verbose: true,
});
```

`npm run db:generate` produces `drizzle/0000_init.sql`, which for the schema above looks like:

```sql
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_nocase_unique` ON `categories` (lower("name"));--> statement-breakpoint
CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text,
	`body_md` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category_id` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`published_at` integer,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_status_updated_idx` ON `articles` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `articles_category_idx` ON `articles` (`category_id`);--> statement-breakpoint
CREATE TABLE `article_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer NOT NULL,
	`revision_number` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`body_md` text NOT NULL,
	`editor_name` text NOT NULL,
	`change_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_revisions_unique` ON `article_revisions` (`article_id`,`revision_number`);--> statement-breakpoint
CREATE INDEX `article_revisions_article_idx` ON `article_revisions` (`article_id`,`revision_number`);
```

A follow-up migration adds the `status` CHECK constraint and the `title` NOCASE index:

```sql
-- drizzle/0001_article_constraints.sql
CREATE INDEX `articles_title_idx` ON `articles` (`title` COLLATE NOCASE);
```

> **Note on `CHECK`:** SQLite cannot add a `CHECK` constraint to an existing table without a table rebuild. Add it in the *initial* schema by hand-editing `0000_init.sql` before the first `db:migrate`, or accept validation-only enforcement. **[DECISION]** Hand-edit `0000_init.sql` to include `` `status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','published','archived')) `` before the first migration is applied, then run `npm run db:generate` once more so the snapshot matches. Doing it up front costs nothing; retrofitting it costs a table rebuild.

### 8.6 FTS5 bootstrap (why it is not a Drizzle migration)

`drizzle-kit` orders migrations through `drizzle/meta/_journal.json`. Hand-authored SQL files dropped into `drizzle/` without a journal entry are silently skipped. Rather than hand-maintain the journal, the FTS5 DDL is applied by an **idempotent bootstrap function** that runs after `drizzle-kit migrate` in every environment (dev, test, CI).

```ts
// src/server/db/search-index-ddl.ts
// Pure DDL constant, no imports — safe for any runtime (Next, tsx, Vitest).
export const FTS5_DDL = `
CREATE VIRTUAL TABLE IF NOT EXISTS article_search USING fts5(
  title, summary, body_md,
  content = 'articles',
  content_rowid = 'id',
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TRIGGER IF NOT EXISTS articles_search_ai AFTER INSERT ON articles BEGIN
  INSERT INTO article_search(rowid, title, summary, body_md)
  VALUES (new.id, new.title, COALESCE(new.summary, ''), new.body_md);
END;

CREATE TRIGGER IF NOT EXISTS articles_search_ad AFTER DELETE ON articles BEGIN
  INSERT INTO article_search(article_search, rowid, title, summary, body_md)
  VALUES ('delete', old.id, old.title, COALESCE(old.summary, ''), old.body_md);
END;

CREATE TRIGGER IF NOT EXISTS articles_search_au AFTER UPDATE ON articles BEGIN
  INSERT INTO article_search(article_search, rowid, title, summary, body_md)
  VALUES ('delete', old.id, old.title, COALESCE(old.summary, ''), old.body_md);
  INSERT INTO article_search(rowid, title, summary, body_md)
  VALUES (new.id, new.title, COALESCE(new.summary, ''), new.body_md);
END;
`;
```

The constant lives in `search-index-ddl.ts` (no imports, usable from any runtime) and is wrapped by `search-index.ts` (the `server-only` module), mirroring the `create.ts` / `client.ts` split in §8.4.

```ts
// src/server/db/search-index.ts
import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from './client';
import { FTS5_DDL } from './search-index-ddl';

export { FTS5_DDL };

export function ensureSearchIndex({ rebuild = false } = {}) {
  db.run(sql.raw(FTS5_DDL));
  if (rebuild) db.run(sql`INSERT INTO article_search(article_search) VALUES ('rebuild')`);
}
```

```ts
// src/server/db/migrate.ts
import 'server-only';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';
import { ensureSearchIndex } from './search-index';

export function runMigrations({ rebuildSearch = false } = {}) {
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex({ rebuild: rebuildSearch });
}
```

`runMigrations()` is invoked once per server process from `src/instrumentation.ts`, which Next.js calls at boot:

```ts
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { runMigrations } = await import('@/server/db/migrate');
  runMigrations();
}
```

Because both the migration runner and the FTS5 DDL are idempotent, starting the app against an empty `./data/kb.db` self-initializes the schema and search index. `npm run db:setup` remains the explicit path for seeding.

### 8.7 Transactions and write paths

All multi-statement writes run inside a single `db.transaction(...)`, which `better-sqlite3` implements synchronously (no `await` inside the callback — this is a hard requirement of the driver):

**`updateArticle` transaction:**
1. `SELECT id, version, status, title, summary, body_md FROM articles WHERE id = ?` → if missing, `err(NOT_FOUND)`.
2. If `input.version !== row.version` → `err(CONFLICT, { errors: [{ path: 'version', … }] })`.
3. Insert the **previous** state as a new `article_revisions` row with `revision_number = row.version`.
4. `UPDATE articles SET …, version = version + 1, updated_at = ? WHERE id = ? AND version = ?` — the `AND version = ?` guard makes the check-then-write atomic even though the driver is synchronous.
5. Prune revisions beyond the newest 20.
6. The `articles_search_au` trigger refreshes the FTS index.

**`createArticle` transaction:**
1. Generate a slug from the title; if taken, append `-2`, `-3`, … (bounded at 50 attempts, then fall back to appending a 6-character `nanoid`-style random suffix).
2. Insert the article.
3. Insert revision 1 (the initial state).
4. The `articles_search_ai` trigger indexes it.

### 8.8 Persistence strategy and operations

| Concern | Decision |
|---|---|
| File location | `./data/kb.db` (dev + prod v1). `DATABASE_FILE` overrides. `data/` is gitignored except `.gitkeep`. |
| Test isolation | Each Vitest file gets a fresh temp file DB under `os.tmpdir()`; each Playwright run resets via `/api/test/reset`. |
| Backup | `npm run db:backup` → `VACUUM INTO './data/backups/kb-<ISO>.db'`. Safe to run while the app is live; produces a consistent single-file snapshot. |
| Integrity check | `npm run db:check` → `PRAGMA integrity_check` + `PRAGMA foreign_key_check`. |
| Index rebuild | `npm run db:reindex` → `INSERT INTO article_search(article_search) VALUES ('rebuild')`. |
| Durability | WAL + `synchronous=NORMAL`. Worst case on OS crash: the last few committed transactions. Acceptable for an internal knowledge base. |
| Growth | ~2 KB/article of body text plus ~25% FTS overhead. 10,000 articles ≈ 30 MB. No partitioning or archival needed at this scale. |

### 8.9 Scale-out path (documented, not implemented)

When the deployment target changes, in increasing order of effort:

1. **Add caching.** Enable `cacheComponents: true` in `next.config.ts` and wrap `getCategories()` / `getArticleBySlug()` in `'use cache'` + `cacheLife('minutes')` + `cacheTag('articles')`; invalidate with `revalidateTag('articles')` from the mutations. This is the single highest-leverage change and requires no schema change.
2. **PostgreSQL.** Swap `drizzle-orm/better-sqlite3` → `drizzle-orm/node-postgres` + `pg` 8.23.0, change `sqliteTable` → `pgTable` (the column definitions map almost 1:1; `timestamp_ms` becomes `timestamp`), regenerate migrations, and replace `src/server/repositories/search.ts` with a `tsvector`/`tsquery` implementation. Because **all** SQL is confined to `src/server/repositories/**` and the FTS5 index is behind one module, this is a two-file change plus a migration. The `article_search` external-content design mirrors a Postgres generated `tsvector` column + GIN index closely enough that the query shape (rank + highlighted segments) is preserved.
3. **Horizontal scale.** Once the data is in Postgres, the app is stateless and can run multiple replicas behind a load balancer with no further code change. SQLite cannot be scaled this way — that is the deliberate ceiling of this design, and the reason the repository boundary is enforced so strictly.

---

## 9. Feature-specific architecture decisions

### 9.1 F1 — Article browsing and detail pages

**Approach.** `/` is an RSC that reads `searchParams` (a `Promise` in Next.js 16 — `const { q, category, status, sort, page } = await searchParams`), calls `listArticles()`, and renders a streamed list. `/articles/[slug]` is an RSC that calls `getArticleBySlug()` and renders `ArticleHeader` + `ArticleBody` + `RevisionList`.

**Key choices.**
- **Offset pagination, not cursor pagination.** `LIMIT 21 OFFSET (page-1)*20` — fetch 21 rows to know whether a next page exists, render 20. Rationale: the corpus is small, page numbers are user-visible and linkable, and offset pagination is trivially cacheable later. Cursor pagination would add a token to every URL for no benefit at this scale.
- **`count(*)` runs only when needed.** The list query uses the "fetch limit+1" trick; an exact `total` is computed with a second `SELECT count(*)` only when `page > 1` (so the pager can show "Page 3 of 7"). On page 1 the pager shows "Next" without a total.
- **Detail page uses a join, not N+1.** `getArticleBySlug` selects the article and its category in one query and loads the 5 most recent revisions in a second query. Two queries total, regardless of page size.
- **404 handling.** `getArticleBySlug` returns `err(NOT_FOUND)` → the page calls `notFound()` → `articles/[slug]/not-found.tsx` renders a helpful panel with a link back to browse. Archived articles are visible at their URL (with an "Archived" badge) so links do not rot.

**Constraints and tradeoffs.** Offset pagination degrades on very large offsets (`OFFSET 100000`); acceptable at 2,000–10,000 articles and explicitly revisited in §8.9. Deep pagination is also discouraged in the UI (numbered pages cap at ±3 around the current page).

### 9.2 F2 — Search across titles and content

**Approach.** Fully specified in §8.1. The UI integration:

- `SearchInput` is a client component bound to the `q` URL param, debounced 250 ms via `useTransition` + `router.replace(\`/search?${params}\`, { scroll: false })`. The input stays controlled so typing is never blocked by a slow render.
- The server renders `SearchResults` from `searchArticles(q, { limit, status })`. Result count is announced through a `role="status"` region: "7 results for deploy."
- Matches render through `<Highlight segments={hit.titleSegments} />`, which emits `<mark>` elements with a token-based background — no `dangerouslySetInnerHTML` anywhere in the codebase.
- The ⌘K **command palette** (`cmdk`, client) calls `GET /api/search?q=…&limit=8` with `AbortController` cancellation. This is the only place the UI fetches JSON, and it is explicitly a secondary affordance — the URL-driven `/search` page is the canonical path.

**Key choices.**
- **FTS5 over `LIKE`.** `LIKE '%deploy%'` cannot use an index, cannot rank, and cannot produce snippets. FTS5 gives all three for free and is compiled into the bundled SQLite.
- **External-content table.** Avoids duplicating `body_md` and keeps the `articles` table as the single source of truth.
- **`bm25` with title weighting 8×.** Matches user intuition: a title match outranks a body match.
- **Prefix matching on the last token.** `deploy` matches `deploying` while typing, which is what makes search feel instant.

**Constraints and tradeoffs.** No stemming (`unicode61` only), so `deploying` does not match `deployment`. Accepted: prefix matching covers the common case, and a Porter tokenizer would degrade exact-term precision. No typo tolerance. No multi-language support beyond diacritic folding. All three are documented in §15.4 as future work.

**Supporting infrastructure.** `ensureSearchIndex()` on boot; `npm run db:reindex` for recovery; a unit test asserting that an `UPDATE` to `articles.body_md` is reflected in `MATCH` results (this is the test that catches a broken trigger).

### 9.3 F3 — Basic editing for all articles

**Approach.** A Markdown editor with a live preview pane, rendered inside a client `ArticleForm`. Storage is Markdown source in `articles.body_md`; rendering happens server-side (§6.7).

**Why Markdown-with-preview and not WYSIWYG** [DECISION]:
- Markdown *is* the storage format, so what the author writes is exactly what is stored — no lossy HTML→Markdown conversion layer (which would require `turndown` and would mangle tables and code blocks).
- Diffs are readable, which makes `article_revisions` genuinely useful for reviewing what changed.
- The FTS5 index indexes the raw source directly; a WYSIWYG editor would force indexing of HTML, polluting matches with tag names.
- Fewer moving parts: `@uiw/react-md-editor` is one dependency with React ≥16.8 peer support, versus Tiptap 3.31.3's five-package install and its own extension surface.

**Tradeoff, stated plainly:** non-technical authors see Markdown syntax. Mitigation: a side-by-side preview (`preview="live"`), a formatting toolbar (bold, italic, heading, link, list, code, quote) that inserts syntax for the user, and a one-line hint under the editor ("Markdown supported — the preview updates as you type").

**Key choices.**
- `MarkdownEditor` is loaded with `next/dynamic(..., { ssr: false })` so the editor's ~120 KB of JS never enters the browse route bundle. A `Skeleton` shows while it loads.
- The editor is a **controlled** component wired into RHF via a small adapter, so the toolbar and the form share one source of truth.
- **Autosave is deliberately not implemented.** Every save is an explicit, version-checked write that creates a revision. Autosave would create revision noise and interact badly with optimistic concurrency. A `beforeunload` guard warns about unsaved changes instead.
- **Slug stability.** The slug is generated once from the title at creation. Editing the title does not change the slug, so shared links never break. The edit form shows the slug as read-only text with a "Regenerate from title" button that warns existing links will break.
- **Preview parity.** The editor's preview and `ArticleBody` both use `react-markdown` + `remark-gfm`, so what the author previews is what readers see.

**Constraints.** Markdown bodies are capped at 200,000 characters (validated client and server). The editor is not available offline. Paste of raw HTML is stored as text and rendered as nothing (no `rehype-raw`), which is intentional.

### 9.4 Concurrent editing and revision history

**Approach.** Optimistic concurrency with a monotonic `version` column, plus an append-only `article_revisions` trail.

- The edit form receives `version` as a hidden field.
- The repository performs the check-and-increment inside one transaction with the guard in the `WHERE` clause (§8.7), so two simultaneous saves cannot both win.
- On mismatch the Server Action returns `{ status: 'error', conflict: true }` and the form renders a conflict banner: "This article was updated by someone else. Reload the latest version to see their changes." with a **Reload** button that re-fetches and re-populates the form (discarding local edits) and a **Copy my text** button that copies the user's version to the clipboard so nothing is lost.
- Every successful save writes the pre-save state as a revision, so the conflict path is recoverable even if the user reloads blindly.
- `/articles/[slug]` shows a collapsible "History" section listing the 5 most recent revisions (author, timestamp, change note) with a "View" dialog showing the revision's Markdown.

**Why not real-time collaborative editing (CRDT/OT).** Yjs/Automerge would add a WebSocket server, a persistence adapter, and a fundamentally different data model for a five-person internal team. Optimistic concurrency plus history covers the realistic collision rate (near zero) at ~40 lines of code.

**Why not full version control (branches, merges).** Out of scope; the brief asks for "basic editing."

**Tradeoff.** A user who hits a conflict must re-apply their edits manually. Accepted, and mitigated by the copy-to-clipboard escape hatch.

### 9.5 Browse, filter, and pagination state in the URL

**Approach.** All list state lives in the URL query string. `FilterBar`, `CategoryChips`, and `Pagination` are thin client components that call `router.replace` / `router.push` with a new query string; the server re-renders from `searchParams`.

**Why.** Free deep links, correct back/forward behaviour, shareable filtered views, no client cache to invalidate, and no client-side data fetching. It also means the entire browse experience is server-rendered and testable by Playwright with a plain `page.goto()`.

**Tradeoffs.** Every filter change is a server round trip. Mitigated by (a) rendering filter changes inside a `useTransition` so the current list stays visible with a subtle top progress bar, and (b) `router.replace` with `scroll: false` for in-page refinements so the viewport does not jump.

### 9.6 Categories and article status (modeled in v1, minimal UI)

The brief lists these as features 4 and 5, which are **not required in v1**. They are included in the schema and API because retrofitting a `category_id` foreign key and a `status` column into a live FTS5 index and every list query is materially more expensive than building them now. The UI surface is deliberately minimal:

- **Categories:** sidebar list of category chips with article counts, a category filter, `/categories/[slug]` route, and a "New category" dialog. No nesting, no reordering, no per-category permissions.
- **Status:** a `draft`/`published` select in the editor, a `StatusBadge` on cards and detail pages, and a `status` filter defaulting to `published`. Drafts are visible to everyone (no auth in v1) but are excluded from the default browse view and from default search.

**[DECISION]** These are marked P1 in the backlog. If the session runs short, cut the *UI* (the filter chips and the status select), never the *schema* or the *API*.

### 9.7 Deterministic E2E infrastructure

**Problem.** Playwright must assert on exact article titles and counts, but the app writes to the same SQLite file the developer uses.

**Solution.** Three cooperating pieces:
1. `e2e/fixtures/seed.json` — 4 categories and 9 articles with fixed titles, slugs, and statuses (7 published, 2 draft).
2. `POST /api/test/reset` — truncates and re-seeds, guarded by `E2E_TEST_MODE=1`.
3. `playwright.config.ts` `webServer` starts `next dev` with `DATABASE_FILE=./data/kb.e2e.db` and `E2E_TEST_MODE=1`, so E2E never touches `kb.db`.

`e2e/global-setup.ts` waits for `/api/health` then calls reset once. Each spec that mutates calls reset in `test.beforeEach`, giving full isolation without `fullyParallel: false`. Playwright runs with `workers: 2` locally and `1` in CI (SQLite tolerates the write contention, but serializing removes flakiness at negligible cost).

---

## 10. Front-end / back-end integration

### 10.1 Read path (RSC → repository)

```
Browser → GET /?q=deploy
  → Next.js RSC render
    → page.tsx: const sp = await searchParams; const query = listQuerySchema.parse(sp)
    → searchArticles(query.q, …) / listArticles(query)
      → Drizzle → SQLite (FTS5 MATCH or indexed SELECT)
    → <ArticleList items={…} /> streams into the static shell
  → HTML + RSC payload
```

No client fetch. No loading spinner on first paint. Data is already present in the HTML.

### 10.2 Write path (Server Action)

```
<ArticleForm action={createArticle}>
  → RHF validates with articleCreateSchema (client)
  → POST (Server Action) with FormData
    → createArticle(prevState, formData)
      → articleCreateSchema.safeParse(Object.fromEntries(formData))
      → repository.createArticle(input)
        → db.transaction { insert article; insert revision 1; }  (FTS trigger fires)
      → revalidatePath('/'), revalidatePath('/search'), revalidatePath('/articles')
      → redirect(`/articles/${slug}`)
  → Next.js re-renders the target route with fresh data
```

Server Actions are POST requests to the current route with a Next-generated action id; Next.js validates the `Origin`/`Host` pair automatically, which removes CSRF risk without a token.

### 10.3 Client JSON path (command palette only)

```
CommandPalette (cmdk, client)
  → useDeferredValue(input) → fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal })
  → renders hit.titleSegments / hit.snippetSegments as <mark>
  → selecting a hit calls router.push(`/articles/${slug}`)
```

### 10.4 Type sharing

A single TypeScript project spans client and server (`tsconfig.json` at the root, no separate `tsconfig.server.json`). Domain types live in `src/types/domain.ts`; Zod schemas in `src/lib/validation/**` are imported by both the form and the action. There is **no code generation step and no duplicated type definition**.

```ts
// src/types/domain.ts
import type { ArticleStatus } from '@/server/db/schema';

export type CategoryRef = { id: number; name: string; slug: string };

export type ArticleListItem = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  excerpt: string;
  status: ArticleStatus;
  category: CategoryRef | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
};

export type ArticleDetail = ArticleListItem & { bodyMd: string };

export type SearchSegment = { text: string; match: boolean };

export type SearchHit = {
  id: number;
  slug: string;
  title: string;
  status: ArticleStatus;
  category: CategoryRef | null;
  updatedAt: Date;
  rank: number;
  titleSegments: SearchSegment[];
  snippetSegments: SearchSegment[];
};

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number | null; hasNext: boolean };
```

Note that `ArticleStatus` is imported from the Drizzle schema via `import type` — a type-only import is erased at compile time, so no server code reaches the browser bundle. The `import 'server-only'` guard in `src/server/db/client.ts` is the enforcement backstop.

### 10.5 Error propagation

| Layer | Failure | User sees |
|---|---|---|
| Zod (client) | Invalid field | Inline message under the field, focus moves to the first invalid control |
| Zod (server) | Invalid payload | Same field errors, returned from the Server Action |
| Repository | `NOT_FOUND` | `notFound()` → route-level 404 panel |
| Repository | `CONFLICT` | Conflict banner with Reload / Copy my text |
| Repository | `VALIDATION_FAILED` (business rule) | Form-level `role="alert"` banner |
| Repository | `DB_UNAVAILABLE` / `INTERNAL` | `error.tsx` panel with a retry button and the digest; full detail in server logs |
| Route handler | Any `AppError` | RFC 9457 `application/problem+json` with the mapped status |

---

## 11. Testing strategy

### 11.1 Test pyramid and scope

| Layer | Tool | Target | What it covers |
|---|---|---|---|
| Unit | Vitest 5.0.0 (node env) | ≥90% of `src/lib/**` | `slug.ts`, `highlight.ts`, `fts.ts`, `markdown.ts`, `errors.ts`, all Zod schemas |
| Integration (DB) | Vitest 5.0.0 (node env, real SQLite) | ≥85% of `src/server/**` | Repositories against a migrated temp DB, including FTS5 triggers, transactions, concurrency, revision pruning |
| Component | Vitest 5.0.0 + jsdom + Testing Library | Key components | `ArticleForm` validation, `SearchInput` URL updates, `Pagination`, empty states, `Highlight` |
| E2E | Playwright 1.63.0 | 5 critical journeys | browse → search → edit; empty states; responsive; a11y smoke |

**Rule:** repository tests run against a **real migrated SQLite database**, never a mocked Drizzle instance. The bugs this architecture can actually have (broken triggers, wrong index, transaction ordering, `ON DELETE` behaviour) are invisible to mocks.

### 11.2 Unit and integration configuration

**The `server-only` problem.** Repository modules import `db` from `src/server/db/client.ts`, which starts with `import 'server-only'`. That package resolves to a *throwing* module under Node's default export condition, so a naive Vitest setup would crash on import. Two changes make the whole suite runnable:

1. `src/test/setup.ts` aliases `server-only` to an empty module. This is required because Vite resolves the module graph itself and does not honor the `react-server` condition.
2. `src/server/db/create.ts` holds the condition-free factory that `src/test/db.ts` uses (see §8.4).

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// `server-only` throws unless resolved under the `react-server` condition,
// which Vite does not set. The `server/**` boundary is enforced by the
// production build and by ESLint, not by the test runner.
vi.mock('server-only', () => ({}));
```

> Do **not** work around this by deleting `import 'server-only'` from `client.ts`. That guard is what turns "a client component imported the DB driver" from a silent bundle-size and security problem into a build failure.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/server/**'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
    // Vitest 5 replaced `environmentMatchGlobs` (and the workspace file) with
    // `projects`. Two projects let node tests and jsdom component tests coexist
    // in one `vitest run`.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/lib/**/*.test.ts', 'src/server/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['src/components/**/*.test.tsx'],
        },
      },
    ],
  },
});
```

> **Vitest 5 migration note.** `test.environmentMatchGlobs` was removed in Vitest 5, and `vitest.workspace.ts` is superseded by `test.projects`. Use the `projects` array above — it is the only supported way to run mixed node/jsdom environments from a single `vitest run`, which matters because `npm run test:run` is a CI gate. `extends: true` makes each project inherit the root `plugins`, `setupFiles`, and `coverage` config.

```ts
// src/test/db.ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase } from '@/server/db/create';
import { setDb } from '@/server/db/current';
import { FTS5_DDL } from '@/server/db/search-index-ddl';
export function createTestDb() {
  const dir = mkdtempSync(join(tmpdir(), 'kb-test-'));
  const { sqlite, db } = createDatabase(join(dir, 'test.db'));
  migrate(db, { migrationsFolder: './drizzle' });
  db.run(sql.raw(FTS5_DDL)); // real FTS5, real triggers
  setDb(db); // lets repository singletons resolve to this test handle
  return { db, sqlite, close: () => sqlite.close() };
}
```

> `createTestDb` deliberately imports `createDatabase` from `src/server/db/create.ts`, **not** from `client.ts`. `client.ts` carries `import 'server-only'`, which throws outside the `react-server` export condition (see §8.4).

### 11.3 Required unit/integration test cases

**`src/lib/fts.test.ts`**
- `toFtsQuery('deploy api')` → `'"deploy" "api"*'`
- `toFtsQuery('  ')` → `''`
- `toFtsQuery('foo" OR bar')` strips the operator: no `OR` reaches FTS5
- `toFtsQuery('a*b')` does not throw and does not produce a wildcard-only query
- 300-character input is truncated without throwing

**`src/lib/highlight.test.ts`**
- `splitSegments('\u0001deploy\u0002 the api')` → `[{text:'deploy',match:true},{text:' the api',match:false}]`
- Text containing `<script>` is returned as a plain segment with `match:false` and is **not** escaped or interpreted
- Empty input → `[]`; input with only sentinels → `[]`

**`src/server/repositories/search.test.ts`** (real DB)
- Each test opens `createTestDb()` in `beforeEach` and calls `createSearchRepository(db)` — never the `server-only` singleton
- Inserting an article makes it findable by title word and by body word
- Updating `body_md` removes the old term from results and adds the new one ← **guards the trigger**
- Deleting an article removes it from results
- A `draft` is excluded when `status='published'` and included when `status='all'`
- Title match outranks body match for the same term
- `LIMIT` is respected; `rank` is ascending (bm25 is negative-better)
- Invalid FTS syntax in `q` returns `[]`, never throws

**`src/server/repositories/articles.test.ts`** (real DB)
- Each test calls `createArticleRepository(testDb)` with a fresh `createTestDb()` handle
- `updateArticle` with a stale `version` returns `err(CONFLICT)` and leaves the row unchanged
- `updateArticle` with the correct version increments `version` and writes exactly one new revision
- Revision pruning keeps exactly 20 after 25 saves
- Deleting a category sets `articles.category_id` to `NULL` (verifies `foreign_keys=ON`)
- Deleting an article cascades to `article_revisions`
- Slug collision produces `deploying-the-api-2`

**`src/components/articles/article-form.test.tsx`** (jsdom)
- Submitting an empty title renders "Title must be at least 3 characters." and moves focus to the title input
- A 301-character summary renders the summary error
- A valid submit calls the action once with the expected `FormData`

**`src/lib/validation/article.test.ts`**
- `articleCreateSchema` accepts the minimum valid payload and applies defaults (`status: 'draft'`, `categoryId: null`)
- `''` summary normalizes to `undefined`
- `listQuerySchema.parse({ page: 'abc' })` yields `page: 1` (never throws)
- Cross-check: `createInsertSchema(articles)` from `drizzle-zod` accepts every payload `articleCreateSchema` accepts, and vice versa for the shared fields — this catches schema/validation drift

### 11.4 E2E with Playwright

**Why Playwright.** It is the only mainstream runner that matches this stack exactly: Next.js declares `@playwright/test` as an optional peer dependency, ships a documented `webServer` integration, supports the `chromium`/`webkit` engines needed to cover desktop and tablet, and has first-class trace/video artifacts for review. `@axe-core/playwright` plugs directly into its fixture model.

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'tablet-webkit', use: { ...devices['iPad (gen 7) landscape'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_FILE: './data/kb.e2e.db',
      E2E_TEST_MODE: '1',
      LOG_LEVEL: 'warn',
    },
  },
});
```

**The five critical journeys** (the brief's MVP scope — browse → search → edit — plus the two explicitly required non-functional behaviours):

| Spec | Journey | Assertions |
|---|---|---|
| `browse.spec.ts` | Open `/`, click an article, return to `/` | List renders seeded titles; detail shows rendered Markdown (a real `<h2>` and `<table>`, not literal `##`); back navigation preserves scroll position and filters |
| `search.spec.ts` | Type "deploy" into search, open the top result | URL becomes `/search?q=deploy`; exactly 3 results; `<mark>` highlights the term; result count is announced in the live region; opening a result shows the article |
| `edit.spec.ts` | Open an article → Edit → change the title and body → Save → reload | Success redirect to the detail page; the new title renders; the body change is visible; the change **persists across a full page reload** (proves it reached SQLite, not just React state); history shows a new revision |
| `empty-states.spec.ts` | Reset to zero articles; search for a nonsense term; open an empty category | Each of the four canonical empty states renders its distinct copy and action |
| `responsive.spec.ts` | At 834×1112 and 1280×800 | Sidebar collapses to a drawer below 1024px; the drawer opens, traps focus, and closes on `Escape`; no horizontal overflow (`document.scrollingElement.scrollWidth <= innerWidth + 1`) |

**Accessibility smoke** (`e2e/helpers/a11y.ts`), asserted inside `browse`, `search`, and `edit`:
```ts
import AxeBuilder from '@axe-core/playwright';

export async function expectNoA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast']) // covered by the manual contrast check in §13.5
    .analyze();
  expect(violations).toEqual([]);
}
```

> This is a **smoke** check, not the "full accessibility audit" the brief explicitly places out of MVP scope. It catches missing labels, landmarks, and ARIA misuse on the three primary routes.

**Explicitly out of scope for E2E** (per the brief's "not MVP: exhaustive E2E edge-case coverage"): every validation permutation, every pagination boundary, revision diffing, category CRUD, theme switching, and cross-browser matrix beyond Chromium + WebKit.

### 11.5 Test data

`src/test/factories.ts` exports `makeArticle(overrides)` / `makeCategory(overrides)` that return valid insert payloads with deterministic-but-unique defaults (`title: \`Test Article ${n}\``), so tests never assert on shared mutable state. E2E uses `e2e/fixtures/seed.json` exclusively.

### 11.6 Commands

| Command | Runs |
|---|---|
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest once (CI mode) |
| `npm run test:coverage` | Vitest with v8 coverage + thresholds |
| `npm run test:e2e` | Playwright, all projects |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run verify` | `typecheck && lint && format:check && test:run && build` — the CI gate |

---

## 12. Local development and run instructions

### 12.1 Prerequisites

- **Node.js 24.21.0** (`nvm use` reads `.nvmrc`; or `nvm install 24.21.0`)
- **npm 11.19.0** (bundled with Node 24)
- No Docker, no database server, no global CLI installs.
- Windows/macOS/Linux on x64 or arm64: `better-sqlite3@13.0.3` ships N-API prebuilt binaries for all of these, so `npm install` requires **no C++ toolchain**. If a prebuild is ever missing, the install falls back to compiling and requires Python 3 + a C compiler.

### 12.2 Package scripts

```json
{
  "name": "kb-app",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.21.0 <25" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx scripts/db-setup.ts",
    "db:seed": "tsx scripts/seed.ts",
    "db:setup": "npm run db:migrate && npm run db:seed",
    "db:reset": "tsx scripts/db-setup.ts --fresh --seed",
    "db:reindex": "tsx scripts/db-setup.ts --reindex",
    "db:check": "tsx scripts/db-setup.ts --check",
    "db:backup": "tsx scripts/backup.ts",
    "db:studio": "drizzle-kit studio",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "verify": "npm run typecheck && npm run lint && npm run format:check && npm run test:run && npm run build",
    "postinstall": "playwright install --with-deps chromium webkit"
  }
}
```

> `postinstall` is intentionally included so a fresh clone is E2E-ready in one step. If a machine cannot install browsers, run `npm install --ignore-scripts` and then `npx playwright install chromium`.

### 12.3 Environment variables

`.env.example` (committed; `.env.local` is gitignored):

```dotenv
# Path to the SQLite database file. Not a URL — better-sqlite3 takes a filesystem path.
DATABASE_FILE=./data/kb.db

# info | debug | warn | error
LOG_LEVEL=info

# Enables POST /api/test/reset. MUST be unset/0 outside of automated tests.
E2E_TEST_MODE=0

# Shown in the app header and page titles.
NEXT_PUBLIC_APP_NAME=Team Knowledge Base
```

Validated at startup with Zod so a misconfiguration fails loudly:

```ts
// src/lib/env.ts
// No `server-only`: this module is also loaded by tsx scripts and Vitest.
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_FILE: z.string().min(1).default('./data/kb.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  E2E_TEST_MODE: z.coerce.number().int().min(0).max(1).default(0),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
```

### 12.4 First run (copy-paste, from a fresh clone)

```bash
nvm use                      # Node 24.21.0
npm install                  # deps + Playwright browsers
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run db:setup             # generate-migrations are committed; this migrates + seeds
npm run dev                  # http://localhost:3000
```

Expected result: the browse page shows 4 categories and 7 published articles, search for `deploy` returns 3 results, and clicking any article opens a rendered Markdown page.

### 12.5 Day-to-day commands

| Goal | Command |
|---|---|
| Start the dev server | `npm run dev` |
| Wipe and re-seed local data | `npm run db:reset` |
| Inspect data in a GUI | `npm run db:studio` (Drizzle Studio) |
| Rebuild the search index | `npm run db:reindex` |
| Verify DB integrity | `npm run db:check` |
| Snapshot the database | `npm run db:backup` |
| Run everything CI runs | `npm run verify` |
| Debug an E2E failure | `npx playwright show-report` |

### 12.6 Next.js configuration

```ts
// next.config.ts
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3', 'pino', 'pino-pretty'],
  // cacheComponents intentionally NOT enabled in v1 — see the decisions log.
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
```

`script-src 'unsafe-inline'` is required because Next.js emits inline bootstrap scripts. **[DECISION]** A nonce-based CSP via `proxy.ts` (Next 16's replacement for `middleware.ts`) is a documented v2 hardening step, not v1 work. Rationale: the brief asks for "basic security assumptions only," and the app serves no third-party content.

### 12.7 CI

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24.21.0
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test:run -- --coverage
      - run: npm run build
        env:
          DATABASE_FILE: ./data/kb.ci.db
      - run: npm run db:migrate
        env:
          DATABASE_FILE: ./data/kb.ci.db
      - run: npx playwright install --with-deps chromium webkit
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

---

## 13. Non-functional architecture decisions

### 13.1 Performance

| Metric | Budget | How it is met |
|---|---|---|
| Browse page TTFB (p75) | < 150 ms @ 2,000 articles | Indexed `(status, updated_at)` scan + `LIMIT 21`; no `count(*)` on page 1 |
| Browse page full render (p75) | < 250 ms | RSC only; ~45 KB gzip JS for the shell |
| Search response (p75) | < 100 ms | FTS5 `MATCH` + `bm25` over ≤10,000 rows is sub-10 ms; the rest is render |
| Article detail render (p75) | < 200 ms | 2 queries (article+category join, 5 revisions) |
| First-load JS, browse route | < 150 KB gzip | Editor excluded via `next/dynamic`; no UI kit, no charting lib, no moment.js |
| First-load JS, editor route | < 320 KB gzip | `@uiw/react-md-editor` + `rehype-prism-plus` |
| Largest Contentful Paint (p75, localhost baseline) | < 1.2 s | Server-rendered HTML + system fonts (no web-font blocking) |
| Interaction (filter chip click) | < 300 ms perceived | `useTransition` keeps the old list visible; no layout thrash |

**Enforcement.** `next build` output is inspected on every PR for route-level bundle sizes. Any regression >15 KB on a route budget must be justified in the PR description.

**Fonts.** Use the system font stack (`ui-sans-serif, system-ui, …`) with `Inter` as a progressive enhancement only if it is self-hosted via `next/font/local`. **No Google Fonts network request** — it is a third-party dependency and a CSP complication for zero benefit at this scale.

### 13.2 Security

| Threat | Mitigation |
|---|---|
| Stored XSS via article Markdown | `react-markdown` **without** `rehype-raw` (HTML is not parsed) + `rehype-sanitize` with its default schema as a second layer. No `dangerouslySetInnerHTML` anywhere in the codebase — search highlighting uses segment arrays. |
| SQL injection | Every query is built with Drizzle's `sql` template or query builder, which parameterizes values. The one raw-SQL string (`FTS5_DDL`) is a compile-time constant with no interpolation. |
| FTS5 query injection / DoS | `toFtsQuery()` strips all FTS5 operators and quotes every token, so user input can never become an operator query. Input is capped at 200 characters. |
| CSRF | Server Actions validate `Origin`/`Host` automatically. Route-handler mutations require JSON content type plus an explicit `assertSameOrigin(request)` check. |
| Path traversal / file exposure | SQLite files live in `./data/`, which is outside `public/` and never served. `DATABASE_FILE` comes from validated env, not from request input. |
| Sensitive data in logs | Article bodies are never logged. Logs carry ids, slugs, durations, and error codes only. |
| Clickjacking / MIME sniffing | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP `frame-ancestors 'none'`. |
| Dependency vulnerabilities | `npm audit --audit-level=high` in CI; Dependabot enabled on the repo. |
| Untrusted article size | Body capped at 200,000 characters client- and server-side; title 200; summary 300. |
| Test endpoint exposure | `POST /api/test/reset` returns a bare `404` unless `E2E_TEST_MODE === '1'`. |

**Explicit non-mitigation: there is no authentication or authorization in v1.** This is [ASSUMPTION A1](#16-assumptions-and-non-goals), grounded in the brief's "Basic security assumptions only; do not require enterprise auth unless later specified." Every article is readable and editable by anyone who can reach the app. The app must therefore be deployed on a trusted internal network only. §15.2 documents the exact auth retrofit path.

### 13.3 Reliability

- SQLite is a single file with WAL: a crash cannot corrupt a committed transaction; at worst the last few commits are lost with `synchronous=NORMAL`.
- `PRAGMA integrity_check` and `foreign_key_check` are exposed as `npm run db:check`.
- Migrations are forward-only and committed; `runMigrations()` runs from `src/instrumentation.ts` on every server boot and is idempotent, so a fresh clone or an empty database self-initializes.
- The search path degrades gracefully to `LIKE` rather than erroring (§8.1).
- `error.tsx` at the route level and `global-error.tsx` at the root ensure a component failure never yields a blank page.

### 13.4 Responsive design

| Breakpoint | Layout |
|---|---|
| ≥1280px | 3 columns: sidebar (240px) · content (`max-w-3xl`) · on-this-page TOC (200px) |
| 1024–1279px | 2 columns: sidebar · content |
| 768–1023px (tablet) | 1 column; sidebar becomes a Radix `Dialog` drawer behind a menu button |
| <768px | 1 column, single-column article cards, full-width editor with a preview toggle instead of side-by-side |

Tested at 1280×800 and 834×1112 in the Playwright `responsive.spec.ts`, plus a no-horizontal-overflow assertion.

### 13.5 Accessibility

Target: **WCAG 2.1 AA for the shipped flows** (the brief places "full accessibility" in design-only scope, so this is a floor, not a certification).

- Semantic landmarks: one `<header>`, one `<nav aria-label="Main">`, one `<main id="main">`, one `<footer>`; a "Skip to content" link is the first focusable element.
- Every form control has a programmatic label via `ui/field.tsx`; errors are linked with `aria-describedby` and flagged with `aria-invalid`.
- Search result counts and save confirmations are announced via `role="status"` / `aria-live="polite"`; errors use `role="alert"`.
- Focus management: dialogs trap focus and restore it on close (Radix); the conflict banner receives focus when it appears.
- Visible focus ring on every interactive element (never `outline: none` without a replacement).
- Contrast: all text ≥4.5:1, all UI borders and icons ≥3:1, verified in both themes; `prefers-reduced-motion` disables transitions.
- Icons that convey meaning have adjacent text or an `aria-label`; decorative icons are `aria-hidden`.
- Automated smoke coverage via `@axe-core/playwright` on the three primary routes (§11.4).

### 13.6 Browser support

Chromium 111+, Firefox 111+, Safari 16.4+ — the baseline Next.js 16 supports. Playwright exercises Chromium (desktop) and WebKit (tablet), covering both engine families.

---

## 14. Schema and migration examples

The authoritative schema is `src/server/db/schema.ts` (§8.3); the generated migration is `drizzle/0000_init.sql` (§8.5); the FTS5 bootstrap is `FTS5_DDL` in `src/server/db/search-index.ts` (§8.6). This section adds the pieces a developer needs on day one.

### 14.1 `scripts/db-setup.ts`

```ts
import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase } from '../src/server/db/create';
import { FTS5_DDL } from '../src/server/db/search-index-ddl';
import { seed } from '../src/server/db/seed';

const flags = new Set(process.argv.slice(2));
const file = process.env.DATABASE_FILE ?? './data/kb.db';

mkdirSync(dirname(file), { recursive: true });

// tsx does not set the `react-server` condition, so this script uses the
// condition-free factory instead of src/server/db/client.ts.
const { sqlite, db } = createDatabase(file);

if (flags.has('--fresh')) {
  console.log('Dropping all tables…');
  sqlite.exec(`
    DROP TABLE IF EXISTS article_search;
    DROP TABLE IF EXISTS article_revisions;
    DROP TABLE IF EXISTS articles;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS __drizzle_migrations;
  `);
}

console.log('Applying migrations…');
migrate(db, { migrationsFolder: './drizzle' });
sqlite.exec(FTS5_DDL);
if (flags.has('--reindex')) {
  db.run(sql`INSERT INTO article_search(article_search) VALUES ('rebuild')`);
}

if (flags.has('--check')) {
  const integrity = db.get<{ integrity_check: string }>(sql`PRAGMA integrity_check`);
  const fk = db.all(sql`PRAGMA foreign_key_check`);
  console.log('integrity_check:', integrity?.integrity_check);
  console.log('foreign_key_check:', fk.length === 0 ? 'clean' : fk);
  const ok = integrity?.integrity_check === 'ok' && fk.length === 0;
  sqlite.close();
  process.exit(ok ? 0 : 1);
}

if (flags.has('--seed') || flags.has('--fresh')) {
  console.log('Seeding…');
  seed(db);
}

console.log('Database ready at', file);
sqlite.close();
```

### 14.2 Seed content

`src/server/db/seed.ts` is **idempotent**: it deletes and re-inserts a fixed dataset keyed by slug, so `npm run db:seed` is safe to re-run.

4 categories: `Engineering`, `Product`, `People`, `Operations`.
7 published articles + 2 drafts, including at least one article that:
- contains the word **`deploy`** in its title (so `search.spec.ts` has a deterministic top hit),
- contains a fenced code block, a table, and a task list (so rendering is exercised),
- has 2+ revisions (so the history UI has content).

Titles are stable strings because Playwright asserts on them.

### 14.3 Example queries the repositories implement

```ts
// src/server/repositories/articles.ts (excerpt)
import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '@/server/db/create';
import { getDb } from '@/server/db/current';
import { articles, categories } from '@/server/db/schema';

export function createArticleRepository(db: Database) {
  return {
    listArticles(q: ListQuery) {
      const where = [
        q.status === 'all' ? undefined : eq(articles.status, q.status),
        q.category ? eq(categories.slug, q.category) : undefined,
      ].filter(Boolean);

      const rows = db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          summary: articles.summary,
          status: articles.status,
          version: articles.version,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
          publishedAt: articles.publishedAt,
          categoryId: categories.id,
          categoryName: categories.name,
          categorySlug: categories.slug,
        })
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .where(where.length ? and(...where) : undefined)
        .orderBy(
          q.sort === 'title' ? sql`${articles.title} COLLATE NOCASE ASC`
          : q.sort === 'created' ? desc(articles.createdAt)
          : desc(articles.updatedAt),
        )
        .limit(q.pageSize + 1)              // +1 to detect a next page
        .offset((q.page - 1) * q.pageSize)
        .all();

      const hasNext = rows.length > q.pageSize;
      return { items: rows.slice(0, q.pageSize), hasNext };
    },
  };
}

export const articleRepository = createArticleRepository(getDb());
```

```ts
// src/server/repositories/categories.ts (excerpt) — article counts without N+1
export function createCategoryRepository(db: Database) {
  return {
    listWithCounts() {
      return db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          articleCount: sql<number>`count(${articles.id})`,
        })
        .from(categories)
        .leftJoin(articles, and(eq(articles.categoryId, categories.id), eq(articles.status, 'published')))
        .groupBy(categories.id)
        .orderBy(sql`${categories.name} COLLATE NOCASE ASC`)
        .all();
    },
  };
}
```

---

## 15. Tradeoffs, risks, and future work

### 15.1 Accepted tradeoffs

| Tradeoff | Accepted because | Revisit when |
|---|---|---|
| SQLite caps the app at one server node | 100 concurrent users is far below SQLite's ceiling; zero operational cost | A second app instance is needed → §8.9 step 2 |
| Synchronous driver blocks the event loop per query | Every query is indexed and bounded; p75 query time is sub-millisecond | Any query exceeds 20 ms in a trace |
| Markdown editor exposes syntax to non-technical authors | Eliminates a lossy HTML↔Markdown conversion layer; keeps search and diffs clean | Authors complain → add a WYSIWYG toolbar overlay, keep Markdown storage |
| Offset pagination | Corpus is small; page numbers are linkable | >50,000 articles → keyset pagination |
| No auth in v1 | Brief explicitly scopes it out; the app is internal-only | First external/shared deployment |
| No autosave | Avoids revision noise and conflict churn | Users lose work in practice |
| `script-src 'unsafe-inline'` | Next.js inline bootstrap; no third-party scripts exist | Add nonce-based CSP via `proxy.ts` |

### 15.2 Auth retrofit path (when required)

1. Add `better-auth@1.7.4` with the Drizzle SQLite adapter (or NextAuth/Auth.js 4.24.15 with `@auth/drizzle-adapter` 1.11.13).
2. Add `users` and `sessions` tables via a Drizzle migration; add `articles.created_by` / `articles.updated_by` FKs and `article_revisions.editor_id`.
3. Add `src/proxy.ts` (Next 16's `middleware.ts` replacement) to redirect unauthenticated requests to `/sign-in`.
4. Enforce authorization in the repository layer, not the UI: `listArticles` adds `eq(articles.status, 'published')` for readers; mutations check ownership or an `editor` role.
5. Replace the `kb_display_name` cookie with the session user for revision attribution.
6. The browse/search/edit architecture does not change: auth is an added predicate in existing queries.

### 15.3 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FTS5 triggers drift from the `articles` table | Medium | Search returns stale results | Integration tests that assert on update/delete reflection; `npm run db:reindex` |
| `drizzle-kit` generates an unexpected migration for the `CHECK` constraint | Medium | Migration churn | Add the constraint to `0000_init.sql` before the first apply, then regenerate the snapshot (§8.5) |
| `better-sqlite3` native build failure on an unusual platform | Low | Blocks setup | N-API prebuilds in v13; documented Python 3 + C compiler fallback |
| Editor bundle bloats the browse route | Medium | Performance budget miss | `next/dynamic` with `ssr: false`; bundle size checked in CI |
| Optimistic-concurrency conflict UX confuses users | Low | Lost edits | Copy-to-clipboard escape hatch; revisions make every save recoverable |
| Playwright flakes from shared SQLite state | Medium | CI noise | `workers: 1` in CI, per-spec reset, separate `kb.e2e.db` |

### 15.4 Future work (explicitly not v1)

1. Authentication + per-article ownership (§15.2).
2. Tags as a many-to-many relation (`tags`, `article_tags`) alongside categories.
3. Image uploads (local `public/uploads/` + a `media` table).
4. Article comments / inline review notes.
5. Full revision diffing (a side-by-side Markdown diff view) and one-click restore.
6. Porter stemming for FTS5, or a `trigram` tokenizer for substring/typo-tolerant search.
7. Postgres migration (§8.9 step 2) when multi-node deployment is required.
8. Nonce-based CSP via `proxy.ts`.
9. Export to static HTML/PDF for offline distribution.
10. Full WCAG 2.1 AA audit with screen-reader testing (the brief places this in design-only scope for v1).

---

## 16. Assumptions and non-goals

### 16.1 Assumptions (where the brief was silent)

| # | Assumption | Impact if wrong |
|---|---|---|
| **A1** | **No authentication or authorization in v1.** All articles are readable and editable by anyone with network access. Editor attribution uses a self-declared display name in a `kb_display_name` cookie (default "Anonymous editor"), used only for revision history. | Moderate. §15.2 is the retrofit path; the data model already carries `version` and revisions, so attribution can be back-filled as `NULL`. |
| **A2** | Deployment is a single Node process on a trusted internal network. No CDN, no container platform, no managed database. | Low. The app is stateless except for the SQLite file. |
| **A3** | "Basic editing for all articles" means any visitor may edit any article. There is no per-article permission. | Low. |
| **A4** | The article corpus stays under ~10,000 documents. | Low. Beyond that, revisit offset pagination (§15.1). |
| **A5** | Single-language (English) content. | Low. FTS5's `unicode61` tokenizer handles Latin scripts; CJK would need a different tokenizer. |
| **A6** | Markdown is the storage format; no HTML is stored or rendered. | Low. |
| **A7** | Features 4 (categories) and 5 (status) are modeled in the schema and API in v1 with minimal UI, per §9.6. | Low. Cutting the UI does not require a migration. |
| **A8** | Dark mode is in scope (the brief does not mention it) because it is ~30 lines with `next-themes` and improves readability. | None. |
| **A9** | The three non-required deliverables (`ux-design.md`, `backlog.md`, `decisions-log.md`) are produced by their own owners; this spec references them but does not replace them. | Low. |

### 16.2 Non-goals for v1

- No real-time collaborative editing (CRDT/OT), presence, or live cursors.
- No comments, mentions, notifications, or email.
- No file/image uploads or media library.
- No versioned restore-from-revision UI (history is view-only).
- No nested categories, tags, or a taxonomy admin screen.
- No public/anonymous internet exposure, SSO, or role-based access control.
- No analytics, telemetry, or APM.
- No i18n/l10n.
- No offline/PWA support.
- No mobile-phone-optimized layout (tablet is the stated floor; the layout degrades gracefully below 768px but is not a target).
- No exhaustive E2E edge-case coverage or a full accessibility audit (per the brief's MVP scope).
- No Kubernetes, Docker, Terraform, message queues, or microservices.

---

## 17. Decisions log

| # | Decision | Alternatives considered | Rationale | Consequences |
|---|---|---|---|---|
| D1 | **Next.js 16.3.4 App Router, single deployable** | Remix/React Router 7; Vite SPA + separate Express API; Astro | One process, one build, RSC reads remove an entire client data-fetching layer; Next.js is the most current, best-documented full-stack React framework | Node.js runtime required (not Edge); framework upgrade cadence must be tracked |
| D2 | **SQLite via `better-sqlite3` 13.0.3, WAL mode** | PostgreSQL 18; libSQL/Turso; `node:sqlite` | Zero-setup local dev, single file, N-API prebuilds (no compiler needed), thousands of reads/sec — far above 100 users. `node:sqlite` is still stabilizing its API; libSQL adds a network hop for no v1 benefit | Single-node ceiling; synchronous driver requires bounded queries |
| D3 | **Drizzle ORM 0.45.2 + Drizzle Kit 0.31.10** | Prisma; raw SQL; Kysely | Typed SQL with no runtime overhead and no codegen daemon; SQL-shaped migrations that are reviewable; schema is plain TypeScript | Must not use `drizzle-kit push` in production; expression indexes need verification (§8.3) |
| D4 | **FTS5 external-content virtual table + triggers** | `LIKE '%term%'`; Fuse.js in the browser; Postgres `tsvector` | Native, indexed, ranked (`bm25`), and snippet-capable with zero extra infrastructure; external content avoids duplicating bodies | Index can drift if triggers are wrong → covered by integration tests + `db:reindex` |
| D5 | **Markdown editor with live preview, not WYSIWYG** | Tiptap 3.31.3 rich text; plain textarea | Markdown is the storage format, so no lossy conversion, readable diffs, clean FTS indexing, one dependency instead of five | Non-technical authors see syntax; mitigated by preview + toolbar |
| D6 | **`rehype-raw` deliberately excluded** | Allow raw HTML + sanitize | With no auth, stored XSS is the highest-severity risk. Not parsing HTML removes the class entirely | Authors cannot embed HTML; must use Markdown |
| D7 | **Server Actions for mutations, RSC for reads** | REST for everything; tRPC; GraphQL | Fewer moving parts; automatic CSRF protection; progressive enhancement; no client cache to manage | Mutations are not usable by non-Next clients — hence the parallel REST surface |
| D8 | **REST API retained alongside Server Actions** | Server Actions only | The command palette needs instant JSON search; Playwright needs deterministic reset; future clients need a contract | Two integration surfaces to keep in sync — mitigated by both calling the same repositories |
| D9 | **URL as the state container for list/search/filter/pagination** | Client-side state + `useEffect` fetching; React Query | Deep-linkable, correct back/forward, server-rendered, trivially testable with `page.goto()` | Every filter change is a server round trip; mitigated with `useTransition` |
| D10 | **Zod 4.6.2 schemas shared client + server** | Yup; Valibot; hand-written validators | One definition, two enforcement points; typed inference; `.catch()` gives graceful query-param handling | Schemas are hand-authored (better messages) and cross-checked against `drizzle-zod` in a test |
| D11 | **Optimistic concurrency via a `version` column** | Last-write-wins; pessimistic row locks; CRDT | Check-and-increment inside a transaction is ~40 lines and removes silent data loss for a 5-person team | Users must manually re-apply edits after a conflict; mitigated by clipboard escape hatch |
| D12 | **Append-only `article_revisions`, newest 20 retained** | Full history forever; no history | Bounded growth, no background job, and enough history to recover from a mistake | Very old revisions are lost (acceptable) |
| D13 | **TypeScript 6.0.3, not 7.0.2** | TypeScript 7.0.2 (newest release) | `typescript-eslint@8.70.0` (required by `eslint-config-next@16.3.4`) declares `typescript >=4.8.4 <6.1.0`; TS 7 also ships no `tsserver` binary, regressing editor tooling. npm 11 would fail peer resolution | Cannot use TS 7 features until the lint toolchain catches up; revisit when `typescript-eslint` widens its range |
| D14 | **`cacheComponents` left disabled in v1** | `cacheComponents: true` + `use cache` | SQLite reads are sub-millisecond, so caching adds invalidation risk for no measured gain; the previous caching model is simpler to reason about | Slightly higher per-request cost; §8.9 documents the exact enablement path |
| D15 | **Tailwind CSS 4.3.3 with CSS-first config** | Tailwind v3 + `tailwind.config.js`; CSS Modules; vanilla-extract | No config file, `@theme` tokens are real CSS custom properties, faster builds, dark mode via `@custom-variant` | Team familiarity with `tailwind.config.js` does not transfer |
| D16 | **Radix primitives + `cva` instead of a component library** | shadcn/ui CLI; MUI; Mantine; Chakra | Radix gives accessible behavior without owning the styling; `cva` gives typed variants. Avoids a large dependency and a theming system we do not need | ~10 small primitives must be written by hand (≈1 hour) |
| D17 | **Vitest 5.0.0 for unit/component, real SQLite for repository tests** | Jest; mocked DB layer | Vitest is the current standard for Vite-based tooling and shares config with the React transform; real-DB tests catch the bugs this architecture actually has | Vitest 5 requires `vite@8` as an explicit dependency, and replaces `environmentMatchGlobs` with `test.projects` (see §11.2) |
| D18 | **Playwright 1.63.0 for E2E, Chromium + WebKit** | Cypress; Selenium; WebdriverIO | Declared as an optional peer of Next.js 16, so it is the supported path; `webServer` integration; two engines cover desktop and tablet; `@axe-core/playwright` integrates natively | Browser binaries (~400 MB) downloaded on install |
| D19 | **No auth in v1** | Basic auth; magic-link; SSO | Brief: "Basic security assumptions only; do not require enterprise auth unless later specified." Adding auth would consume a significant share of a 1–2 session budget | Internal-network-only deployment is mandatory; §15.2 is the retrofit path |
| D20 | **`data/` gitignored, deterministic seed instead of committed DB** | Commit a pre-populated `.db` | Binary files in git are unreviewable and merge badly; a seed script is diffable and gives E2E stable fixtures | First run requires `npm run db:setup` |
| D21 | **FTS5 DDL applied by an idempotent bootstrap, not a Drizzle migration** | Hand-editing `drizzle/meta/_journal.json` | `drizzle-kit` silently skips SQL files without a journal entry; a bootstrap function is robust, idempotent, and runs identically in dev/test/CI | FTS5 schema is not tracked by `drizzle-kit` — it lives in `search-index.ts` and must be changed deliberately |
| D22 | **Test reset endpoint guarded by `E2E_TEST_MODE`** | Separate test database + direct DB access from Playwright; `fullyParallel: false` | HTTP reset keeps Playwright free of DB driver code and enables per-spec isolation | One extra route that must never be enabled in production |
| D23 | **Node.js 24.21.0 LTS** | Node 26.8.2 (Current) | All toolchain peers (`vitest@5`, `jsdom@30`, `eslint@10`, `vite@8`, `better-sqlite3@13`) accept Node 24 LTS; Node 26 is not yet LTS | Must re-verify peer ranges when moving to Node 26 |
| D24 | **npm 11 as the only package manager** | pnpm; yarn; Bun | Reproducibility across benchmark runs matters more than install speed; no workspace/monorepo requirement | Slower cold installs (~40 s) |
| D25 | **Repositories are factories taking a `Database` handle** | Module-level `db` singleton closed over by each repository; `vi.mock` in tests | A factory makes "which database did this query hit?" explicit, lets tests pass a temp-file handle with zero mocking, and structurally prevents a test from writing to `./data/kb.db`. `src/server/db/current.ts` provides `getDb()`/`setDb()` so runtime call sites stay terse | Every repository gains one wrapping function; the runtime singleton must be created after `setDb()` runs in `client.ts` |
| D26 | **`server-only` excluded from exactly three modules** (`db/create.ts`, `db/search-index-ddl.ts`, `lib/env.ts`) | Put `server-only` in every `src/server/**` file | `server-only` throws under Node's default export condition, which is what Vitest and `tsx` use. Confining the guard to `client.ts` keeps the client-bundle protection where it matters while keeping scripts and tests runnable | The boundary is enforced by the production build plus a `no-restricted-imports` ESLint rule, not by every file |

---

## 18. Implementation order (suggested)

This is a dependency-ordered path to a working application. It mirrors the backlog deliverable; use it if the backlog is unavailable.

1. **Scaffold** — `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `prettier.config.mjs`, `postcss.config.mjs`, `globals.css`, `.env.example`, `.nvmrc`, `.gitignore`.
2. **Data layer** — `schema.ts` → `db:generate` → review + hand-edit the `CHECK` into `0000_init.sql` → `create.ts`, `current.ts`, `client.ts`, `migrate.ts`, `search-index-ddl.ts`, `search-index.ts` → `db-setup.ts`.
3. **Domain + validation** — `types/domain.ts`, `lib/validation/*`, `lib/slug.ts`, `lib/highlight.ts`, `lib/fts.ts`, `lib/markdown.ts`, `lib/errors.ts`, `lib/result.ts`, `lib/env.ts`. Write the unit tests **now** (they are pure functions and fast to test).
4. **Repositories + seed** — `articles.ts`, `categories.ts`, `revisions.ts`, `search.ts`, `seed.ts`. Write the real-DB integration tests now.
5. **UI primitives** — `cn.ts`, `button`, `input`, `textarea`, `select`, `badge`, `field`, `empty-state`, `skeleton`, `dialog`, `toast`.
6. **Shell** — `layout.tsx`, `app-shell`, `sidebar`, `mobile-nav`, `theme-toggle`, `skip-link`, `globals.css` tokens.
7. **Browse + detail** — `/` page, `article-card`, `article-list`, `article-header`, `article-body`, `/articles/[slug]`, `not-found`, `loading`.
8. **Search** — `search-input`, `search-results`, `highlight`, `/search`, `filter-bar`, `pagination`, `/api/search`.
9. **Editing** — Server Actions, `article-form`, `markdown-editor` (dynamic), `/articles/new`, `/articles/[slug]/edit`, conflict banner.
10. **Categories + status** — category sidebar, chips, `/categories/[slug]`, `/api/categories`, `status-badge`, status select.
11. **API completeness** — `/api/articles*`, `/api/categories`, `/api/health`, `/api/test/reset`.
12. **E2E** — fixtures, `global-setup.ts`, the five specs, `playwright.config.ts`.
13. **CI + docs** — `ci.yml`, `README.md`, `docs/decisions-log.md`.

**Definition of done for v1:** `npm run verify` passes, `npm run test:e2e` passes on both Playwright projects, and a human can browse → search → edit → reload and see the change persisted.
