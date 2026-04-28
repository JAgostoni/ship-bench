# Iteration 1: Dev Environment & Backend Foundation

**Goal:** Create the repository structure, install and verify dependencies, set up the Prisma schema with FTS5, establish the Express server skeleton, and configure the development workflow so that subsequent iterations can build on a running local stack.

**Deliverable:** `npm run dev` starts both Vite (frontend) and Express (API) concurrently; `npx prisma migrate dev` creates a seeded SQLite database; unit-test runner exists.

---

## Task List

### 1.1 Initialize repo structure
- Create root directory layout per architecture:
  ```
  prisma/
  server/
    routes/
    services/
    middleware/
    lib/
  shared/
  src/
    routes/
    components/
    lib/
    styles/
  e2e/specs/
  docs/
  ```
- Initialize `git` repo and `.gitignore` (Node, Vite, Prisma, Playwright, OS files).

### 1.2 Create package.json with verified dependency versions
- Research and pin current stable versions for:
  - `react`, `react-dom`, `react-router` (SPA)
  - `vite` (with React plugin, Tailwind CSS Vite plugin)
  - `tailwindcss`
  - `express`, `cors`, `morgan`
  - `prisma`, `@prisma/client`
  - `zod`
  - `react-markdown`, `remark-gfm`
  - `lucide-react`
  - Dev: `typescript`, `@types/*`, `tsx`, `concurrently`, `vitest`, `playwright`, `@playwright/test`, `eslint`, `prettier`
- Add npm scripts:
  - `dev` — `concurrently "vite" "tsx watch server/index.ts"`
  - `build` — `vite build`
  - `start` — `tsx server/index.ts` (serves `dist/` + API in production mode)
  - `test:unit` / `test:unit:run` — `vitest`
  - `test:e2e` — `playwright test`
  - `db:migrate` — `prisma migrate dev`
  - `db:seed` — `tsx prisma/seed.ts`

### 1.3 Configure TypeScript
- Create `tsconfig.json` (strict, ESM, JSX `react-jsx`, `moduleResolution: bundler`).
- Create `tsconfig.server.json` extending root if needed for server-only path aliases.

### 1.4 Configure Vite and Tailwind CSS v4
- Create `vite.config.ts`:
  - React plugin
  - `@tailwindcss/vite` plugin
  - Path alias `@/` → `src/`
  - `server.port: 5173`
- Create `src/styles/index.css` with `@import "tailwindcss"` and a `@theme` block mapping design tokens (colors, spacing, radius, shadow) from `docs/design-spec.md` §2 and §8.2.
- Verify Tailwind utilities compile in dev mode.

### 1.5 Configure Prisma and SQLite
- Create `prisma/schema.prisma` exactly as defined in `docs/architecture.md` §5.2.
- Create `prisma/migrations/20250428_init/migration.sql`:
  - Create `Article`, `Category`, `Tag` tables and the `ArticleStatus` enum via Prisma Migrate.
  - Add raw SQL for FTS5 virtual table `ArticleFts` with `content=Article` and `content_rowid=rowid`.
  - Add `INSERT`, `UPDATE`, `DELETE` triggers on `Article` to keep `ArticleFts` in sync.
- Create `.env.example`:
  ```
  DATABASE_URL="file:./prisma/dev.db"
  PORT=3001
  CORS_ORIGIN=http://localhost:5173
  ```
- Copy `.env.example` to `.env`.
- Run `npx prisma migrate dev` to apply the initial migration.
- Verify `prisma/dev.db` is created and `ArticleFts` exists.

### 1.6 Create seed script and shared schemas
- Create `prisma/seed.ts`:
  - Insert 3–5 categories (e.g., "Engineering", "HR", "Product").
  - Insert 8–12 articles with varied titles, content, categories, and tags so the app is usable immediately.
  - Ensure slugs are deterministic (e.g., derived from titles).
- Run `npm run db:seed` and verify data in the database.
- Create `shared/schemas.ts`:
  - `ArticleCreateSchema` (Zod): `title` (string, 1–200), `content` (string, min 1), `categoryId` (optional int), `tagNames` (optional array of strings, max 10, each max 30 chars, alphanumeric + hyphen).
  - `ArticleUpdateSchema`: same fields, all optional (or require at least one).
  - Derive TypeScript types (`z.infer<>`) for client and server reuse.

### 1.7 Scaffold Express server
- Create `server/index.ts`:
  - `express()` app on `PORT` (default 3001).
  - Middleware stack: `express.json()`, `cors` (restricted to `CORS_ORIGIN`), request logging.
  - Mount placeholder routers at `/api/articles`, `/api/search`, `/api/categories` that return `501 Not Implemented` for now.
  - Global error handler middleware (basic structure; full logic in Iteration 2).
- Create `server/middleware/errorHandler.ts` with a skeleton that catches errors and returns `{ data: null, error: { code, message } }`.
- Create `server/middleware/validate.ts` with a skeleton that validates `req.body` against a Zod schema and attaches typed data.
- Create `server/lib/slugify.ts`:
  - Function `slugify(title: string): string` — lowercases, strips non-alphanumeric, replaces spaces with hyphens, trims.
  - Export for later collision-avoidance logic.

### 1.8 Configure testing entry points
- Create `vitest.config.ts`:
  - `test.environment: 'node'` (for unit tests; no DOM needed in v1 unit scope).
  - Path alias `@/` support.
- Create `playwright.config.ts`:
  - `baseURL: http://localhost:5173`
  - `testDir: 'e2e/specs'`
  - Local default: Chromium only. CI: Chromium, Firefox, WebKit.
  - Traces on first retry, screenshots on failure.
- Create placeholder spec files in `e2e/specs/`:
  - `browse.spec.ts`, `search.spec.ts`, `edit.spec.ts` (empty `test.describe` blocks to satisfy config).

### 1.9 Verify end-to-end iteration health
- Run `npm run dev` and confirm:
  - Vite dev server is accessible at `http://localhost:5173`.
  - Express API is accessible at `http://localhost:3001`.
  - A placeholder route (e.g., `GET /api/articles`) returns the expected `501` envelope.
- Run `npm run test:unit:run` and confirm Vitest starts with zero tests (no config errors).
- Run `npm run test:e2e` and confirm Playwright starts with zero tests (no config errors).
- Commit the iteration.

---

## Iteration-Specific Notes
- **No frontend pages yet.** This iteration intentionally produces an empty Vite scaffold (`src/main.tsx` and `src/App.tsx` can render a blank page or "Hello Knowledge Base"). UI work begins in Iteration 3.
- **Version verification is required.** The architecture spec lists specific versions, but the brief requires a live web search to verify current stable versions. Update `package.json` with whatever is current stable, noting any major version changes in the commit message.
- **FTS5 triggers must be in the same migration** that Prisma Migrate runs, because Prisma does not manage virtual tables. Use `prisma/migrations/.../migration.sql` for the raw FTS5 SQL.
- **Seed data must be deterministic.** E2E tests in Iteration 5 rely on known article titles and slugs.
