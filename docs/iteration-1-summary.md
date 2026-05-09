# Iteration 1 Summary: Environment & Foundation

**Date:** 2026-05-09
**Status:** Complete

---

## What Was Built

### Task 1.1: Scaffold Next.js Project
- Created Next.js 16.2.6 project with TypeScript, Tailwind CSS v4, App Router, and src directory
- Installed all required dependencies matching architecture spec versions:
  - Production: prisma 7.8.0, @prisma/client 7.8.0, better-sqlite3 12.9.0, react-markdown 10.1.0, remark-gfm 4.0.1, zod 4.4.3, lucide-react 1.14.0, clsx 2.1.1
  - Dev: vitest 4.1.5, @playwright/test 1.59.1, tsx, @tailwindcss/typography 0.5.19, @tailwindcss/vite 4.3.0
  - Prisma adapters: @prisma/adapter-better-sqlite3 7.8.0

### Task 1.2: Configure Build & Test Tooling
- `tsconfig.json`: Path alias `@/` → `./src/` configured
- `vitest.config.ts`: Globals enabled, node environment, test include pattern for `__tests__/`
- `playwright.config.ts`: E2E directory configured, web server on port 3000, `reuseExistingServer: !process.env.CI`
- `next.config.ts`: Clean config (Tailwind v4 uses PostCSS plugin, no explicit Vite plugin needed)

### Task 1.3: Create Prisma Schema & Migrations
- Full Prisma schema with Category and Article models (includes stretch fields: status, categoryId)
- Prisma 7.8.0 uses `prisma.config.ts` for datasource URL and seed command configuration
- Database: SQLite via `better-sqlite3` with `@prisma/adapter-better-sqlite3` adapter
- Database created at `prisma/dev.db`
- FTS5 virtual table and sync triggers set up via `prisma/fts-setup.ts` helper (applied during seeding)
- Migration handled via `prisma db push` (FTS5 virtual tables aren't compatible with Prisma's migration shadow DB)

### Task 1.4: Create Seed Script
- `prisma/seed.ts`: Seeds 3 categories (Guides, Reference, Policies) and 4 articles
- 3 published articles, 1 draft article
- Substantive Markdown content with headings, lists, code blocks, and tables
- Pre-computed excerpts stored in database
- FTS5 indexes and triggers applied during seeding
- npm scripts: `db:migrate`, `db:studio`, `db:seed`, `db:reset`

### Task 1.5: Configure Design Tokens & Global Styles
- `globals.css` with Tailwind CSS v4 `@import "tailwindcss"` and `@plugin "@tailwindcss/typography"`
- CSS custom properties: font stacks, spacing tokens, transition durations, z-index scale
- Focus ring defaults and base body styles

### Task 1.6: Create Prisma Client Singleton & Zod Validators
- `src/lib/prisma.ts`: Prisma client singleton with adapter, prevents multiple instances in dev HMR
- `src/lib/validators.ts`: articleCreateSchema, articleUpdateSchema, categorySchema with full validation rules

### Task 1.7: Create CI Workflow
- `.github/workflows/ci.yml`: Lint, type-check, unit tests, and build jobs
- Node.js 20, npm caching, triggers on push to main and PRs

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Prisma 7 adapter pattern** | Prisma 7 requires a driver adapter. Used `@prisma/adapter-better-sqlite3` v7.8.0 with `PrismaBetterSqlite3` class. This is the new Prisma 7 pattern where clients are constructed with `new PrismaClient({ adapter })`. |
| 2 | **FTS5 via raw script, not migration** | FTS5 virtual tables create `article_fts_config` and `article_fts_data` internal tables that conflict with Prisma's shadow database during migrations. Applied FTS5 setup in the seed script via a `better-sqlite3` raw connection instead. |
| 3 | **`prisma.config.ts` for Prisma 7 config** | Prisma 7 moved datasource URL from `schema.prisma` to `prisma.config.ts`. The schema file only declares the provider; the URL and seed command live in the config file. |
| 4 | **DB path: `prisma/dev.db`** | Kept the DB inside the `prisma/` directory to match expected conventions. The URL in `prisma.config.ts` is `file:./prisma/dev.db` (relative to project root where `prisma.config.ts` lives). |

---

## Issues Encountered

1. **Prisma 7 datasource migration**: Prisma 7 removed the `url` property from `datasource` blocks in `schema.prisma`. URLs now live in `prisma.config.ts`. Updated accordingly.
2. **FTS5 migration compatibility**: Prisma's shadow database can't handle FTS5 virtual table internal tables (`article_fts_config`, `article_fts_data`). Workaround: push schema tables via `prisma db push`, apply FTS5 via raw `better-sqlite3` in the seed script.
3. **Package name collision**: The `PrismaBetterSqlite3` class name uses lowercase `Sqlite3` (not `SQLite3`), unlike the npm package name which uses `sqlite3`.

---

## Verification Results

| Check | Status |
|-------|--------|
| `npm run dev` starts at http://localhost:3000 | ✅ |
| `npm run build` compiles without errors | ✅ |
| `npm run lint` passes with 0 errors, 0 warnings | ✅ |
| `npx tsc --noEmit` passes | ✅ |
| `npx vitest run` executes (no tests yet — expected) | ✅ |
| `npx playwright test --list` shows test file structure | ✅ |
| `npx prisma db seed` completes without errors | ✅ |
| Database: 3 categories, 4 articles (1 draft, 3 published) | ✅ |
| FTS5 index populated and triggers active | ✅ |
| All package versions match architecture spec | ✅ |
| CI workflow file present and valid YAML | ✅ |
| Design tokens accessible in CSS | ✅ |
| Playwright config valid | ✅ |
